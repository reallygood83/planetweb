import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 사용자의 모든 설문 조회
export async function GET() {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured, returning empty surveys data')
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth error or no user, returning empty data')
      return NextResponse.json({ success: true, data: [] })
    }

    // 사용자의 모든 설문 조회 (평가계획 정보 포함)
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select(`
        *,
        evaluation_plans (
          id,
          subject,
          grade,
          semester,
          unit
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching surveys:', error)
      return NextResponse.json({ success: true, data: [] })
    }

    return NextResponse.json({ success: true, data: surveys || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}

// POST: 새로운 설문 생성
export async function POST(request: NextRequest) {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured, cannot create survey')
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, evaluation_plan_id, evaluation_plan, questions, is_active = true } = body

    // 필수 필드 검증
    if (!title || !questions) {
      return NextResponse.json(
        { error: 'title and questions are required' }, 
        { status: 400 }
      )
    }

    let finalEvaluationPlanId = evaluation_plan_id

    // evaluation_plan 객체가 전달된 경우, 먼저 저장
    if (evaluation_plan && !evaluation_plan_id) {
      const { data: newEvaluationPlan, error: planError } = await supabase
        .from('evaluation_plans')
        .insert([{
          user_id: user.id,
          subject: evaluation_plan.subject,
          grade: evaluation_plan.grade,
          semester: evaluation_plan.semester || null,
          unit: evaluation_plan.unit,
          lesson: evaluation_plan.lesson || null,
          learning_objectives: evaluation_plan.learningObjectives ? [evaluation_plan.learningObjectives] : [],
          achievement_standards: evaluation_plan.achievementStandards ? [evaluation_plan.achievementStandards] : [],
          evaluation_criteria: evaluation_plan.evaluationCriteria || null
        }])
        .select()
        .single()

      if (planError) {
        console.error('Error creating evaluation plan:', planError)
        return NextResponse.json({ error: 'Failed to create evaluation plan' }, { status: 500 })
      }

      finalEvaluationPlanId = newEvaluationPlan.id
    }

    // 새 설문 생성
    const { data: newSurvey, error } = await supabase
      .from('surveys')
      .insert([{
        user_id: user.id,
        title,
        description: description || null,
        evaluation_plan_id: finalEvaluationPlanId || null,
        questions,
        is_active
      }])
      .select(`
        *,
        evaluation_plans (
          id,
          subject,
          grade,
          semester,
          unit
        )
      `)
      .single()

    if (error) {
      console.error('Error creating survey:', error)
      return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newSurvey }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}