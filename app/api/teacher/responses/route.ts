import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const surveyId = searchParams.get('surveyId')
    const classId = searchParams.get('classId')
    const studentName = searchParams.get('studentName')

    // Build query
    let query = supabase
      .from('survey_responses')
      .select(`
        *,
        surveys!inner (
          id,
          title,
          questions,
          evaluation_plans (
            id,
            subject,
            grade,
            semester,
            unit,
            achievement_standards,
            evaluation_criteria
          )
        )
      `)
      .eq('surveys.user_id', user.id)

    // Apply filters if provided
    if (surveyId) {
      query = query.eq('survey_id', surveyId)
    }
    if (classId) {
      // class_id로 class_name을 먼저 찾아야 함
      const { data: classData } = await supabase
        .from('classes')
        .select('class_name')
        .eq('id', classId)
        .single()
      
      if (classData) {
        query = query.eq('class_name', classData.class_name)
      }
    }
    if (studentName) {
      query = query.eq('student_name', studentName)
    }

    // Execute query
    const { data: responses, error } = await query
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    // 데이터 정리
    const formattedResponses = responses?.map(response => ({
      id: response.id,
      survey_id: response.survey_id,
      student_name: response.student_name,
      class_name: response.class_name,
      responses: response.responses,
      submitted_at: response.submitted_at,
      survey: response.surveys ? {
        id: response.surveys.id,
        title: response.surveys.title,
        questions: response.surveys.questions,
        evaluation_plans: response.surveys.evaluation_plans
      } : null
    })) || []

    return NextResponse.json({ 
      success: true, 
      data: formattedResponses 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}