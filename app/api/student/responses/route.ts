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

    // Save response with proper class name and school code
    let className = '공유 링크'
    let schoolCode = null
    
    if (classData) {
      // Fetch the actual class name and school code from the classes table
      const { data: classInfo } = await supabase
        .from('classes')
        .select('class_name, school_code')
        .eq('id', classData.id)
        .single()
      
      if (classInfo) {
        className = classInfo.class_name
        schoolCode = classInfo.school_code
      }
    } else if (classCode && !classCode.startsWith('S')) {
      // 학급 코드로 직접 접근한 경우, 실제 class_name 찾기
      const { data: classInfo } = await supabase
        .from('classes')
        .select('class_name, school_code')
        .eq('school_code', classCode)
        .single()
      
      if (classInfo) {
        className = classInfo.class_name
        schoolCode = classInfo.school_code
      } else {
        // 학급을 찾을 수 없는 경우 코드만 저장
        className = classCode
        schoolCode = classCode
      }
    }

    const responseData = {
      survey_id: surveyId,
      student_name: studentName,
      class_name: className,
      school_code: schoolCode,
      responses: responses,
      submitted_at: new Date().toISOString()
    }
    
    console.log('Saving response with class_name:', className, 'school_code:', schoolCode, 'for class code:', classCode)

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