import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, apiKey } = body

    if (!text || !apiKey) {
      return NextResponse.json(
        { error: 'text and apiKey are required' }, 
        { status: 400 }
      )
    }

    // Gemini API 호출
    const prompt = `
다음 평가계획서 텍스트를 분석하여 구조화된 JSON 형태로 변환해주세요.

분석할 텍스트:
${text}

다음 형식으로 응답해주세요:
{
  "subject": "과목명",
  "grade": "학년",
  "semester": "학기",
  "evaluations": [
    {
      "evaluationName": "평가명",
      "unitName": "단원명 (선택)",
      "achievementStandards": ["성취기준1", "성취기준2"],
      "evaluationCriteria": {
        "excellent": "우수 기준",
        "good": "양호 기준", 
        "average": "보통 기준",
        "needsImprovement": "미흡 기준"
      },
      "evaluationMethod": "평가방법",
      "evaluationPeriod": "평가시기"
    }
  ]
}

주의사항:
- 텍스트에서 명확하게 파악되지 않는 정보는 빈 문자열이나 빈 배열로 처리
- 평가 기준이 4단계가 아닌 경우 가능한 범위 내에서 매핑
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
            temperature: 0.3,
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
        { error: 'Failed to analyze evaluation plan' }, 
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
      // AI 응답에서 JSON 부분만 추출 (```json 태그 제거)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse.match(/\{[\s\S]*\}/)
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0])
      
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