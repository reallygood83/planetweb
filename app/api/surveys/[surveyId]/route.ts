import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { surveyId } = await params
    const supabase = await createClient()

    const { data: survey, error } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        questions,
        is_active,
        created_at,
        evaluation_plans (
          id,
          subject,
          grade,
          semester
        )
      `)
      .eq('id', surveyId)
      .eq('is_active', true)
      .single()

    if (error || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Error fetching survey:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured, simulating survey deletion')
      return NextResponse.json({ success: true, message: 'Survey deleted (simulated)' })
    }

    const { surveyId } = await params
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 설문이 해당 사용자의 것인지 확인
    const { data: survey, error: fetchError } = await supabase
      .from('surveys')
      .select('id, user_id')
      .eq('id', surveyId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !survey) {
      return NextResponse.json({ error: 'Survey not found or unauthorized' }, { status: 404 })
    }

    // 설문 삭제 (soft delete)
    const { error: deleteError } = await supabase
      .from('surveys')
      .update({ is_active: false })
      .eq('id', surveyId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting survey:', deleteError)
      return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Survey deleted successfully' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}