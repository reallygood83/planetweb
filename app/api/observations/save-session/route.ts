import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ObservationSession, StudentObservation } from '@/lib/types/observation-system';

export async function POST(request: NextRequest) {
  try {
    const { 
      class_id,
      session_date,
      subject,
      lesson_topic,
      students_observations
    }: {
      class_id: string;
      session_date: string;
      subject?: string;
      lesson_topic?: string;
      students_observations: StudentObservation[];
    } = await request.json();

    if (!class_id || !session_date || !students_observations || students_observations.length === 0) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerComponentClient({ cookies });

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 1. 관찰 세션 저장
    const { data: sessionData, error: sessionError } = await supabase
      .from('observation_sessions')
      .insert({
        user_id: user.id,
        class_id,
        session_date,
        subject,
        lesson_topic,
        students_data: students_observations
      })
      .select()
      .single();

    if (sessionError) {
      console.error('세션 저장 오류:', sessionError);
      return NextResponse.json(
        { error: '관찰 세션 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. 개별 관찰 기록을 daily_observations 테이블에 저장
    const dailyObservations: any[] = [];
    
    students_observations.forEach(studentObs => {
      studentObs.selected_keywords.forEach(keyword => {
        dailyObservations.push({
          user_id: user.id,
          class_id,
          student_name: studentObs.student_name,
          observation_date: session_date,
          category_id: keyword.category_id,
          keyword_id: keyword.keyword_id,
          intensity: keyword.intensity || 2,
          context: keyword.context,
          subject
        });
      });
    });

    if (dailyObservations.length > 0) {
      const { error: dailyError } = await supabase
        .from('daily_observations')
        .insert(dailyObservations);

      if (dailyError) {
        console.error('일상 관찰 저장 오류:', dailyError);
        // 세션은 저장되었으므로 경고만 로그
      }
    }

    // 3. 통계 업데이트 (키워드 사용 빈도)
    await updateKeywordFrequency(supabase, user.id, students_observations);

    return NextResponse.json({
      success: true,
      session_id: sessionData.id,
      saved_observations: dailyObservations.length,
      message: '관찰 기록이 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    console.error('관찰 기록 저장 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 키워드 사용 빈도 업데이트
async function updateKeywordFrequency(
  supabase: any, 
  userId: string, 
  observations: StudentObservation[]
) {
  try {
    // 사용된 키워드별 빈도 계산
    const keywordCounts: Record<string, number> = {};
    
    observations.forEach(obs => {
      obs.selected_keywords.forEach(keyword => {
        const key = `${keyword.category_id}:${keyword.keyword_id}`;
        keywordCounts[key] = (keywordCounts[key] || 0) + 1;
      });
    });

    // 각 카테고리별로 키워드 빈도 업데이트
    const categoryUpdates: Record<string, any> = {};
    
    Object.entries(keywordCounts).forEach(([key, count]) => {
      const [categoryId, keywordId] = key.split(':');
      if (!categoryUpdates[categoryId]) {
        categoryUpdates[categoryId] = {};
      }
      categoryUpdates[categoryId][keywordId] = count;
    });

    // 카테고리별로 키워드 빈도 업데이트 (간단한 버전)
    // 실제로는 더 복잡한 통계 분석이 필요할 수 있음
    console.log('키워드 사용 통계 업데이트:', categoryUpdates);

  } catch (error) {
    console.error('키워드 빈도 업데이트 오류:', error);
  }
}

// GET: 저장된 관찰 세션 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createServerComponentClient({ cookies });

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let query = supabase
      .from('observation_sessions')
      .select(`
        id,
        class_id,
        session_date,
        subject,
        lesson_topic,
        students_data,
        created_at,
        classes (
          class_name,
          students
        )
      `)
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (startDate) {
      query = query.gte('session_date', startDate);
    }
    if (endDate) {
      query = query.lte('session_date', endDate);
    }

    const { data: sessions, error: queryError } = await query;

    if (queryError) {
      console.error('세션 조회 오류:', queryError);
      return NextResponse.json(
        { error: '관찰 세션 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      count: sessions?.length || 0
    });

  } catch (error) {
    console.error('관찰 세션 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}