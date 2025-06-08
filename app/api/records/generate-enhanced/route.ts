import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createEnhancedRecordPrompt, analyzeStudentResponse } from '@/lib/enhanced-prompt-system';

export async function POST(request: NextRequest) {
  try {
    const { 
      responseId, 
      apiKey, 
      recordType = '교과학습발달상황',
      useEnhancedPrompt = true 
    } = await request.json();

    if (!responseId || !apiKey) {
      return NextResponse.json(
        { error: 'responseId와 apiKey가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 2. 설문 응답 데이터 조회 (평가계획 정보 포함)
    const { data: responseData, error: responseError } = await supabase
      .from('survey_responses')
      .select(`
        *,
        surveys!inner (
          title,
          questions,
          evaluation_plans (
            subject, grade, semester, unit,
            achievement_standards,
            evaluation_criteria, 
            learning_objectives
          )
        )
      `)
      .eq('id', responseId)
      .eq('surveys.user_id', user.id)
      .single();

    if (responseError || !responseData) {
      return NextResponse.json(
        { error: '응답 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. 관찰 기록 데이터 조회 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: observationData } = await supabase
      .from('daily_observations')
      .select('*')
      .eq('user_id', user.id)
      .eq('student_name', responseData.student_name)
      .gte('observation_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('observation_date', { ascending: false });

    // 4. 교사 평가(성취수준) 조회
    const { data: teacherEvaluations } = await supabase
      .from('teacher_evaluations')
      .select('*')
      .eq('user_id', user.id)
      .eq('evaluation_plan_id', responseData.surveys.evaluation_plans?.id)
      .order('evaluation_date', { ascending: false })
      .limit(1);

    let teacherEvaluation = null;
    if (teacherEvaluations && teacherEvaluations.length > 0) {
      // 해당 학생의 평가 찾기
      const studentAchievement = teacherEvaluations[0].student_achievements?.find(
        (achievement: any) => achievement.student_name === responseData.student_name
      );
      if (studentAchievement) {
        teacherEvaluation = studentAchievement;
      }
    }

    // 5. 관찰 기록을 텍스트로 변환
    const observationText = formatObservationData(observationData || []);

    // 6. AI 프롬프트 생성 및 실행
    let prompt: string;
    
    if (useEnhancedPrompt && responseData.surveys.evaluation_plans) {
      // 정교화된 프롬프트 사용
      prompt = createEnhancedRecordPrompt({
        recordType,
        responseData,
        evaluation: responseData.surveys.evaluation_plans,
        responses: responseData.responses,
        teacherObservation: observationText,
        teacherEvaluation: teacherEvaluation, // 교사 평가 추가
        additionalContext: responseData.additional_context
      });
    } else {
      // 기존 프롬프트 사용 (폴백)
      prompt = createLegacyPrompt({
        recordType,
        responseData,
        evaluation: responseData.surveys.evaluation_plans,
        responses: responseData.responses,
        observationText,
        teacherEvaluation
      });
    }

    // 7. Gemini API 호출
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const generatedContent = result.response.text();

    // 8. 생성 결과 검증
    const validation = validateGeneratedContent(generatedContent, recordType);
    if (!validation.isValid) {
      return NextResponse.json({
        error: '생성된 내용이 규정을 위반합니다.',
        details: validation.errors,
        generated_content: generatedContent
      }, { status: 400 });
    }

    // 9. 결과 저장
    const { data: savedContent, error: saveError } = await supabase
      .from('generated_contents')
      .insert({
        user_id: user.id,
        student_name: responseData.student_name,
        class_name: responseData.class_name,
        content_type: recordType,
        content: generatedContent,
        metadata: {
          survey_response_id: responseId,
          evaluation_plan_id: responseData.surveys.evaluation_plans?.id,
          generation_method: useEnhancedPrompt ? 'enhanced' : 'legacy',
          observation_records_count: observationData?.length || 0,
          prompt_version: '2.0'
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('저장 오류:', saveError);
      return NextResponse.json(
        { error: '생성된 내용 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 10. 분석 정보와 함께 응답
    return NextResponse.json({
      success: true,
      generated_content: generatedContent,
      content_id: savedContent.id,
      analysis: {
        teacher_evaluation_used: !!teacherEvaluation,
        achievement_level: teacherEvaluation?.achievement_level || '자동분석',
        observation_records_used: observationData?.length || 0,
        generation_method: useEnhancedPrompt ? 'enhanced' : 'legacy',
        character_count: generatedContent.length,
        validation: validation
      },
      metadata: {
        student_name: responseData.student_name,
        class_name: responseData.class_name,
        subject: responseData.surveys.evaluation_plans?.subject,
        record_type: recordType
      }
    });

  } catch (error) {
    console.error('생기부 생성 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 관찰 기록 데이터를 텍스트로 포맷팅
function formatObservationData(observations: any[]): string {
  if (!observations || observations.length === 0) {
    return '최근 관찰 기록 없음';
  }

  // 카테고리별로 그룹화
  const groupedByCategory = observations.reduce((acc, obs) => {
    if (!acc[obs.category_id]) acc[obs.category_id] = [];
    acc[obs.category_id].push(obs);
    return acc;
  }, {} as Record<string, any[]>);

  const sections = Object.entries(groupedByCategory).map(([categoryId, categoryObs]) => {
    const categoryName = getCategoryName(categoryId);
    const keywords = categoryObs.map(obs => {
      const intensityText = ['약간', '보통', '매우'][obs.intensity - 1] || '보통';
      const contextText = obs.context ? ` (${obs.context})` : '';
      return `${intensityText} ${getKeywordText(obs.keyword_id)}${contextText}`;
    }).join(', ');
    
    return `[${categoryName}] ${keywords}`;
  });

  return `최근 30일 관찰 기록:\n${sections.join('\n')}`;
}

// 카테고리명 매핑 (실제로는 DB에서 조회)
function getCategoryName(categoryId: string): string {
  const categoryMap: Record<string, string> = {
    'learning_attitude': '학습태도',
    'social_skills': '대인관계', 
    'cognitive_abilities': '학습능력',
    'participation_level': '참여도',
    'character_traits': '성격특성',
    'special_talents': '특기사항'
  };
  return categoryMap[categoryId] || categoryId;
}

// 키워드 텍스트 매핑 (실제로는 DB에서 조회)
function getKeywordText(keywordId: string): string {
  const keywordMap: Record<string, string> = {
    'active_participation': '적극적 참여',
    'high_concentration': '집중력 우수',
    'collaborative': '협력적',
    'caring': '배려심 많음',
    'quick_understanding': '이해력 빠름',
    // ... 더 많은 키워드 매핑
  };
  return keywordMap[keywordId] || keywordId;
}

// 기존 프롬프트 (폴백용)
function createLegacyPrompt(data: any): string {
  return `
교과학습발달상황을 작성해주세요.

평가계획: ${JSON.stringify(data.evaluation)}
학생 응답: ${JSON.stringify(data.responses)}
관찰 기록: ${data.observationText}

규칙:
- 500자 이내
- 명사형 종결
- 하나의 문단
- 학생명 제외
`;
}

// 생성 내용 검증
function validateGeneratedContent(content: string, recordType: string) {
  const errors: string[] = [];
  
  // 글자 수 검증
  const charLimit = recordType === '교과학습발달상황' ? 500 : 200;
  if (content.length > charLimit) {
    errors.push(`글자 수 초과: ${content.length}자 (제한: ${charLimit}자)`);
  }
  
  // 학생명 포함 검증
  const namePatterns = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
  const hasStudentName = namePatterns.some(pattern => 
    content.includes(pattern) && /[가-힣]{2,3}/.test(content)
  );
  if (hasStudentName) {
    errors.push('학생명이 포함되어 있을 가능성이 있습니다.');
  }
  
  // 형식 검증 (영역별 구분 금지)
  const forbiddenSeparators = ['1.', '2.', '가.', '나.', '듣기·말하기', '읽기', '쓰기'];
  const hasForbiddenFormat = forbiddenSeparators.some(sep => content.includes(sep));
  if (hasForbiddenFormat) {
    errors.push('영역별 구분이 포함되어 있습니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    character_count: content.length,
    estimated_quality: errors.length === 0 ? 'good' : 'needs_review'
  };
}