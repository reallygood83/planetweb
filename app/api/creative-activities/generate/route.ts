import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: authError?.message 
      }, { status: 401 })
    }

    const body = await request.json()
    console.log('Generate request body:', body)
    
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
        error: 'Missing required fields',
        details: {
          classId: !!classId,
          studentName: !!studentName,
          semester: !!semester,
          selectedActivityIds: selectedActivityIds?.length || 0
        }
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
    let geminiApiKey = apiKey
    
    // 사용자가 제공한 API 키가 없으면 환경 변수 사용
    if (!geminiApiKey) {
      // 사용자 프로필에서 암호화된 API 키 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('encrypted_api_key')
        .eq('id', user.id)
        .single()
      
      if (profile?.encrypted_api_key) {
        try {
          const { decryptApiKey } = await import('@/lib/utils')
          const encryptKey = process.env.NEXT_PUBLIC_ENCRYPT_KEY || 'default-key'
          geminiApiKey = decryptApiKey(profile.encrypted_api_key, encryptKey)
        } catch (decryptError) {
          console.error('Failed to decrypt API key:', decryptError)
        }
      }
      
      // 그래도 없으면 환경 변수 사용
      if (!geminiApiKey) {
        geminiApiKey = process.env.GEMINI_API_KEY
      }
    }
    
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
        error: 'Failed to generate content',
        details: errorData,
        status: geminiResponse.status
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
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    }, { status: 500 })
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
    .map(([area, areaActivities]) => {
      const activityList = (areaActivities as any[])
        .map((a) => `- ${new Date(a.activity_date).toLocaleDateString('ko-KR')}: ${a.activity_name}`)
        .join('\n')
      return `[${area}]\n${activityList}`
    })
    .join('\n\n')

  return `당신은 초등학교 교사입니다. 학생의 창의적 체험활동 누가기록을 작성해주세요.

[작성 지침]
1. 학생 이름(${studentName})을 절대 포함하지 마세요
2. 모든 문장은 명사형으로 종결하세요 (예: ~함, ~임, ~됨)
3. **반드시 200자 이내로 작성하세요** (공백 포함)
4. 핵심적인 활동과 성장만 간결하게 서술하세요
5. 영역별로 구분하지 말고 하나의 통합된 문단으로 작성하세요
6. 가장 인상적인 행동과 성장 위주로 압축하여 서술하세요
7. 불필요한 수식어는 제거하고 핵심만 담으세요

[참여 활동]
${activitiesDescription}

${teacherNotes ? `[교사 관찰 내용]\n${teacherNotes}` : ''}

[작성 예시 - 200자]
봄 현장체험학습(4.15.)에서 모둠 활동 시 지도를 정확히 읽고 친구들을 이끄는 리더십을 발휘함. 환경보호 캠페인(5.20.)에서는 창의적인 포스터를 제작하고 저학년에게 분리수거를 안내함. 코딩 동아리 활동 중 어려움을 꾸준한 노력으로 극복하여 게임을 완성함. 협력적이고 도전적인 자세가 돋보임.

위 정보를 바탕으로 창의적 체험활동 누가기록을 작성해주세요.
반드시 200자 이내로 핵심만 간결하게 작성하고, 학생 이름은 절대 포함하지 마세요.`
}