import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 특정 평가계획 조회
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

    // 특정 평가계획 조회
    const { data: evaluation, error } = await supabase
      .from('evaluation_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching evaluation:', error)
      return NextResponse.json({ error: 'Evaluation plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: evaluation })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 평가계획 수정
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
    const { subject, grade, semester, evaluations } = body

    // 평가계획 존재 확인
    const { data: existingEvaluation, error: fetchError } = await supabase
      .from('evaluation_plans')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingEvaluation) {
      return NextResponse.json({ error: 'Evaluation plan not found' }, { status: 404 })
    }

    // 중복 확인 (자신 제외)
    if (subject && grade && semester) {
      const { data: duplicatePlan } = await supabase
        .from('evaluation_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('subject', subject)
        .eq('grade', grade)
        .eq('semester', semester)
        .neq('id', id)
        .single()

      if (duplicatePlan) {
        return NextResponse.json(
          { error: 'Evaluation plan already exists for this subject, grade, and semester' }, 
          { status: 409 }
        )
      }
    }

    // 평가계획 업데이트
    const updateData: any = { updated_at: new Date().toISOString() }
    if (subject !== undefined) updateData.subject = subject
    if (grade !== undefined) updateData.grade = grade
    if (semester !== undefined) updateData.semester = semester
    if (evaluations !== undefined) updateData.evaluations = evaluations

    const { data: updatedEvaluation, error } = await supabase
      .from('evaluation_plans')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating evaluation:', error)
      return NextResponse.json({ error: 'Failed to update evaluation plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedEvaluation })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 평가계획 삭제
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

    // 평가계획 존재 확인
    const { data: existingEvaluation, error: fetchError } = await supabase
      .from('evaluation_plans')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingEvaluation) {
      return NextResponse.json({ error: 'Evaluation plan not found' }, { status: 404 })
    }

    // 평가계획 삭제
    const { error } = await supabase
      .from('evaluation_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting evaluation:', error)
      return NextResponse.json({ error: 'Failed to delete evaluation plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Evaluation plan deleted successfully' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}