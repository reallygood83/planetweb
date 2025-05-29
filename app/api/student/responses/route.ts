import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      surveyId, 
      studentName, 
      classCode, 
      responses 
    } = body

    if (!surveyId || !studentName || !classCode || !responses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify class code and get class info
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, user_id')
      .eq('code', classCode)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Invalid class code' }, { status: 404 })
    }

    // Verify survey exists and belongs to the class teacher
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .select('id, user_id')
      .eq('id', surveyId)
      .eq('user_id', classData.user_id)
      .single()

    if (surveyError || !surveyData) {
      return NextResponse.json({ error: 'Invalid survey' }, { status: 404 })
    }

    // Check if student has already responded
    const { data: existingResponse } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('student_name', studentName)
      .eq('class_id', classData.id)
      .single()

    if (existingResponse) {
      return NextResponse.json({ error: 'Student has already responded to this survey' }, { status: 409 })
    }

    // Save response
    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        class_id: classData.id,
        student_name: studentName,
        responses: responses,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving response:', error)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      responseId: data.id 
    })
  } catch (error) {
    console.error('Error in student responses API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}