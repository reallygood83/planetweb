import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 익명 설문 응답 제출
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessCode, studentName, responses } = body;

    if (!accessCode || !studentName || !responses) {
      return NextResponse.json({ 
        error: '필수 정보가 누락되었습니다.' 
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

    // 중복 응답 확인 (같은 이름으로 이미 제출했는지)
    const { data: existingResponse } = await supabase
      .from('anonymous_survey_responses')
      .select('id')
      .eq('survey_id', access.survey_id)
      .eq('access_code', accessCode)
      .eq('student_name', studentName)
      .single();

    if (existingResponse) {
      return NextResponse.json({ 
        error: '이미 설문에 참여하셨습니다.' 
      }, { status: 409 });
    }

    // 응답 저장
    const { data: newResponse, error: insertError } = await supabase
      .from('anonymous_survey_responses')
      .insert({
        survey_id: access.survey_id,
        access_code: accessCode,
        student_name: studentName,
        responses: responses
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 학생의 실제 계정이 있는지 확인하고 연결 (선택적)
    if (access.class_id) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', access.class_id)
        .eq('name', studentName)
        .single();

      if (student) {
        // 기존 survey_responses 테이블에도 저장 (교사가 기존 방식으로도 볼 수 있도록)
        await supabase
          .from('survey_responses')
          .insert({
            survey_id: access.survey_id,
            student_id: student.id,
            responses: responses
          });
      }
    }

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

// 교사가 익명 응답 조회
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

    // 익명 응답 조회
    const { data: responses, error: responsesError } = await supabase
      .from('anonymous_survey_responses')
      .select(`
        *,
        access_code_info:survey_access_codes!access_code (
          class:classes (
            name,
            grade,
            class_number
          )
        )
      `)
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false });

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