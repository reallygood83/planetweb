import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 설문 접근 코드 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { surveyId, classId, expiresInDays = 7, maxResponses = null } = body;

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

    // 기존 접근 코드 확인
    const { data: existingCode } = await supabase
      .from('survey_access_codes')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('teacher_id', user.id)
      .single();

    if (existingCode) {
      // 기존 코드 업데이트
      const { data: updated, error: updateError } = await supabase
        .from('survey_access_codes')
        .update({
          expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
          max_responses: maxResponses,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCode.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        accessCode: existingCode.access_code,
        surveyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/survey/${existingCode.access_code}`,
        ...updated
      });
    }

    // 새 접근 코드 생성 (안전한 방식)
    let accessCode = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && !accessCode) {
      attempts++;
      // 6자리 랜덤 코드 생성
      const randomCode = 'S' + Math.random().toString(36).substring(2, 7).toUpperCase();
      
      // 중복 체크
      const { data: existing } = await supabase
        .from('survey_access_codes')
        .select('id')
        .eq('access_code', randomCode)
        .single();
      
      if (!existing) {
        accessCode = randomCode;
      }
    }
    
    if (!accessCode) {
      return NextResponse.json({ error: '접근 코드 생성에 실패했습니다.' }, { status: 500 });
    }

    const { data: newAccess, error: insertError } = await supabase
      .from('survey_access_codes')
      .insert({
        survey_id: surveyId,
        access_code: accessCode,
        class_id: classId,
        teacher_id: user.id,
        expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
        max_responses: maxResponses
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      accessCode: newAccess.access_code,
      surveyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/survey/${newAccess.access_code}`,
      ...newAccess
    });

  } catch (error) {
    console.error('설문 접근 코드 생성 오류:', error);
    return NextResponse.json({ error: '접근 코드 생성에 실패했습니다.' }, { status: 500 });
  }
}

// 설문 정보 조회 (학생용)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('code');

    if (!accessCode) {
      return NextResponse.json({ error: '접근 코드가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 접근 코드 정보 조회
    const { data: access, error: accessError } = await supabase
      .from('survey_access_codes')
      .select(`
        *,
        survey:surveys (
          *,
          teacher:profiles!surveys_teacher_id_fkey (
            name
          )
        ),
        class:classes (
          name,
          grade,
          class_number
        )
      `)
      .eq('access_code', accessCode)
      .single();

    if (accessError || !access) {
      return NextResponse.json({ error: '유효하지 않은 접근 코드입니다.' }, { status: 404 });
    }

    // 만료 확인
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return NextResponse.json({ error: '만료된 접근 코드입니다.' }, { status: 410 });
    }

    // 응답 제한 확인
    if (access.max_responses && access.response_count >= access.max_responses) {
      return NextResponse.json({ error: '최대 응답 수에 도달했습니다.' }, { status: 403 });
    }

    return NextResponse.json({
      survey: {
        id: access.survey.id,
        title: access.survey.title,
        description: access.survey.description,
        questions: access.survey.questions,
        teacherName: access.survey.teacher?.name || '선생님'
      },
      class: access.class,
      remainingResponses: access.max_responses ? access.max_responses - access.response_count : null
    });

  } catch (error) {
    console.error('설문 정보 조회 오류:', error);
    return NextResponse.json({ error: '설문 정보 조회에 실패했습니다.' }, { status: 500 });
  }
}