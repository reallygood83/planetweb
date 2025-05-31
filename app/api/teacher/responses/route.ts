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
    
    console.log('Teacher responses query params:', { surveyId, classId, studentName, userId: user.id })

    // Build base query - select all response fields including school_code
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
      console.log('Filtering by surveyId:', surveyId)
    }
    
    if (classId) {
      // class_id로 class_name과 school_code를 먼저 찾아야 함
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('class_name, school_code')
        .eq('id', classId)
        .single()
      
      console.log('Class lookup result:', { classData, classError })
      
      if (classData) {
        // 3가지 경우로 매칭:
        // 1. class_name이 정확히 일치
        // 2. school_code 컬럼이 일치 (새 구조)
        // 3. class_name에 학교 코드가 저장된 경우 (기존 구조)
        const conditions = []
        
        if (classData.class_name) {
          conditions.push(`class_name.eq.${classData.class_name}`)
        }
        
        if (classData.school_code) {
          conditions.push(`school_code.eq.${classData.school_code}`)
          conditions.push(`class_name.eq.${classData.school_code}`)
        }
        
        if (conditions.length > 0) {
          const orCondition = conditions.join(',')
          query = query.or(orCondition)
          console.log('Applied class filter with conditions:', orCondition)
        }
      } else {
        console.log('Class not found for ID:', classId)
      }
    }
    
    if (studentName) {
      query = query.eq('student_name', studentName)
      console.log('Filtering by studentName:', studentName)
    }

    // Execute query
    const { data: responses, error } = await query
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }
    
    console.log(`Found ${responses?.length || 0} responses for user ${user.id}`)
    
    // 추가 디버깅: 응답 데이터 구조 확인
    if (responses && responses.length > 0) {
      console.log('Sample response structure:', {
        id: responses[0].id,
        class_name: responses[0].class_name,
        school_code: responses[0].school_code,
        student_name: responses[0].student_name,
        survey_id: responses[0].survey_id
      })
    }

    // 전체 응답 수도 확인해보자 (디버깅용)
    const { data: allResponses } = await supabase
      .from('survey_responses')
      .select('id, class_name, school_code, survey_id, surveys!inner(user_id)')
      .eq('surveys.user_id', user.id)
    
    console.log(`Total responses for user ${user.id}: ${allResponses?.length || 0}`)
    if (allResponses && allResponses.length > 0) {
      console.log('All response class info:', allResponses.map(r => ({
        id: r.id,
        class_name: r.class_name,
        school_code: r.school_code,
        survey_id: r.survey_id
      })))
    }

    // 데이터 정리
    const formattedResponses = responses?.map(response => ({
      id: response.id,
      survey_id: response.survey_id,
      student_name: response.student_name,
      class_name: response.class_name,
      school_code: response.school_code,
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
      data: formattedResponses,
      debug: {
        queryParams: { surveyId, classId, studentName },
        totalUserResponses: allResponses?.length || 0,
        filteredResponses: formattedResponses.length
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}