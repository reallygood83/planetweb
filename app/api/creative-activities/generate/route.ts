import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      classId,
      studentName,
      semester,
      selectedActivityIds,
      teacherNotes = '',
      apiKey
    } = body

    // 필수 필드 검증
    if (!classId || !studentName || !semester || !selectedActivityIds || selectedActivityIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // 선택된 활동 정보 조회
    const { data: activities, error: activitiesError } = await supabase
      .from('creative_activities')
      .select('*')
      .in('id', selectedActivityIds)
      .eq('user_id', user.id)
      .order('order_number', { ascending: true })

    if (activitiesError || !activities || activities.length === 0) {
      return NextResponse.json({ 
        error: 'Selected activities not found' 
      }, { status: 404 })
    }

    // API 키 확인
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json({ 
        error: 'API key not configured' 
      }, { status: 400 })
    }

    // 프롬프트 생성
    const prompt = createCreativeActivityPrompt({
      studentName,
      activities,
      teacherNotes
    })

    // Gemini API 호출
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API Error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to generate content' 
      }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    const generatedContent = geminiData.candidates[0]?.content?.parts?.[0]?.text || ''

    // 생성 기록 저장
    const { data: record, error: recordError } = await supabase
      .from('creative_activity_records')
      .upsert({
        user_id: user.id,
        class_id: classId,
        student_name: studentName,
        semester,
        selected_activity_ids: selectedActivityIds,
        generated_content: generatedContent,
        teacher_notes: teacherNotes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'class_id,student_name,semester'
      })
      .select()
      .single()

    if (recordError) {
      console.error('Error saving record:', recordError)
      return NextResponse.json({ 
        error: 'Failed to save generated content' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        content: generatedContent,
        recordId: record.id,
        characterCount: generatedContent.length
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function createCreativeActivityPrompt({
  studentName,
  activities,
  teacherNotes
}: {
  studentName: string
  activities: any[]
  teacherNotes: string
}) {
  // 활동을 영역별로 그룹화
  const activitiesByArea = activities.reduce((acc, activity) => {
    if (!acc[activity.activity_area]) {
      acc[activity.activity_area] = []
    }
    acc[activity.activity_area].push(activity)
    return acc
  }, {} as Record<string, any[]>)

  const activitiesDescription = Object.entries(activitiesByArea)
    .map(([area, areaActivities]: [string, any[]]) => {
      const activityList = areaActivities
        .map((a: any) => `- ${new Date(a.activity_date).toLocaleDateString('ko-KR')}: ${a.activity_name}`)
        .join('\n')
      return `[${area}]\n${activityList}`
    })
    .join('\n\n')

  return `당신은 초등학교 교사입니다. 학생의 창의적 체험활동 누가기록을 작성해주세요.

[작성 지침]
1. 학생 이름(${studentName})을 절대 포함하지 마세요
2. 모든 문장은 명사형으로 종결하세요 (예: ~함, ~임, ~됨)
3. 총 500자 이내로 작성하세요
4. 각 활동에서 학생이 보인 구체적 행동과 성장을 중심으로 서술하세요
5. 영역별로 구분하지 말고 하나의 통합된 문단으로 작성하세요
6. 구체적이고 관찰 가능한 행동 위주로 서술하세요
7. 학생의 긍정적 변화와 성장 가능성을 포함하세요

[참여 활동]
${activitiesDescription}

${teacherNotes ? `[교사 관찰 내용]\n${teacherNotes}` : ''}

[작성 예시]
학급 봄 현장체험학습(2024.4.15.)에서 모둠원들과 협력하여 미션을 수행하며 리더십을 발휘함. 특히 길 찾기 활동에서 지도를 정확히 읽고 친구들에게 설명하는 모습이 인상적이었음. 환경보호 캠페인(2024.5.20.) 자율활동에 적극 참여하여 창의적인 포스터를 제작하고, 저학년 학생들에게 분리수거 방법을 친절하게 안내함. 코딩 동아리(연중) 활동에서는 처음에는 어려워했으나 꾸준한 연습으로 간단한 게임을 완성하는 성과를 거둠. 전반적으로 타인을 배려하고 협력하는 태도가 돋보이며, 새로운 도전에도 긍정적으로 임하는 모습을 보임.

위 정보를 바탕으로 창의적 체험활동 누가기록을 작성해주세요.
학생의 활동 참여 모습과 성장 과정이 잘 드러나도록 구체적으로 서술하되, 
절대 학생 이름은 포함하지 마세요.`
}