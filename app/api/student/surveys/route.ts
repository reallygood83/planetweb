import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classCode = searchParams.get('classCode')

    if (!classCode) {
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 })
    }

    // Debug environment variables
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...'
    })

    // Use service role client to bypass RLS for public student access
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find class by school code - handle potential duplicates
    const { data: classDataArray, error: classError } = await supabase
      .from('classes')
      .select('id, class_name, user_id, school_code')
      .eq('school_code', classCode)

    if (classError || !classDataArray || classDataArray.length === 0) {
      console.error('Class lookup error:', classError, 'for code:', classCode)
      
      // Additional debugging - check if school_code column exists
      const { data: allClasses, error: allError } = await supabase
        .from('classes')
        .select('id, class_name, school_code')
        .limit(5)
      
      console.error('Sample classes data:', allClasses, 'error:', allError)
      
      return NextResponse.json({ 
        error: 'Invalid class code',
        debug: {
          searchedCode: classCode,
          classError: classError?.message,
          sampleClasses: allClasses?.map(c => ({ id: c.id, name: c.class_name, code: c.school_code }))
        }
      }, { status: 404 })
    }

    // Use the first class if multiple found
    const classData = classDataArray[0]
    console.log('Found class:', classData)

    // Get active surveys for this class
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        questions,
        created_at,
        evaluation_plans (
          id,
          subject,
          grade,
          semester
        )
      `)
      .eq('user_id', classData.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (surveysError) {
      console.error('Error fetching surveys:', surveysError)
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
    }

    return NextResponse.json({
      class: classData,
      surveys: surveys || []
    })
  } catch (error) {
    console.error('Error in student surveys API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}