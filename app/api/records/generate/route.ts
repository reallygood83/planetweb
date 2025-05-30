import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// NEIS 생기부 작성 규칙
const NEIS_RULES = {
  maxLength: 500,
  excludeStudentName: true,
  endingStyle: 'noun', // 명사형 종결
  format: {
    교과학습발달상황: {
      description: '교과별 성취기준에 따른 학습 발달 상황',
      example: '분수의 덧셈과 뺄셈 단원에서 통분의 원리를 정확히 이해하고 다양한 문제 상황에 적용하는 능력이 뛰어남'
    },
    창의적체험활동: {
      description: '자율·동아리·봉사·진로활동 관련 누가 기록',
      example: '학급 환경미화 활동에 적극적으로 참여하며 창의적인 아이디어를 제시함'
    },
    행동특성및종합의견: {
      description: '인성, 태도, 학습 습관 등 종합적인 관찰 내용',
      example: '(배려) 특수반 친구를 도와주고 스스럼없이 친구로 지내면서 학습활동을 도와주었으며, 학급 친구들의 고민을 해결해 주는 등 또래 상담자로 주 2회 활동함',
      coreValues: ['배려', '나눔', '협력', '타인존중', '갈등관리', '관계지향성', '규칙준수', '자기주도학습']
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Supabase 연결 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.log('Supabase not configured for record generation')
      return NextResponse.json({ 
        success: false, 
        error: 'Database not configured. Please set up Supabase connection.' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('No authenticated user for record generation')
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      responseId,
      recordType = '교과학습발달상황',
      teacherNotes = '',
      includeEvaluationCriteria = true
    } = body

    // 응답 데이터 조회
    const { data: responseData, error: responseError } = await supabase
      .from('survey_responses')
      .select(`
        *,
        surveys!inner (
          title,
          questions,
          evaluation_plans (
            subject,
            grade,
            semester,
            unit,
            achievement_standards,
            evaluation_criteria,
            learning_objectives
          )
        )
      `)
      .eq('id', responseId)
      .single()

    if (responseError || !responseData) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    // 학생의 평가 결과 조회 (있는 경우)
    let evaluationResults: any[] = []
    if (responseData.student_name && responseData.class_name) {
      const { data: evalResults } = await supabase
        .from('student_evaluation_results')
        .select(`
          evaluation_name,
          result,
          result_criteria,
          teacher_notes,
          evaluation_date
        `)
        .eq('student_name', responseData.student_name)
        .eq('class_name', responseData.class_name)
        .eq('user_id', user.id)
        .order('evaluation_date', { ascending: false })

      if (evalResults) {
        evaluationResults = evalResults
      }
    }

    // 사용자의 API 키 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('api_key_hint, encrypted_api_key')
      .eq('id', user.id)
      .single()

    // 사용자 API 키가 있으면 사용, 없으면 환경 변수 사용
    let apiKey = ''
    if (profile?.encrypted_api_key) {
      // 암호화된 API 키를 복호화
      try {
        const { decryptApiKey } = await import('@/lib/utils')
        const encryptKey = process.env.ENCRYPT_KEY || 'default-key'
        apiKey = decryptApiKey(profile.encrypted_api_key, encryptKey)
      } catch (decryptError) {
        console.error('Failed to decrypt user API key:', decryptError)
        apiKey = process.env.GEMINI_API_KEY || ''
      }
    } else {
      apiKey = process.env.GEMINI_API_KEY || ''
    }

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'API key not configured. Please set your API key in the dashboard.' 
      }, { status: 400 })
    }

    // API 키 형식 검증
    if (!apiKey.startsWith('AIza')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid API key format. Please check your Gemini API key.' 
      }, { status: 400 })
    }

    // 프롬프트 생성
    const prompt = createRecordPrompt({
      recordType,
      responseData,
      teacherNotes,
      includeEvaluationCriteria,
      neisRules: NEIS_RULES,
      evaluationResults
    })

    // Gemini API 호출
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
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate record' }, 
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

    const generatedText = geminiData.candidates[0].content.parts[0].text

    // NEIS 규정 검증
    const validation = validateNEISCompliance(generatedText, responseData.student_name)

    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Generated content does not comply with NEIS rules',
        details: validation.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        content: generatedText,
        validation: validation,
        characterCount: generatedText.length
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 생기부 생성 프롬프트
function createRecordPrompt({
  recordType,
  responseData,
  teacherNotes,
  includeEvaluationCriteria,
  neisRules,
  evaluationResults = [] as any[]
}: any) {
  const evaluation = responseData.surveys.evaluation_plans
  const responses = responseData.responses
  const questions = responseData.surveys.questions
  const survey = responseData.surveys

  // 행동특성 및 종합의견인 경우 특별한 프롬프트 사용
  if (recordType === '행동특성 및 종합의견') {
    return createBehaviorRecordPrompt({
      responseData,
      teacherNotes,
      neisRules,
      survey
    })
  }

  // 평가 결과 분석 (있는 경우)
  let evaluationResultsAnalysis = ''
  if (evaluationResults && evaluationResults.length > 0) {
    const excellentResults = evaluationResults.filter((r: any) => r.result === '매우잘함')
    const goodResults = evaluationResults.filter((r: any) => r.result === '잘함')
    const averageResults = evaluationResults.filter((r: any) => r.result === '보통')
    const needsImprovementResults = evaluationResults.filter((r: any) => r.result === '노력요함')
    
    evaluationResultsAnalysis = `
[평가 결과 분석]
${excellentResults.length > 0 ? `우수 성취 영역: ${excellentResults.map((r: any) => `${r.evaluation_name}(${r.result_criteria || '탁월한 성취'})`).join(', ')}` : ''}
${goodResults.length > 0 ? `목표 달성 영역: ${goodResults.map((r: any) => `${r.evaluation_name}(${r.result_criteria || '우수한 성취'})`).join(', ')}` : ''}
${averageResults.length > 0 ? `발전 중인 영역: ${averageResults.map((r: any) => `${r.evaluation_name}(${r.result_criteria || '꾸준한 성장'})`).join(', ')}` : ''}
${needsImprovementResults.length > 0 ? `성장 잠재 영역: ${needsImprovementResults.map((r: any) => `${r.evaluation_name}(${r.result_criteria || '지속적 노력 필요'})`).join(', ')}` : ''}
`
  }

  return `
당신은 초등학교 교사입니다. 학생의 자기평가 응답과 교사의 관찰 내용을 바탕으로 NEIS 생활기록부 ${recordType}을 작성해주세요.

[필수 규칙]
1. 학생 이름을 절대 포함하지 마세요
2. 모든 문장은 명사형으로 종결하세요 (예: ~함, ~임, ~됨)
3. 최대 ${neisRules.maxLength}자 이내로 작성하세요
4. 구체적이고 객관적인 사실 위주로 서술하세요
5. 긍정적인 표현을 사용하되 과장하지 마세요

[교과 정보]
- 과목: ${evaluation?.subject}
- 학년: ${evaluation?.grade}
- 학기: ${evaluation?.semester}
- 단원: ${evaluation?.unit}

[성취기준]
${evaluation?.achievement_standards?.map((std: any) => 
  `- ${std.code}: ${std.content}`
).join('\n')}

${includeEvaluationCriteria ? `
[평가기준]
- 매우잘함: ${evaluation?.evaluation_criteria?.excellent?.description}
- 잘함: ${evaluation?.evaluation_criteria?.good?.description}
- 보통: ${evaluation?.evaluation_criteria?.satisfactory?.description}
- 노력요함: ${evaluation?.evaluation_criteria?.needs_improvement?.description}
` : ''}

${evaluationResultsAnalysis}

[학생 자기평가 응답]
${questions?.multipleChoice?.map((q: any, idx: number) => 
  `Q${idx + 1}. ${q.question}
A: ${responses.multipleChoice[idx] || '응답 없음'}`
).join('\n\n')}

${questions?.shortAnswer?.map((q: any, idx: number) => 
  `Q${idx + 1}. ${q.question}
A: ${responses.shortAnswer[idx] || '응답 없음'}`
).join('\n\n')}

${teacherNotes ? `
[교사 관찰 내용]
${teacherNotes}
` : ''}

[작성 지침 - 긍정적 성장 중심]
1. 평가 결과에 따른 서술:
   - 매우잘함/잘함: 구체적인 평가기준을 인용하여 학생의 우수한 성취를 기술
   - 보통: 현재 수준과 발전 가능성을 균형있게 표현
   - 노력요함: "~하려는 노력을 보임", "점차 향상되고 있음" 등 발전적 표현 사용

2. 부정적 표현 금지:
   - "못함", "미흡함" → "노력 중", "관심을 가지기 시작함"
   - "부족함" → "추가적인 연습으로 향상 가능함"
   - 모든 수준의 학생에게 성장 가능성과 긍정적 측면 포함

3. 구체적 근거 제시:
   - 학생의 자기평가 응답에서 긍정적 태도나 노력의 흔적 찾기
   - 작은 진전이나 개선도 의미있게 포함

[작성 예시]
${neisRules.format[recordType].example}

위 정보를 종합하여 ${recordType} 기록을 작성해주세요. 
학생의 강점을 부각하고 성장 가능성을 제시하며, 모든 학생이 자신감을 가질 수 있는 내용으로 작성하세요.
`
}

