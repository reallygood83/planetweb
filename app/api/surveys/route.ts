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

    // 사용자의 활성 설문만 조회 (평가계획 정보 포함)
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
      .eq('is_active', true)  // 삭제되지 않은 설문만 조회
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
    console.log('=== Survey creation started ===')
    
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured - using local storage fallback')
      
      // 클라이언트에서 localStorage로 저장하도록 안내
      return NextResponse.json({ 
        success: false,
        error: 'DATABASE_NOT_CONFIGURED',
        message: '데이터베이스가 설정되지 않았습니다. 설문은 브라우저에 임시 저장됩니다.',
        useLocalStorage: true
      }, { status: 503 })
    }
    
    console.log('Supabase URL configured:', process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...')

    const supabase = await createClient()
    console.log('Supabase client created')
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        success: false,
        error: 'Authentication failed: ' + authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      console.error('No user found')
      return NextResponse.json({ 
        success: false,
        error: 'No authenticated user' 
      }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)

    const body = await request.json()
    console.log('Request body received:', {
      title: body.title,
      hasQuestions: !!body.questions,
      questionsCount: body.questions?.length,
      survey_type: body.survey_type,
      hasBehaviorCriteria: !!body.behavior_criteria,
      hasEvaluationPlan: !!body.evaluation_plan
    })
    
    const { title, description, evaluation_plan_id, evaluation_plan, questions, is_active = true, survey_type = 'academic', behavior_criteria } = body

    // 필수 필드 검증
    if (!title || !questions) {
      console.error('Missing required fields:', { title: !!title, questions: !!questions })
      return NextResponse.json(
        { 
          success: false,
          error: 'title and questions are required' 
        }, 
        { status: 400 }
      )
    }

    let finalEvaluationPlanId = evaluation_plan_id

    // evaluation_plan 객체가 전달된 경우, 먼저 저장
    if (evaluation_plan && !evaluation_plan_id) {
      console.log('Creating evaluation plan:', evaluation_plan)
      
      const planData = {
        user_id: user.id,
        subject: evaluation_plan.subject,
        grade: evaluation_plan.grade,
        semester: evaluation_plan.semester || null,
        unit: evaluation_plan.unit,
        lesson: evaluation_plan.lesson || null,
        learning_objectives: evaluation_plan.learningObjectives ? [evaluation_plan.learningObjectives] : [],
        achievement_standards: evaluation_plan.achievementStandards ? [evaluation_plan.achievementStandards] : [],
        evaluation_criteria: evaluation_plan.evaluationCriteria || null
      }
      
      console.log('Evaluation plan data:', planData)
      
      const { data: newEvaluationPlan, error: planError } = await supabase
        .from('evaluation_plans')
        .insert([planData])
        .select()
        .single()

      if (planError) {
        console.error('Error creating evaluation plan:', planError)
        console.error('Plan error details:', planError.details)
        console.error('Plan error hint:', planError.hint)
        console.error('Plan error message:', planError.message)
        // Continue without evaluation plan for now
        finalEvaluationPlanId = null
      } else {
        console.log('Evaluation plan created successfully:', newEvaluationPlan.id)
        finalEvaluationPlanId = newEvaluationPlan.id
      }
    }

    // 새 설문 생성
    const surveyData: any = {
      user_id: user.id,
      title,
      description: description || null,
      evaluation_plan_id: finalEvaluationPlanId || null,
      questions,
      is_active
    }

    // Add behavior-specific fields if it's a behavior survey
    if (survey_type === 'behavior_development') {
      surveyData.survey_type = survey_type
      surveyData.behavior_criteria = behavior_criteria || null
    }

    console.log('Survey data to insert:', {
      ...surveyData,
      questions: `[${surveyData.questions?.length} questions]`
    })

    const { data: newSurvey, error } = await supabase
      .from('surveys')
      .insert([surveyData])
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
      console.error('=== Survey creation failed ===')
      console.error('Error details:', error)
      console.error('Error code:', error.code)
      console.error('Error hint:', error.hint)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Survey data that failed:', surveyData)
      
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create survey: ' + error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    console.log('=== Survey created successfully ===')
    console.log('New survey ID:', newSurvey.id)
    
    return NextResponse.json({ success: true, data: newSurvey }, { status: 201 })
  } catch (error) {
    console.error('=== API Error ===')
    console.error('Error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}