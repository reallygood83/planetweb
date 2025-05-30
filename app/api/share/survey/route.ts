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
    const { surveyId, classId } = body;

    if (!surveyId) {
      return NextResponse.json({ error: '설문 ID가 필요합니다.' }, { status: 400 });
    }

    // 설문 소유권 확인
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .eq('user_id', user.id)
      .single();

    if (surveyError || !survey) {
      console.error('Survey lookup error:', surveyError);
      console.log('Survey ID:', surveyId);
      console.log('User ID:', user.id);
      return NextResponse.json({ 
        error: '설문을 찾을 수 없습니다.',
        details: surveyError?.message || 'Survey not found',
        surveyId,
        userId: user.id
      }, { status: 404 });
    }

    // 학급 정보 가져오기 (학급 코드 사용)
    let classData = null;
    if (classId) {
      const { data: cls, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('user_id', user.id)
        .single();
      
      if (classError) {
        console.error('Class lookup error:', classError);
      } else {
        classData = cls;
      }
    }

    // 학급 코드가 있으면 그것을 사용, 없으면 간단한 설문 공유 코드 생성
    let accessCode = '';
    let surveyUrl = '';
    
    if (classData && classData.school_code) {
      // 학급 코드를 사용한 URL
      accessCode = classData.school_code;
      surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/student/survey/${surveyId}?code=${accessCode}`;
    } else {
      // 간단한 공유 코드 생성 (6자리)
      accessCode = 'S' + Math.random().toString(36).substring(2, 7).toUpperCase();
      surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/student/survey/${surveyId}?share=${accessCode}`;
    }

    return NextResponse.json({
      accessCode,
      surveyUrl,
      classInfo: classData ? {
        name: classData.class_name,
        code: classData.school_code
      } : null,
      surveyInfo: {
        id: survey.id,
        title: survey.title
      }
    });

  } catch (error) {
    console.error('설문 접근 코드 생성 오류:', error);
    return NextResponse.json({ error: '접근 코드 생성에 실패했습니다.' }, { status: 500 });
  }
}

// 설문 정보 조회 (학생용) - 간단한 버전
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');
    const code = searchParams.get('code');

    if (!surveyId) {
      return NextResponse.json({ error: '설문 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 설문 정보 조회
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        *,
        user:profiles!surveys_user_id_fkey (
          name
        )
      `)
      .eq('id', surveyId)
      .eq('is_active', true)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: '설문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 학급 코드가 있으면 학급 정보도 조회
    let classData = null;
    if (code) {
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('school_code', code)
        .single();
      
      classData = cls;
    }

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        questions: survey.questions,
        teacherName: survey.user?.name || '선생님'
      },
      class: classData
    });

  } catch (error) {
    console.error('설문 정보 조회 오류:', error);
    return NextResponse.json({ error: '설문 정보 조회에 실패했습니다.' }, { status: 500 });
  }
}