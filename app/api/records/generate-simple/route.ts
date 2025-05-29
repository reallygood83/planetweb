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
      studentResponse = null
    } = body

    // 필수 항목 검증
    if (!teacherNotes.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: '교사 관찰 기록을 입력해주세요.' 
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
      studentResponse
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

function createSimplePrompt({ recordType, subject, teacherNotes, additionalContext, className, evaluationResults, evaluationPlan, studentResponse }: any) {
  // 평가 계획 정보
  let evaluationPlanInfo = ''
  if (evaluationPlan) {
    evaluationPlanInfo = `
**평가 계획 정보:**
- 과목: ${evaluationPlan.subject || ''}
- 학년: ${evaluationPlan.grade || ''}
- 단원: ${evaluationPlan.unit || ''}
- 학습목표: ${evaluationPlan.learning_objectives?.join(', ') || ''}
- 성취기준: ${evaluationPlan.achievement_standards?.join(', ') || ''}
- 평가기준: ${evaluationPlan.evaluation_criteria || ''}
`
  }

  // 평가 결과 요약
  let evaluationSummary = ''
  if (evaluationResults && evaluationResults.length > 0) {
    const excellentCount = evaluationResults.filter((r: any) => r.result === '매우잘함').length
    const goodCount = evaluationResults.filter((r: any) => r.result === '잘함').length
    const averageCount = evaluationResults.filter((r: any) => r.result === '보통').length
    const needsImprovementCount = evaluationResults.filter((r: any) => r.result === '노력요함').length
    
    evaluationSummary = `
**평가 결과 요약:**
- 매우잘함: ${excellentCount}개
- 잘함: ${goodCount}개
- 보통: ${averageCount}개
- 노력요함: ${needsImprovementCount}개

**상세 평가 결과:**
${evaluationResults
  .map((r: any) => `- ${r.evaluation_name}: ${r.result} ${r.result_criteria ? `(${r.result_criteria})` : ''}`)
  .join('\n')}

**우수 성취 내용:**
${evaluationResults
  .filter((r: any) => r.result === '매우잘함' || r.result === '잘함')
  .map((r: any) => `- ${r.evaluation_name}: ${r.result_criteria || r.result}`)
  .join('\n')}
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

  const hasEvaluationData = evaluationResults?.length > 0 || evaluationPlan || studentResponse

  const basePrompt = `초등학교 생활기록부 "${recordType}" 항목을 작성해주세요.

**중요한 작성 규칙:**
1. 학생 이름을 절대 포함하지 마세요
2. 반드시 명사형 종결어미(~함, ~임, ~됨, ~음)로 작성하세요
3. 500자 이내로 작성하세요
4. '뛰어난', '탁월한', '우수한', '최고의', '완벽한', '훌륭한' 등의 과도한 표현을 피하세요
5. 구체적이고 객관적인 관찰 내용을 포함하세요
${hasEvaluationData ? '6. 평가 계획, 평가 결과, 학생 자기평가를 종합적으로 참고하여 학생의 성취 수준을 정확히 반영하세요' : ''}

**기본 정보:**
- 작성 항목: ${recordType}
${subject ? `- 과목: ${subject}` : ''}
${className ? `- 학급: ${className}` : ''}

${evaluationPlanInfo}

${evaluationSummary}

${studentSelfEvaluation}

**교사 관찰 기록:**
${teacherNotes}

${additionalContext ? `**추가 맥락:**\n${additionalContext}` : ''}

**작성 지침:**
위의 모든 정보를 종합하여 ${recordType}을 작성해주세요.
- 평가 계획에서 설정한 학습목표와 성취기준을 기준으로 학생의 성취 정도를 평가하세요
- 평가 결과 데이터를 바탕으로 구체적인 성취 수준을 명시하세요
- 학생의 자기평가 내용에서 드러나는 학습 태도와 성찰 내용을 반영하세요
- 교사의 관찰 내용을 통해 수업 중 구체적인 모습을 서술하세요
- 단순한 결과 나열이 아닌, 학생의 성장과 학습 과정을 종합적으로 기술하세요

반드시 명사형 종결어미로 끝나는 완성된 문장으로 작성하고, 학생 이름은 절대 포함하지 마세요.`
  
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