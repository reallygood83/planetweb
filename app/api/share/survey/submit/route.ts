import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 학생 설문 응답 제출 (학급 학생과 매칭)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessCode, studentName, studentNumber, responses } = body;

    if (!accessCode || !studentName || !studentNumber || !responses) {
      return NextResponse.json({ 
        error: '필수 정보가 누락되었습니다. (이름, 번호, 응답)' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // 접근 코드 유효성 확인
    const { data: access, error: accessError } = await supabase
      .from('survey_access_codes')
      .select('*, survey:surveys(*)')
      .eq('access_code', accessCode)
      .single();

    if (accessError || !access) {
      return NextResponse.json({ 
        error: '유효하지 않은 접근 코드입니다.' 
      }, { status: 404 });
    }

    // 만료 확인
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: '만료된 설문입니다.' 
      }, { status: 410 });
    }

    // 응답 제한 확인
    if (access.max_responses && access.response_count >= access.max_responses) {
      return NextResponse.json({ 
        error: '최대 응답 수에 도달했습니다.' 
      }, { status: 403 });
    }

    // 학급에서 해당 학생 찾기
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, number')
      .eq('class_id', access.class_id)
      .eq('name', studentName)
      .eq('number', studentNumber)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ 
        error: `해당 학급에 ${studentNumber}번 ${studentName} 학생을 찾을 수 없습니다.` 
      }, { status: 404 });
    }

    // 중복 응답 확인
    const { data: existingResponse } = await supabase
      .from('student_survey_submissions')
      .select('id')
      .eq('survey_id', access.survey_id)
      .eq('student_id', student.id)
      .single();

    if (existingResponse) {
      return NextResponse.json({ 
        error: '이미 설문에 참여하셨습니다.' 
      }, { status: 409 });
    }

    // 응답 저장
    const { data: newResponse, error: insertError } = await supabase
      .from('student_survey_submissions')
      .insert({
        survey_id: access.survey_id,
        access_code: accessCode,
        student_id: student.id,
        student_name: studentName,
        student_number: studentNumber,
        responses: responses
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 기존 survey_responses 테이블에도 저장 (호환성 유지)
    await supabase
      .from('survey_responses')
      .insert({
        survey_id: access.survey_id,
        student_id: student.id,
        responses: responses
      });

    return NextResponse.json({
      message: '설문이 성공적으로 제출되었습니다.',
      responseId: newResponse.id
    });

  } catch (error) {
    console.error('설문 응답 제출 오류:', error);
    return NextResponse.json({ 
      error: '설문 제출에 실패했습니다.' 
    }, { status: 500 });
  }
}

// 교사가 학생 응답 조회
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');

    if (!surveyId) {
      return NextResponse.json({ error: '설문 ID가 필요합니다.' }, { status: 400 });
    }

    // 설문 소유권 확인
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .eq('teacher_id', user.id)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 학생 응답 조회 (학생 정보 포함)
    const { data: responses, error: responsesError } = await supabase
      .from('student_survey_submissions')
      .select(`
        *,
        student:students (
          id,
          name,
          number,
          class:classes (
            name,
            grade,
            class_number
          )
        )
      `)
      .eq('survey_id', surveyId)
      .order('student_number', { ascending: true });

    if (responsesError) {
      throw responsesError;
    }

    // 응답 통계
    const stats = {
      totalResponses: responses?.length || 0,
      responsesByClass: responses?.reduce((acc: any, resp: any) => {
        const className = resp.access_code_info?.class?.name || '미지정';
        acc[className] = (acc[className] || 0) + 1;
        return acc;
      }, {}),
      lastResponseAt: responses?.[0]?.submitted_at
    };

    return NextResponse.json({
      responses,
      stats
    });

  } catch (error) {
    console.error('익명 응답 조회 오류:', error);
    return NextResponse.json({ error: '응답 조회에 실패했습니다.' }, { status: 500 });
  }
}