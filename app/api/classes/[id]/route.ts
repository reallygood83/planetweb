import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 특정 학급 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 특정 학급 조회
    const { data: classData, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching class:', error)
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: classData })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 학급 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { class_name, grade, semester, teacher, students } = body

    // 학급 존재 확인
    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // 학급명 중복 확인 (자신 제외)
    if (class_name) {
      const { data: duplicateClass } = await supabase
        .from('classes')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_name', class_name)
        .neq('id', id)
        .single()

      if (duplicateClass) {
        return NextResponse.json(
          { error: 'Class name already exists' }, 
          { status: 409 }
        )
      }
    }

    // 학급 정보 업데이트
    const updateData: any = { updated_at: new Date().toISOString() }
    if (class_name !== undefined) updateData.class_name = class_name
    if (grade !== undefined) updateData.grade = grade
    if (semester !== undefined) updateData.semester = semester
    if (teacher !== undefined) updateData.teacher = teacher
    if (students !== undefined) updateData.students = students

    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating class:', error)
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedClass })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 학급 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 학급 존재 확인
    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // 학급 삭제
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting class:', error)
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Class deleted successfully' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}