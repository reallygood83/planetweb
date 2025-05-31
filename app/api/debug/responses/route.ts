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

    // 1. 테이블 구조 확인 - Skip RPC call for now
    const columns = null
    const columnsError = null

    // 2. 모든 응답 데이터 구조 확인
    const { data: allResponses, error: allError } = await supabase
      .from('survey_responses')
      .select('*')
      .limit(5)

    // 3. 사용자별 응답 확인
    const { data: userSurveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, user_id')
      .eq('user_id', user.id)

    // 4. 사용자 응답 조인 쿼리
    const { data: userResponses, error: userResponsesError } = await supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        student_name,
        class_name,
        school_code,
        submitted_at,
        surveys!inner(id, title, user_id)
      `)
      .eq('surveys.user_id', user.id)

    // 5. 사용자 클래스 확인
    const { data: userClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, class_name, school_code, user_id')
      .eq('user_id', user.id)

    return NextResponse.json({ 
      success: true,
      debug: {
        userId: user.id,
        columns: columns || columnsError,
        allResponses: allResponses?.length || 0,
        sampleResponse: allResponses?.[0] || null,
        userSurveys: userSurveys?.length || 0,
        userSurveysList: userSurveys || [],
        userResponses: userResponses?.length || 0,
        userResponsesList: userResponses || [],
        userClasses: userClasses?.length || 0,
        userClassesList: userClasses || [],
        errors: {
          columns: columnsError,
          all: allError,
          surveys: surveysError,
          userResponses: userResponsesError,
          classes: classesError
        }
      }
    })
  } catch (error) {
    console.error('Debug API Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}