import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StudentAchievement } from '@/lib/types/teacher-evaluation';

export async function POST(request: NextRequest) {
  try {
    const {
      evaluation_plan_id,
      class_id,
      evaluation_name,
      evaluation_period,
      student_achievements
    }: {
      evaluation_plan_id: string;
      class_id: string;
      evaluation_name: string;
      evaluation_period?: string;
      student_achievements: StudentAchievement[];
    } = await request.json();

    if (!evaluation_plan_id || !class_id || !evaluation_name || !student_achievements?.length) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 1. 교사 평가 세션 저장
    const { data: evaluationData, error: evaluationError } = await supabase
      .from('teacher_evaluations')
      .insert({
        user_id: user.id,
        evaluation_plan_id,
        class_id,
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluation_name,
        evaluation_period,
        student_achievements
      })
      .select()
      .single();

    if (evaluationError) {
      console.error('평가 저장 오류:', evaluationError);
      return NextResponse.json(
        { error: '평가 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. 개별 학생 성취수준 저장 (빠른 조회를 위해)
    const studentAchievementRecords = student_achievements.map(achievement => ({
      teacher_evaluation_id: evaluationData.id,
      user_id: user.id,
      student_name: achievement.student_name,
      student_number: achievement.student_number,
      overall_achievement_level: achievement.achievement_level,
      achievement_by_areas: achievement.achievement_details || {},
      teacher_comment: achievement.teacher_comment,
      specific_achievements: achievement.specific_achievements || [],
      improvement_areas: achievement.improvement_areas || []
    }));

    const { error: studentError } = await supabase
      .from('student_achievements')
      .insert(studentAchievementRecords);

    if (studentError) {
      console.error('학생 성취수준 저장 오류:', studentError);
      // 메인 평가는 저장되었으므로 경고만 로그
    }

    return NextResponse.json({
      success: true,
      evaluation_id: evaluationData.id,
      saved_count: student_achievements.length,
      message: '성취수준 평가가 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    console.error('평가 저장 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 저장된 평가 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationPlanId = searchParams.get('evaluation_plan_id');
    const classId = searchParams.get('class_id');
    const studentName = searchParams.get('student_name');

    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let query = supabase
      .from('teacher_evaluations')
      .select(`
        *,
        evaluation_plans (
          subject,
          grade,
          semester,
          unit
        ),
        classes (
          class_name
        )
      `)
      .eq('user_id', user.id)
      .order('evaluation_date', { ascending: false });

    if (evaluationPlanId) {
      query = query.eq('evaluation_plan_id', evaluationPlanId);
    }
    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data: evaluations, error: queryError } = await query;

    if (queryError) {
      console.error('평가 조회 오류:', queryError);
      return NextResponse.json(
        { error: '평가 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 특정 학생의 평가만 필터링 (필요한 경우)
    let filteredEvaluations = evaluations;
    if (studentName) {
      filteredEvaluations = evaluations?.map(evaluation => ({
        ...evaluation,
        student_achievements: evaluation.student_achievements.filter(
          (achievement: StudentAchievement) => achievement.student_name === studentName
        )
      })).filter(evaluation => evaluation.student_achievements.length > 0);
    }

    return NextResponse.json({
      success: true,
      evaluations: filteredEvaluations || [],
      count: filteredEvaluations?.length || 0
    });

  } catch (error) {
    console.error('평가 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}