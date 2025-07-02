import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const classCode = searchParams.get('classCode')
    const shareCode = searchParams.get('share')

    if (!classCode && !shareCode) {
      return NextResponse.json({ error: 'Class code or share code is required' }, { status: 400 })
    }

    // Use service role client to bypass RLS for public student access
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let surveyUserId = null

    // 공유 코드로 접근한 경우 - 설문 정보에서 직접 user_id 가져오기
    if (shareCode && shareCode.startsWith('S')) {
      const { data: surveyInfo, error: surveyError } = await supabase
        .from('surveys')
        .select('id, user_id')
        .eq('id', id)
        .eq('is_active', true)
        .single()
      
      if (surveyError || !surveyInfo) {
        console.error('Survey lookup error with share code:', surveyError)
        return NextResponse.json({ error: 'Invalid survey' }, { status: 404 })
      }
      
      surveyUserId = surveyInfo.user_id
    } else if (classCode) {
      // 학급 코드로 접근한 경우 - 학급에서 user_id 가져오기
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, user_id')
        .eq('school_code', classCode)
        .single()

      if (classError || !classData) {
        console.error('Class lookup error:', classError)
        return NextResponse.json({ error: 'Invalid class code' }, { status: 404 })
      }
      
      surveyUserId = classData.user_id
    }

    // 설문 조회 (활성 설문만, user_id 검증 포함)
    const { data: survey, error } = await supabase
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
          semester,
          unit
        )
      `)
      .eq('id', id)
      .eq('user_id', surveyUserId)
      .eq('is_active', true)
      .single()

    if (error || !survey) {
      console.error('Survey fetch error:', error)
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json(survey)
  } catch (error) {
    console.error('Error in student survey API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}