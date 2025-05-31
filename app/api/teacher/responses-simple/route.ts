import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Simple responses API - User ID:', user.id)

    // 1. 먼저 사용자의 설문 ID들을 가져온다
    const { data: userSurveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, questions, evaluation_plan_id')
      .eq('user_id', user.id)

    if (surveysError) {
      console.error('Error fetching user surveys:', surveysError)
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
    }

    console.log(`Found ${userSurveys?.length || 0} surveys for user`)

    if (!userSurveys || userSurveys.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        debug: {
          message: 'User has no surveys created yet',
          userId: user.id,
          surveyCount: 0
        }
      })
    }

    const surveyIds = userSurveys.map(s => s.id)
    console.log('Survey IDs:', surveyIds)

    // 2. 해당 설문들에 대한 응답을 가져온다
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .in('survey_id', surveyIds)
      .order('submitted_at', { ascending: false })

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
    }

    console.log(`Found ${responses?.length || 0} responses`)

    // 3. 평가 계획 정보 가져오기
    const evaluationPlanIds = userSurveys
      .filter(s => s.evaluation_plan_id)
      .map(s => s.evaluation_plan_id)

    let evaluationPlans = []
    if (evaluationPlanIds.length > 0) {
      const { data: plans } = await supabase
        .from('evaluation_plans')
        .select('*')
        .in('id', evaluationPlanIds)
      evaluationPlans = plans || []
    }

    // 4. 데이터 결합
    const formattedResponses = responses?.map(response => {
      const survey = userSurveys.find(s => s.id === response.survey_id)
      const evaluationPlan = survey?.evaluation_plan_id 
        ? evaluationPlans.find(ep => ep.id === survey.evaluation_plan_id)
        : null

      return {
        id: response.id,
        survey_id: response.survey_id,
        student_name: response.student_name,
        class_name: response.class_name,
        school_code: response.school_code,
        responses: response.responses,
        submitted_at: response.submitted_at,
        survey: survey ? {
          id: survey.id,
          title: survey.title,
          questions: survey.questions,
          evaluation_plans: evaluationPlan
        } : null
      }
    }) || []

    return NextResponse.json({ 
      success: true, 
      data: formattedResponses,
      debug: {
        userId: user.id,
        surveyCount: userSurveys.length,
        responseCount: responses?.length || 0,
        evaluationPlanCount: evaluationPlans.length,
        sampleResponse: formattedResponses[0] || null
      }
    })
  } catch (error) {
    console.error('Simple API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}