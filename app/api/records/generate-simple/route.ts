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
      additionalContext = ''
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
      className
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

function createSimplePrompt({ recordType, subject, teacherNotes, additionalContext, className }: any) {
  const basePrompt = `초등학교 생활기록부 "${recordType}" 항목을 작성해주세요.

**중요한 작성 규칙:**
1. 학생 이름을 절대 포함하지 마세요
2. 반드시 명사형 종결어미(~함, ~임, ~됨, ~음)로 작성하세요
3. 500자 이내로 작성하세요
4. '뛰어난', '탁월한', '우수한', '최고의', '완벽한', '훌륭한' 등의 과도한 표현을 피하세요
5. 구체적이고 객관적인 관찰 내용을 포함하세요

**기본 정보:**
- 작성 항목: ${recordType}
${subject ? `- 과목: ${subject}` : ''}
${className ? `- 학급: ${className}` : ''}

**교사 관찰 기록:**
${teacherNotes}

${additionalContext ? `**추가 맥락:**\n${additionalContext}` : ''}

위 정보를 바탕으로 ${recordType}을 작성해주세요. 
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