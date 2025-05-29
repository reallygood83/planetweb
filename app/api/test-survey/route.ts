import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('Test survey API called')
  
  try {
    const supabase = await createClient()
    console.log('Supabase client created')
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check:', { user: !!user, error: !!authError })
    
    if (authError || !user) {
      console.log('Auth failed:', authError)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body received:', JSON.stringify(body, null, 2))
    
    const { subject, grade, unit } = body
    console.log('Extracted fields:', { subject, grade, unit })
    
    // Simple validation
    if (!subject || !grade || !unit) {
      console.log('Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        received: { subject, grade, unit }
      }, { status: 400 })
    }

    // Check API key
    const { data: profile } = await supabase
      .from('profiles')
      .select('api_key_hint')
      .eq('id', user.id)
      .single()
      
    console.log('Profile data:', { hasApiKey: !!profile?.api_key_hint })

    return NextResponse.json({
      success: true,
      message: 'Test successful',
      data: {
        receivedFields: { subject, grade, unit },
        hasApiKey: !!profile?.api_key_hint,
        userId: user.id
      }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}