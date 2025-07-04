import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      const rawBody = await request.text()
      console.log('Raw request body:', rawBody)
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Body parsing error:', parseError)
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    console.log('Survey generate request body:', JSON.stringify(body, null, 2))
    
    // 두 가지 형식의 요청 처리
    let subject, grade, semester, unit, learningObjectives, achievementStandards, evaluationCriteria
    
    if (body.evaluationPlan) {
      // 평가계획 모달에서 온 요청
      const plan = body.evaluationPlan
      subject = plan.subject
      grade = plan.grade
      semester = plan.semester
      unit = plan.unit
      learningObjectives = plan.learning_objectives?.join('\n') || ''
      achievementStandards = plan.achievement_standards?.map((std: any) => 
        `${std.code ? `[${std.code}] ` : ''}${std.content}`
      ).join('\n') || ''
      evaluationCriteria = JSON.stringify(plan.evaluation_criteria) || ''
    } else {
      // 직접 입력 페이지에서 온 요청
      subject = body.subject
      grade = body.grade
      semester = body.semester
      unit = body.unit
      learningObjectives = body.learningObjectives
      achievementStandards = body.achievementStandards
      evaluationCriteria = body.evaluationCriteria
    }

    console.log('Extracted values:', { 
      subject: `"${subject}"`, 
      grade: `"${grade}"`, 
      unit: `"${unit}"`,
      subjectType: typeof subject,
      gradeType: typeof grade,
      unitType: typeof unit
    })

    // 값이 빈 문자열인지도 체크
    const isSubjectValid = subject && subject.trim() !== ''
    const isGradeValid = grade && grade.trim() !== ''
    const isUnitValid = unit && unit.trim() !== ''

    if (!isSubjectValid || !isGradeValid || !isUnitValid) {
      console.log('Validation failed:', { 
        subject: { value: subject, valid: isSubjectValid },
        grade: { value: grade, valid: isGradeValid },
        unit: { value: unit, valid: isUnitValid }
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'subject, grade, and unit are required',
          details: {
            subject: isSubjectValid ? 'valid' : 'invalid',
            grade: isGradeValid ? 'valid' : 'invalid', 
            unit: isUnitValid ? 'valid' : 'invalid'
          }
        }, 
        { status: 400 }
      )
    }

    // API 키 처리
    let apiKey = ''
    
    // 클라이언트에서 직접 전송한 API 키가 있는 경우
    if (body.apiKey) {
      console.log('Using API key from request body')
      apiKey = body.apiKey
      console.log('API key from client:', apiKey.substring(0, 10) + '...')
    } else {
      // 사용자의 API 키 조회
      console.log('Fetching user profile for API key...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('api_key_hint, encrypted_api_key')
        .eq('id', user.id)
        .single()

      console.log('Profile fetch result:', { profile: profile ? { has_hint: !!profile.api_key_hint, has_encrypted: !!profile.encrypted_api_key } : null, profileError })

      // 사용자 API 키가 있으면 사용, 없으면 환경 변수 사용
      if (profile?.encrypted_api_key) {
        // 암호화된 API 키를 복호화
        try {
          const { decryptApiKey } = await import('@/lib/utils')
          const encryptKey = process.env.ENCRYPT_KEY || 'default-key'
          apiKey = decryptApiKey(profile.encrypted_api_key, encryptKey)
          console.log('Using user API key (decrypted):', `${apiKey.substring(0, 10)}...`)
        } catch (decryptError) {
          console.log('Failed to decrypt user API key:', decryptError)
          apiKey = process.env.GEMINI_API_KEY || ''
          console.log('Fallback to environment API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET')
        }
      } else {
        apiKey = process.env.GEMINI_API_KEY || ''
        console.log('Using environment API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET')
      }
    }

    if (!apiKey) {
      console.log('No API key available')
      return NextResponse.json(
        { success: false, error: 'API key not configured. Please set your API key in the dashboard.' }, 
        { status: 400 }
      )
    }

    // API 키 형식 검증
    if (!apiKey.startsWith('AIza')) {
      console.log('Invalid API key format:', apiKey.substring(0, 10))
      return NextResponse.json(
        { success: false, error: 'Invalid API key format. Please check your Gemini API key.' }, 
        { status: 400 }
      )
    }

    console.log('API key validated, length:', apiKey.length)

    // Gemini API를 통한 자기평가 설문 생성
    const prompt = `
다음 평가계획을 바탕으로 초등학생이 답변할 수 있는 자기평가 설문을 생성해주세요.

평가계획 정보:
- 과목: ${subject}
- 학년: ${grade}
- 학기: ${semester}
- 단원: ${unit}
- 학습목표: ${learningObjectives || ''}
- 성취기준: ${achievementStandards || ''}
- 평가기준: ${evaluationCriteria || ''}

설문 생성 가이드라인:
1. 객관식 3문항 + 주관식 2문항으로 구성
2. 초등학생이 이해하기 쉬운 언어 사용
3. 자기 성찰과 학습 과정을 돌아볼 수 있는 질문
4. 학습 노력과 참여도를 평가할 수 있는 내용
5. 개인의 성장과 변화를 확인할 수 있는 질문

다음 JSON 형식으로 응답해주세요:
{
  "title": "설문 제목",
  "description": "설문 설명",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"]
    },
    {
      "type": "short_answer", 
      "question": "주관식 질문 내용"
    }
  ]
}

주의사항:
- 질문은 학생의 자기평가와 성찰을 돕는 내용이어야 함
- 객관식은 4지선다로 구성
- 주관식은 학생이 자유롭게 표현할 수 있도록 구성
- 평가계획의 성취기준과 연관된 내용으로 구성
- 응답은 반드시 유효한 JSON 형식이어야 함
`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate survey questions' }, 
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json(
        { error: 'Invalid response from AI' }, 
        { status: 500 }
      )
    }

    const aiResponse = geminiData.candidates[0].content.parts[0].text

    // JSON 파싱 시도
    try {
      // AI 응답에서 JSON 부분만 추출
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse.match(/\{[\s\S]*\}/)
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0])
      
      // 기본 구조 검증
      if (!parsedData.title || !parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid survey structure')
      }

      // AI 응답을 프론트엔드가 기대하는 형식으로 변환
      const transformedData = {
        title: parsedData.title,
        description: parsedData.description || '',
        questions: {
          multipleChoice: parsedData.questions
            .filter((q: any) => q.type === 'multiple_choice')
            .map((q: any) => ({
              question: q.question,
              options: q.options || [],
              guideline: q.guideline
            })),
          shortAnswer: parsedData.questions
            .filter((q: any) => q.type === 'short_answer')
            .map((q: any) => ({
              question: q.question,
              guideline: q.guideline
            }))
        }
      }

      console.log('Transformed survey data:', JSON.stringify(transformedData, null, 2))

      return NextResponse.json({ 
        success: true, 
        data: transformedData,
        rawResponse: aiResponse 
      })
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse AI response',
        rawResponse: aiResponse 
      })
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}