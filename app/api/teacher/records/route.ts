import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all generated records for the teacher
    const { data: records, error } = await supabase
      .from('generated_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching records:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch records' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: records || [] 
    })

  } catch (error) {
    console.error('Error in records API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}