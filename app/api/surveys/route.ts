import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 사용자의 모든 설문 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          semester
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching surveys:', error)
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: surveys })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 새로운 설문 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, evaluation_plan_id, questions, is_active = true } = body

    // 필수 필드 검증
    if (!title || !questions) {
      return NextResponse.json(
        { error: 'title and questions are required' }, 
        { status: 400 }
      )
    }

    // 새 설문 생성
    const { data: newSurvey, error } = await supabase
      .from('surveys')
      .insert([{
        user_id: user.id,
        title,
        evaluation_plan_id: evaluation_plan_id || null,
        questions,
        is_active
      }])
      .select(`
        *,
        evaluation_plans (
          id,
          subject,
          grade,
          semester
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