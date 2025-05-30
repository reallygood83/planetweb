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

    if (!surveyId || !studentName || !responses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // 공유 코드인지 학급 코드인지 확인
    let classData = null
    let surveyUserId = null
    
    if (classCode && classCode.startsWith('S')) {
      // 공유 코드로 접근한 경우 - 설문 정보에서 직접 user_id 가져오기
      const { data: surveyInfo, error: surveyError } = await supabase
        .from('surveys')
        .select('id, user_id')
        .eq('id', surveyId)
        .single()
      
      if (surveyError || !surveyInfo) {
        return NextResponse.json({ error: 'Invalid survey' }, { status: 404 })
      }
      
      surveyUserId = surveyInfo.user_id
    } else if (classCode) {
      // 학급 코드로 접근한 경우
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('id, user_id')
        .eq('school_code', classCode)
        .single()

      if (classError || !classInfo) {
        console.error('Class lookup error:', classError)
        return NextResponse.json({ error: 'Invalid class code' }, { status: 404 })
      }
      
      classData = classInfo
      surveyUserId = classInfo.user_id
    } else {
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 })
    }

    // Verify survey exists and belongs to the user
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .select('id, user_id')
      .eq('id', surveyId)
      .eq('user_id', surveyUserId)
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
      .single()

    if (existingResponse) {
      return NextResponse.json({ error: 'Student has already responded to this survey' }, { status: 409 })
    }

    // Save response
    const responseData = {
      survey_id: surveyId,
      student_name: studentName,
      class_name: classData ? `${classCode}` : '공유 링크',
      responses: responses,
      submitted_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('survey_responses')
      .insert(responseData)
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