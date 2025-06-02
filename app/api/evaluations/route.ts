import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 사용자의 모든 평가계획 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 모든 평가계획 조회
    const { data: evaluations, error } = await supabase
      .from('evaluation_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching evaluations:', error)
      return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: evaluations })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 새로운 평가계획 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      subject, 
      grade, 
      semester, 
      school_year,
      unit,
      lesson,
      achievement_standards,
      learning_objectives,
      evaluation_methods,
      evaluation_tools,
      evaluation_criteria,
      ai_generation_targets,
      record_keywords,
      special_notes
    } = body

    // 필수 필드 검증
    if (!subject || !grade || !semester || !unit) {
      return NextResponse.json(
        { error: 'subject, grade, semester, unit are required' }, 
        { status: 400 }
      )
    }

    // 평가계획 중복 확인 (같은 과목, 학년, 학기, 학년도, 단원, 차시)
    // 차시가 있는 경우에만 중복 체크, 없으면 단원별 구분만
    let duplicateCheckQuery = supabase
      .from('evaluation_plans')
      .select('id, lesson')
      .eq('user_id', user.id)
      .eq('subject', subject)
      .eq('grade', grade)
      .eq('semester', semester)
      .eq('school_year', school_year || new Date().getFullYear().toString())
      .eq('unit', unit)

    // 차시가 있는 경우 차시까지 포함해서 중복 체크
    if (lesson && lesson.trim()) {
      duplicateCheckQuery = duplicateCheckQuery.eq('lesson', lesson.trim())
    }

    const { data: existingPlans } = await duplicateCheckQuery

    // 차시가 없는 새 평가계획인데, 같은 단원에 차시가 없는 계획이 이미 있는 경우
    if ((!lesson || !lesson.trim()) && existingPlans && existingPlans.length > 0) {
      const hasLessonlessPlans = existingPlans.some(plan => !plan.lesson || !plan.lesson.trim())
      if (hasLessonlessPlans) {
        return NextResponse.json(
          { error: 'A general evaluation plan already exists for this unit. Please specify a lesson number or create a more specific evaluation plan.' }, 
          { status: 409 }
        )
      }
    }

    // 차시가 있는 새 평가계획인데, 같은 차시 계획이 이미 있는 경우
    if (lesson && lesson.trim() && existingPlans && existingPlans.length > 0) {
      return NextResponse.json(
        { error: `Evaluation plan already exists for lesson "${lesson}" in this unit. Please use a different lesson number or modify the existing plan.` }, 
        { status: 409 }
      )
    }

    // 새 평가계획 생성
    const { data: newEvaluation, error } = await supabase
      .from('evaluation_plans')
      .insert([{
        user_id: user.id,
        subject,
        grade,
        semester,
        school_year: school_year || new Date().getFullYear().toString(),
        unit,
        lesson,
        achievement_standards: achievement_standards || [],
        learning_objectives: learning_objectives || [],
        evaluation_methods: evaluation_methods || [],
        evaluation_tools: evaluation_tools || [],
        evaluation_criteria: evaluation_criteria || {
          excellent: { level: '매우잘함', description: '' },
          good: { level: '잘함', description: '' },
          satisfactory: { level: '보통', description: '' },
          needs_improvement: { level: '노력요함', description: '' }
        },
        ai_generation_targets: ai_generation_targets || ['교과학습발달상황', '창의적 체험활동 누가기록', '행동특성 및 종합의견'],
        record_keywords: record_keywords || [],
        special_notes: special_notes || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating evaluation:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // 스키마 호환성 문제일 경우 기존 형식으로 재시도
      if (error.code === '42703' || error.message?.includes('column')) {
        console.log('Attempting legacy schema format...')
        
        const { data: legacyEvaluation, error: legacyError } = await supabase
          .from('evaluation_plans')
          .insert([{
            user_id: user.id,
            subject,
            grade,
            semester,
            evaluations: [] // 기존 스키마 형식
          }])
          .select()
          .single()
          
        if (legacyError) {
          console.error('Legacy format also failed:', legacyError)
          return NextResponse.json({ 
            error: 'Failed to create evaluation plan', 
            details: error.message 
          }, { status: 500 })
        }
        
        return NextResponse.json({ success: true, data: legacyEvaluation }, { status: 201 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create evaluation plan',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newEvaluation }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}