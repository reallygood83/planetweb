import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      responseId,
      recordType,
      content,
      metadata 
    } = body

    // Validate required fields
    if (!responseId || !recordType || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // Save the record
    const { data: record, error: insertError } = await supabase
      .from('generated_records')
      .insert({
        response_id: responseId,
        record_type: recordType,
        content,
        metadata,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving record:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save record' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: record 
    })

  } catch (error) {
    console.error('Error in save record API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}