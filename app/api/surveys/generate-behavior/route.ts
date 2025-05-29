import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 핵심 인성 요소 정의
const CORE_VALUES = {
  care: {
    name: '배려',
    description: '다른 사람을 생각하고 도움을 주는 마음',
    examples: ['특수반 친구 도움', '고민 상담', '궂은일 마다않기', '다른 사람 배려']
  },
  sharing: {
    name: '나눔',
    description: '함께 나누고 협력하는 마음',
    examples: ['학습 자료 공유', '간식 나누기', '재능 나눔', '봉사활동']
  },
  cooperation: {
    name: '협력',
    description: '함께 일하고 도움을 주고받기',
    examples: ['모둠 활동 참여', '학급 업무 분담', '팀 프로젝트', '공동 목표 달성']
  },
  respect: {
    name: '타인존중',
    description: '다른 사람의 의견과 감정을 존중하기',
    examples: ['의견 경청', '차이 인정', '예의 지키기', '격려와 지지']
  },
  conflict: {
    name: '갈등관리',
    description: '문제 상황을 평화롭게 해결하기',
    examples: ['중재 역할', '대화로 해결', '감정 조절', '합리적 소통']
  },
  relationship: {
    name: '관계지향성',
    description: '좋은 관계를 맺고 유지하기',
    examples: ['친구 만들기', '사교성 발휘', '유대감 형성', '소속감 증진']
  },
  rules: {
    name: '규칙준수',
    description: '약속과 규칙을 잘 지키기',
    examples: ['학급 약속 지키기', '시간 엄수', '순서 지키기', '책임감 있는 행동']
  },
  learning: {
    name: '자기주도학습',
    description: '스스로 계획하고 공부하기',
    examples: ['학습 계획 세우기', '예습 복습', '궁금증 해결', '학습 방법 개선']
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      selectedValues,
      observationContext,
      classActivities,
      specialEvents,
      grade,
      semester
    } = body

    if (!selectedValues || selectedValues.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one core value must be selected' }, 
        { status: 400 }
      )
    }

    // Get user's API key
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' }, 
        { status: 400 }
      )
    }

    // 선택된 핵심 인성 요소들의 정보 수집
    const selectedValueDetails = selectedValues.map((id: string) => CORE_VALUES[id as keyof typeof CORE_VALUES]).filter(Boolean) as Array<{name: string, description: string, examples: string[]}>

    // AI 프롬프트 생성
    const prompt = `
초등학교 행동특성 및 종합의견 작성을 위한 학생 자기평가 설문을 생성해주세요.

## 기본 정보
- 학년: ${grade || ''}
- 학기: ${semester || ''}

## 평가할 핵심 인성 요소
${selectedValueDetails.map(value => `
- **${value.name}**: ${value.description}
  예시 행동: ${value.examples.join(', ')}
`).join('')}

## 관찰 맥락
- 주요 관찰 상황: ${observationContext || '일반적인 학교생활 상황'}
- 주요 학급 활동: ${classActivities || ''}
- 특별한 사건/프로그램: ${specialEvents || ''}

## 설문 생성 가이드라인
1. **목적**: NEIS 행동특성 및 종합의견 작성을 위한 구체적 자료 수집
2. **대상**: 초등학생 (${grade || '전학년'})
3. **구성**: 객관식 4-6문항 + 주관식 3-4문항
4. **핵심**: 선택된 인성 요소별로 구체적인 행동 사례를 파악할 수 있는 질문

## 질문 생성 원칙
- 학생이 자신의 구체적인 행동을 돌아볼 수 있는 질문
- 교사가 행동특성 및 종합의견 작성 시 활용할 수 있는 구체적 정보 수집
- 핵심 인성 요소와 직접 연결되는 상황별 질문
- 초등학생이 이해하기 쉬운 언어 사용
- 학생의 성장과 변화를 확인할 수 있는 성찰적 질문

## NEIS 행동특성 작성 기준 반영
- 객관적 근거와 구체적 행동 사례 수집
- 인성 요소를 괄호 안에 명시할 수 있는 정보 확보
- 추상적 표현이 아닌 구체적 상황과 행동 파악
- 학생의 잠재력, 인성, 자기주도적 능력 등을 종합적으로 이해할 수 있는 질문

다음 JSON 형식으로 응답해주세요:
{
  "title": "설문 제목 (예: OO학년 O학기 행동발달 자기평가)",
  "description": "설문 설명 (목적과 작성 방법 안내)",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "coreValue": "해당하는 핵심 인성 요소 ID",
      "guideline": "답변 가이드 (선택사항)"
    },
    {
      "type": "short_answer", 
      "question": "주관식 질문 내용",
      "coreValue": "해당하는 핵심 인성 요소 ID",
      "guideline": "답변 가이드 (구체적 사례 작성 요청)"
    }
  ]
}

주의사항:
- 모든 질문은 선택된 핵심 인성 요소와 연관되어야 함
- 학생이 구체적인 행동 사례를 떠올릴 수 있는 상황별 질문 구성
- 주관식 질문은 반드시 구체적인 경험과 사례를 요구
- 객관식은 행동 빈도나 정도를 측정할 수 있도록 구성
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
        { success: false, error: 'Failed to generate behavior survey' }, 
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from AI' }, 
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

      // 핵심 인성 요소가 포함되었는지 검증
      const questionsWithValues = parsedData.questions.filter((q: any) => 
        selectedValues.includes(q.coreValue)
      )

      if (questionsWithValues.length === 0) {
        console.warn('No questions found with selected core values')
      }

      return NextResponse.json({ 
        success: true, 
        data: parsedData,
        selectedValues: selectedValueDetails,
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
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}