import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE: 설문 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Survey deletion started ===')
    console.log('Survey ID to delete:', params.id)
    
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured')
      return NextResponse.json({ 
        success: false,
        error: 'Database not configured' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)

    // 설문 소유권 확인
    const { data: survey, error: checkError } = await supabase
      .from('surveys')
      .select('id, user_id, title')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !survey) {
      console.error('Survey not found or access denied:', checkError)
      return NextResponse.json({ 
        success: false,
        error: 'Survey not found or access denied' 
      }, { status: 404 })
    }

    console.log('Survey found:', survey.title)

    // Soft delete: is_active를 false로 설정
    const { error: deleteError } = await supabase
      .from('surveys')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to delete survey: ' + deleteError.message 
      }, { status: 500 })
    }

    console.log('=== Survey deleted successfully ===')
    
    return NextResponse.json({ 
      success: true,
      message: 'Survey deleted successfully' 
    })
  } catch (error) {
    console.error('=== Survey deletion failed ===')
    console.error('Error:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

// GET: 특정 설문 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return NextResponse.json({ 
        success: false,
        error: 'Database not configured' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // 설문 조회 (활성 설문만)
    const { data: survey, error } = await supabase
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
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error || !survey) {
      return NextResponse.json({ 
        success: false,
        error: 'Survey not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: survey })
  } catch (error) {
    console.error('Survey fetch error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}