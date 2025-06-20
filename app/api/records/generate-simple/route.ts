import { NextRequest, NextResponse } from 'next/server'

// NEIS 생기부 작성 규칙
const NEIS_RULES = {
  maxLength: 500,
  excludeStudentName: true,
  endingStyle: 'noun', // 명사형 종결
  prohibitedWords: ['뛰어난', '탁월한', '우수한', '최고의', '완벽한', '훌륭한']
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      studentName = '학생',
      className = '',
      recordType = '교과학습발달상황',
      subject = '',
      teacherNotes = '',
      additionalContext = '',
      evaluationResults = [],
      evaluationPlan = null,
      evaluationPlans = [],
      studentResponse = null,
      observationRecords = [],
      useObservationRecords = false
    } = body

    // 관찰 데이터 검증 - 교사 메모 또는 관찰 기록 중 하나는 있어야 함
    const hasTeacherNotes = teacherNotes && teacherNotes.trim() !== ''
    const hasObservationData = useObservationRecords && observationRecords && observationRecords.length > 0
    
    if (!hasTeacherNotes && !hasObservationData) {
      return NextResponse.json({ 
        success: false, 
        error: '교사 관찰 기록을 입력하거나 관찰 기록을 선택해주세요.' 
      }, { status: 400 })
    }

    if (recordType === '교과학습발달상황' && !subject) {
      return NextResponse.json({ 
        success: false, 
        error: '교과학습발달상황 작성 시 과목을 선택해주세요.' 
      }, { status: 400 })
    }

    // API 키 확인 (환경변수 또는 요청에서)
    const apiKey = process.env.GEMINI_API_KEY || body.apiKey
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'API 키가 설정되지 않았습니다. 설정에서 API 키를 등록해주세요.' 
      }, { status: 400 })
    }

    // 프롬프트 생성
    const prompt = createSimplePrompt({
      recordType,
      subject,
      teacherNotes,
      additionalContext,
      className,
      evaluationResults,
      evaluationPlan,
      evaluationPlans,
      studentResponse,
      observationRecords,
      useObservationRecords
    })

    // 디버깅: 받은 데이터 로깅
    console.log('=== 생기부 생성 요청 데이터 ===')
    console.log('평가 계획 개수:', evaluationPlans?.length || 0)
    console.log('학생 자기평가:', studentResponse ? '있음' : '없음')
    console.log('평가 결과 개수:', evaluationResults?.length || 0)
    console.log('관찰 기록 개수:', observationRecords?.length || 0)
    
    if (evaluationPlans?.length > 0) {
      console.log('평가 계획 상세:')
      evaluationPlans.forEach((plan: any, idx: number) => {
        console.log(`  [${idx + 1}] ${plan.subject} - ${plan.unit}`)
        console.log(`      성취기준: ${plan.achievement_standards?.join(', ') || '없음'}`)
        console.log(`      평가기준: ${plan.evaluation_criteria || '없음'}`)
      })
    }
    
    if (studentResponse) {
      console.log('학생 자기평가 응답:')
      console.log('  객관식:', studentResponse.responses?.multipleChoice?.length || 0, '개')
      console.log('  주관식:', studentResponse.responses?.shortAnswer?.length || 0, '개')
    }

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
      return NextResponse.json({
        success: false,
        error: 'AI 생성 중 오류가 발생했습니다. API 키를 확인해주세요.'
      }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({
        success: false,
        error: 'AI가 적절한 응답을 생성하지 못했습니다.'
      }, { status: 500 })
    }

    const generatedText = geminiData.candidates[0].content.parts[0].text.trim()
    
    // NEIS 규정 검증
    const validation = validateNeisCompliance(generatedText)
    
    return NextResponse.json({
      success: true,
      content: generatedText,
      validation,
      metadata: {
        studentName,
        className,
        recordType,
        subject,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

function createSimplePrompt({ recordType, subject, teacherNotes, additionalContext, className, evaluationResults, evaluationPlan, evaluationPlans, studentResponse, observationRecords, useObservationRecords }: any) {
  // 평가 계획 정보 (단일 또는 복수)
  let evaluationPlanInfo = ''
  const plansList = evaluationPlans && evaluationPlans.length > 0 ? evaluationPlans : (evaluationPlan ? [evaluationPlan] : [])
  
  if (plansList.length > 0) {
    evaluationPlanInfo = `
**평가 계획 정보:**
${plansList.map((plan: any, idx: number) => `
[평가계획 ${idx + 1}]
- 과목: ${plan.subject || ''}
- 학년: ${plan.grade || ''}
- 단원: ${plan.unit || ''}
- 학습목표: ${plan.learning_objectives?.join(', ') || ''}
- 성취기준: ${plan.achievement_standards?.join(', ') || ''}
- 평가기준: ${plan.evaluation_criteria || ''}
`).join('\n')}
`
  }

  // 평가 결과 요약 - 발전적이고 긍정적인 관점으로 재구성
  let evaluationSummary = ''
  if (evaluationResults && evaluationResults.length > 0) {
    const excellentCount = evaluationResults.filter((r: any) => r.result === '매우잘함').length
    const goodCount = evaluationResults.filter((r: any) => r.result === '잘함').length
    const averageCount = evaluationResults.filter((r: any) => r.result === '보통').length
    const needsImprovementCount = evaluationResults.filter((r: any) => r.result === '노력요함').length
    
    // 각 수준별 평가 그룹화
    const excellentAchievements = evaluationResults.filter((r: any) => r.result === '매우잘함')
    const goodAchievements = evaluationResults.filter((r: any) => r.result === '잘함')
    const averageAchievements = evaluationResults.filter((r: any) => r.result === '보통')
    const improvementAreas = evaluationResults.filter((r: any) => r.result === '노력요함')
    
    evaluationSummary = `
**평가 결과 분석:**

**탁월한 성취를 보인 영역:** (매우잘함 ${excellentCount}개)
${excellentAchievements.map((r: any) => 
  `- ${r.evaluation_name}: ${r.result_criteria || '해당 영역에서 기대 수준을 뛰어넘는 탁월한 성취를 보임'}`
).join('\n') || '- 해당 없음'}

**우수한 성취를 보인 영역:** (잘함 ${goodCount}개)
${goodAchievements.map((r: any) => 
  `- ${r.evaluation_name}: ${r.result_criteria || '목표한 학습 성취기준을 충실히 달성함'}`
).join('\n') || '- 해당 없음'}

**안정적인 발전을 보이는 영역:** (보통 ${averageCount}개)
${averageAchievements.map((r: any) => 
  `- ${r.evaluation_name}: ${r.result_criteria || '꾸준한 노력으로 점진적인 성장을 보이고 있음'}`
).join('\n') || '- 해당 없음'}

**성장 잠재력이 있는 영역:** (노력요함 ${needsImprovementCount}개)
${improvementAreas.map((r: any) => 
  `- ${r.evaluation_name}: ${r.result_criteria || '지속적인 관심과 노력을 통해 향상될 수 있는 가능성이 충분함'}`
).join('\n') || '- 해당 없음'}

**종합 평가:**
- 전체 평가 항목 중 ${excellentCount + goodCount}개 영역에서 우수한 성취를 보임
- 특히 강점을 보이는 영역을 중심으로 지속적인 성장이 기대됨
${needsImprovementCount > 0 ? `- ${needsImprovementCount}개 영역은 추가적인 노력으로 충분히 향상 가능한 잠재력을 지님` : ''}
`
  }

  // 학생 자기평가 정보
  let studentSelfEvaluation = ''
  if (studentResponse && studentResponse.responses) {
    const { responses } = studentResponse
    studentSelfEvaluation = `
**학생 자기평가 내용:**
`
    if (responses.multipleChoice && responses.multipleChoice.length > 0) {
      studentSelfEvaluation += `
[객관식 응답]
${responses.multipleChoice.map((mc: any, idx: number) => 
  `Q${idx + 1}. ${mc.question}\nA: ${mc.answer}`
).join('\n\n')}
`
    }
    
    if (responses.shortAnswer && responses.shortAnswer.length > 0) {
      studentSelfEvaluation += `
[주관식 응답]
${responses.shortAnswer.map((sa: any, idx: number) => 
  `Q${idx + 1}. ${sa.question}\nA: ${sa.answer}`
).join('\n\n')}
`
    }
  }

  // 관찰 기록 정보
  let observationData = ''
  if (useObservationRecords && observationRecords && observationRecords.length > 0) {
    observationData = `
**키워드 기반 관찰 기록:**
${observationRecords.map((session: any, sessionIdx: number) => {
  const sessionInfo = `
[관찰 세션 ${sessionIdx + 1}] ${session.session_date || '날짜 미기록'}
- 교과: ${session.subject || '전과목'}
- 수업 주제: ${session.lesson_topic || '미기록'}
- 관찰 내용:`

  if (session.students_data && session.students_data.length > 0) {
    const studentData = session.students_data.find((s: any) => s.student_name === session.student_name || s.student_name)
    if (studentData && studentData.selected_keywords && studentData.selected_keywords.length > 0) {
      const keywordsByCategory = studentData.selected_keywords.reduce((acc: any, keyword: any) => {
        if (!acc[keyword.category_id]) acc[keyword.category_id] = []
        acc[keyword.category_id].push(keyword)
        return acc
      }, {})

      const categoryNames: any = {
        'learning_attitude': '학습태도',
        'social_skills': '대인관계',
        'cognitive_abilities': '학습능력',
        'participation_level': '참여도',
        'character_traits': '성격특성',
        'special_talents': '특기사항'
      }

      const categorySummary = Object.entries(keywordsByCategory).map(([catId, keywords]: [string, any]) => {
        const categoryName = categoryNames[catId] || catId
        const keywordList = keywords.map((k: any) => {
          const intensity = k.intensity === 1 ? '약간' : k.intensity === 3 ? '매우' : '보통'
          return `${intensity} ${k.keyword_id.replace(/_/g, ' ')}`
        }).join(', ')
        return `  • ${categoryName}: ${keywordList}`
      }).join('\n')

      return sessionInfo + '\n' + categorySummary + (studentData.additional_notes ? `\n  • 추가 관찰: ${studentData.additional_notes}` : '')
    }
  }
  return sessionInfo + '\n  • 기록된 관찰 내용 없음'
}).join('\n\n')}

**관찰 기록 요약:**
- 총 ${observationRecords.length}회의 관찰 세션 기록
- 체크박스 기반 키워드 선택으로 수집된 객관적 관찰 데이터
- 교사의 일상적 관찰을 통해 학생의 학습 태도와 성장 과정을 체계적으로 기록
`
  }

  const hasEvaluationData = evaluationResults?.length > 0 || plansList?.length > 0 || studentResponse || observationData

  const basePrompt = `초등학교 생활기록부 "${recordType}" 항목을 작성해주세요.

**중요한 작성 규칙:**
1. 학생 이름을 절대 포함하지 마세요
2. 반드시 명사형 종결어미(~함, ~임, ~됨, ~음)로 작성하세요
3. 500자 이내로 작성하세요
4. '뛰어난', '탁월한', '우수한', '최고의', '완벽한', '훌륭한' 등의 과도한 표현을 피하세요
5. 구체적이고 객관적인 관찰 내용을 포함하세요
${hasEvaluationData ? '6. 평가 계획의 성취기준과 평가기준을 반드시 참고하여 해당 기준에 맞는 성취 수준을 정확히 반영하세요' : ''}
${plansList?.length > 0 ? '7. 제시된 학습목표와 성취기준이 학생의 실제 성취와 어떻게 연결되는지 구체적으로 서술하세요' : ''}
${studentResponse ? '8. 학생 자기평가 내용을 교사 관찰과 연결하여 균형있게 반영하세요' : ''}

**기본 정보:**
- 작성 항목: ${recordType}
${subject ? `- 과목: ${subject}` : ''}
${className ? `- 학급: ${className}` : ''}

${evaluationPlanInfo}

${evaluationSummary}

${studentSelfEvaluation}

**교사 관찰 기록:**
${teacherNotes}

${observationData}

${additionalContext ? `**추가 맥락:**\n${additionalContext}` : ''}

**교과학습발달상황 작성 지침 (매우 중요!):**

${recordType === '교과학습발달상황' ? `
**형식 요구사항 - 절대 준수:**
1. 영역별 구분 금지: 절대 "듣기·말하기:", "읽기:", "쓰기:" 등으로 나누지 마세요
2. 하나의 연결된 문단: 볼드체, 제목, 구분선 없이 자연스럽게 이어지는 하나의 문단으로 작성
3. 특수 문자 금지: **, ##, -, : 등 제목이나 구분을 위한 특수문자 사용 금지

**올바른 작성 예시:**
분수의 덧셈과 뺄셈 단원에서 통분의 원리를 정확히 이해하고 다양한 문제 상황에 적용하는 능력이 뛰어남. 수학적 사고력을 바탕으로 문제 해결 과정을 논리적으로 설명하며, 동료들과의 협력 학습에서 자신의 아이디어를 명확히 표현함. 계산 능력이 우수하고 새로운 개념 학습에 적극적으로 참여하는 모습을 보임.

**내용 구성 방법:**
` : '**작성 지침:**'}

1. **평가 결과 반영:**
   - "매우잘함": 구체적 성취와 능력을 자연스럽게 강조
   - "잘함": 목표 달성과 우수한 점을 자연스럽게 연결
   - "보통": 현재 수준과 발전 가능성을 균형있게 표현
   - "노력요함": "~하려는 노력을 보임", "점차 향상되고 있음" 등 긍정적 표현

2. **자연스러운 연결:**
   - 학습 활동과 성취를 자연스럽게 연결하여 서술
   - 교사 관찰과 평가 결과를 하나의 흐름으로 구성
   - 학생의 자기평가 내용을 긍정적으로 해석하여 포함

3. **긍정적 관점:**
   - 모든 수준의 학생에게 성장 가능성과 강점 포함
   - 부정적 표현 금지: "못함", "미흡함" → "노력 중", "관심을 가지기 시작함"
   - 작은 진전과 노력도 의미있게 반영

위 지침에 따라 ${recordType === '교과학습발달상황' ? '하나의 자연스럽게 연결된 문단으로' : ''} ${recordType}을 작성해주세요.
반드시 명사형 종결어미로 끝나고, 학생 이름은 절대 포함하지 마세요.`
  
  return basePrompt
}

function validateNeisCompliance(text: string) {
  const issues = []
  
  // 글자 수 확인
  if (text.length > NEIS_RULES.maxLength) {
    issues.push(`글자 수 초과 (${text.length}/${NEIS_RULES.maxLength}자)`)
  }
  
  // 금지어 확인
  const prohibitedFound = NEIS_RULES.prohibitedWords.filter(word => text.includes(word))
  if (prohibitedFound.length > 0) {
    issues.push(`금지어 사용: ${prohibitedFound.join(', ')}`)
  }
  
  // 명사형 종결어미 확인
  const nounEndings = ['함.', '임.', '됨.', '음.', '함', '임', '됨', '음']
  const hasNounEnding = nounEndings.some(ending => text.trim().endsWith(ending))
  if (!hasNounEnding) {
    issues.push('명사형 종결어미 미사용 (반드시 ~함, ~임, ~됨, ~음으로 끝나야 함)')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    characterCount: text.length,
    maxCharacters: NEIS_RULES.maxLength
  }
}