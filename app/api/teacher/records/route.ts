import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured, returning empty records')
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
      // Fetch all generated records for the teacher
      const { data: records, error } = await supabase
        .from('generated_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching records:', error)
        // 테이블이 없는 경우 빈 배열 반환
        if (error.message?.includes('relation') || error.message?.includes('table')) {
          return NextResponse.json({ success: true, data: [] })
        }
        return NextResponse.json(
          { success: false, error: 'Failed to fetch records' }, 
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        data: records || [] 
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ success: true, data: [] })
    }

  } catch (error) {
    console.error('Error in records API:', error)
    return NextResponse.json({ success: true, data: [] }) // 폴백으로 빈 배열 반환
  }
}