import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { evaluationPlan, apiKey } = body

    if (!evaluationPlan || !apiKey) {
      return NextResponse.json(
        { error: 'evaluationPlan and apiKey are required' }, 
        { status: 400 }
      )
    }

    // Gemini API를 통한 자기평가 설문 생성
    const prompt = `
다음 평가계획을 바탕으로 초등학생이 답변할 수 있는 자기평가 설문을 생성해주세요.

평가계획 정보:
- 과목: ${evaluationPlan.subject}
- 학년: ${evaluationPlan.grade}
- 학기: ${evaluationPlan.semester}
- 평가 내용: ${JSON.stringify(evaluationPlan.evaluations, null, 2)}

설문 생성 가이드라인:
1. 객관식 3문항 + 주관식 2문항으로 구성
2. 초등학생이 이해하기 쉬운 언어 사용
3. 자기 성찰과 학습 과정을 돌아볼 수 있는 질문
4. 학습 노력과 참여도를 평가할 수 있는 내용
5. 개인의 성장과 변화를 확인할 수 있는 질문

다음 JSON 형식으로 응답해주세요:
{
  "title": "설문 제목",
  "questions": {
    "multipleChoice": [
      {
        "question": "질문 내용",
        "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
        "guideline": "답변 가이드 (선택사항)"
      }
    ],
    "shortAnswer": [
      {
        "question": "주관식 질문 내용",
        "guideline": "답변 가이드 (선택사항)"
      }
    ]
  }
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
      if (!parsedData.title || !parsedData.questions) {
        throw new Error('Invalid survey structure')
      }

      return NextResponse.json({ 
        success: true, 
        data: parsedData,
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