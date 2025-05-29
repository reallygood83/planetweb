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

    // 평가계획 중복 확인 (같은 과목, 학년, 학기, 단원)
    const { data: existingPlan } = await supabase
      .from('evaluation_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject', subject)
      .eq('grade', grade)
      .eq('semester', semester)
      .eq('unit', unit)
      .single()

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Evaluation plan already exists for this subject, grade, semester, and unit' }, 
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
      return NextResponse.json({ error: 'Failed to create evaluation plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newEvaluation }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}