// 행동특성 및 종합의견 전용 프롬프트
function createBehaviorRecordPrompt({
  responseData,
  teacherNotes,
  neisRules,
  survey
}: any) {
  const responses = responseData.responses
  const questions = responseData.surveys.questions
  const behaviorCriteria = survey.behavior_criteria

  return `
당신은 초등학교 교사입니다. 학생의 행동발달 자기평가 응답을 바탕으로 NEIS 생활기록부 "행동특성 및 종합의견"을 작성해주세요.

[필수 규칙]
1. 학생 이름을 절대 포함하지 마세요
2. 모든 문장은 명사형으로 종결하세요 (예: ~함, ~임, ~됨)
3. 최대 ${neisRules.maxLength}자 이내로 작성하세요
4. 핵심 인성 요소를 괄호 안에 명시하세요 (예: (배려), (협력), (타인존중))
5. 구체적이고 객관적인 행동 사례 위주로 서술하세요
6. 추상적 표현("착한 학생", "성실한 학생") 사용 금지
7. 모든 학생의 긍정적 측면과 성장 가능성을 포함하세요

[핵심 인성 요소]
${NEIS_RULES.format.행동특성및종합의견.coreValues.map(value => `- ${value}`).join('\n')}

[관찰 맥락]
${behaviorCriteria ? `
- 주요 관찰 상황: ${behaviorCriteria.observationContext || ''}
- 주요 학급 활동: ${behaviorCriteria.classActivities || ''}
- 특별한 사건/프로그램: ${behaviorCriteria.specialEvents || ''}
- 선택된 핵심 인성 요소: ${behaviorCriteria.selectedValues?.map((id: string) => {
  const valueMap: any = {
    care: '배려', sharing: '나눔', cooperation: '협력', respect: '타인존중',
    conflict: '갈등관리', relationship: '관계지향성', rules: '규칙준수', learning: '자기주도학습'
  }
  return valueMap[id] || id
}).join(', ') || ''}
` : ''}

[학생 자기평가 응답]
${Array.isArray(questions) ? questions.map((q: any, idx: number) => {
  const answer = q.type === 'multiple_choice' 
    ? responses.multipleChoice?.[idx] || '응답 없음'
    : responses.shortAnswer?.[idx] || '응답 없음'
  
  return `Q${idx + 1}. ${q.question}
${q.coreValue ? `[${q.coreValue} 관련]` : ''}
A: ${answer}`
}).join('\n\n') : '응답 정보가 없습니다.'}

${teacherNotes ? `
[교사 관찰 내용]
${teacherNotes}
` : ''}

[작성 가이드 - 긍정적 성장 중심]
1. 학생의 응답에서 구체적인 행동 사례를 추출하세요
2. 해당하는 핵심 인성 요소를 괄호로 명시하세요
3. 학생의 잠재력, 인성, 자기주도적 능력이 드러나도록 작성하세요
4. 변화와 성장 가능성을 함께 언급하세요

5. **긍정적 표현 원칙:**
   - 문제 행동 → "~하려는 노력을 보임", "점차 개선되고 있음"
   - 소극적 태도 → "점차 적극적으로 변화하고 있음", "자신감을 키워가고 있음"
   - 미흡한 부분 → "~에 대한 관심이 생기기 시작함", "지속적인 노력을 보임"
   - 모든 학생에게서 최소 2개 이상의 긍정적 특성 발견

6. **성장 가능성 표현:**
   - "앞으로 ~할 것으로 기대됨"
   - "~하는 모습이 점차 늘어나고 있음"
   - "~에 대한 잠재력을 보이고 있음"
   - "지속적인 성장이 관찰됨"

[작성 예시]
${neisRules.format.행동특성및종합의견.example}

위 정보를 종합하여 학생의 행동특성 및 종합의견을 작성해주세요.
모든 학생이 자신의 가치를 인정받고 성장 가능성을 확인받을 수 있도록, 
구체적이면서도 따뜻한 시선으로 작성하되, 학생 이름은 절대 포함하지 마세요.
`
}

// NEIS 규정 준수 검증
function validateNEISCompliance(text: string, studentName: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 1. 학생 이름 포함 여부 확인
  if (text.includes(studentName)) {
    errors.push('학생 이름이 포함되어 있습니다')
  }

  // 2. 글자 수 확인
  if (text.length > NEIS_RULES.maxLength) {
    errors.push(`${NEIS_RULES.maxLength}자를 초과했습니다 (현재: ${text.length}자)`)
  }

  // 3. 명사형 종결 확인
  const sentences = text.split(/[.;]/).filter(s => s.trim())
  const invalidEndings = sentences.filter(sentence => {
    const trimmed = sentence.trim()
    if (!trimmed) return false
    
    // 명사형 종결어미 패턴
    const validEndings = ['함', '임', '됨', '함.', '임.', '됨.', '있음', '있음.', '없음', '없음.']
    return !validEndings.some(ending => trimmed.endsWith(ending))
  })

  if (invalidEndings.length > 0) {
    errors.push('명사형 종결어미를 사용하지 않은 문장이 있습니다')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}