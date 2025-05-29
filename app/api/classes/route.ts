import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 사용자의 모든 학급 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 모든 학급 조회
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: classes })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 새로운 학급 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { class_name, grade, semester, teacher, students = [] } = body

    // 필수 필드 검증
    if (!class_name || !grade || !semester) {
      return NextResponse.json(
        { error: 'class_name, grade, semester are required' }, 
        { status: 400 }
      )
    }

    // 학급명 중복 확인
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_name', class_name)
      .single()

    if (existingClass) {
      return NextResponse.json(
        { error: 'Class name already exists' }, 
        { status: 409 }
      )
    }

    // 새 학급 생성
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert([{
        user_id: user.id,
        class_name,
        grade,
        semester,
        teacher,
        students
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating class:', error)
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newClass }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}