import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classCode = searchParams.get('classCode')

    if (!classCode) {
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find class by school code
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, class_name, user_id, school_code')
      .eq('school_code', classCode)
      .single()

    if (classError || !classData) {
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