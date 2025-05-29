import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 사용자의 모든 과목별 평가계획 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 모든 과목별 평가계획 조회 (개별 평가 포함)
    const { data: plans, error } = await supabase
      .from('subject_evaluation_plans')
      .select(`
        *,
        evaluations:individual_evaluations (
          id,
          evaluation_name,
          unit,
          lesson,
          evaluation_period,
          achievement_standards,
          evaluation_methods,
          evaluation_tools,
          evaluation_criteria,
          weight,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('school_year', { ascending: false })
      .order('semester', { ascending: false })
      .order('subject', { ascending: true })

    if (error) {
      console.error('Error fetching subject plans:', error)
      return NextResponse.json({ error: 'Failed to fetch subject plans' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 새로운 과목별 평가계획 생성
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
      school_year = new Date().getFullYear()
    } = body

    // 필수 필드 검증
    if (!subject || !grade || !semester) {
      return NextResponse.json(
        { error: 'subject, grade, semester are required' }, 
        { status: 400 }
      )
    }

    // 중복 확인
    const { data: existingPlan } = await supabase
      .from('subject_evaluation_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('school_year', school_year)
      .eq('semester', semester)
      .eq('subject', subject)
      .eq('grade', grade)
      .single()

    if (existingPlan) {
      return NextResponse.json(
        { error: '해당 학년도-학기-과목-학년의 평가계획이 이미 존재합니다.' }, 
        { status: 409 }
      )
    }

    // 새 과목별 평가계획 생성
    const { data: newPlan, error } = await supabase
      .from('subject_evaluation_plans')
      .insert([{
        user_id: user.id,
        subject,
        grade,
        semester,
        school_year
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating subject plan:', error)
      return NextResponse.json({ error: 'Failed to create subject plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newPlan }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}