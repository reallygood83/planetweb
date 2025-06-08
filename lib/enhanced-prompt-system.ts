/**
 * 정교화된 생기부 생성 프롬프트 시스템
 * 평가계획과 학생 자기평가를 심층 분석하여 개인화된 생기부 생성
 */

// 성취수준별 서술 전략
export const ACHIEVEMENT_STRATEGIES = {
  '매우잘함': {
    focus: '구체적 성취사례와 창의적 접근',
    tone: '적극적, 우수한, 탁월한',
    structure: '활동 → 과정 → 성취 → 발전방향',
    ratio: '사실:성취:발전 = 3:4:3'
  },
  '잘함': {
    focus: '꾸준한 노력과 목표달성 과정',
    tone: '성실한, 지속적인, 향상되는',
    structure: '노력 → 과정 → 성취 → 잠재력',
    ratio: '노력:성취:잠재력 = 4:3:3'
  },
  '보통': {
    focus: '성장가능성과 긍정적 변화',
    tone: '점차, 꾸준히, 발전하는',
    structure: '현재상태 → 변화과정 → 성장징조 → 기대',
    ratio: '현재:변화:기대 = 2:4:4'
  },
  '노력요함': {
    focus: '긍정적 변화와 잠재력 발굴',
    tone: '향후, 지속적으로, 기대되는',
    structure: '관찰사실 → 긍정요소 → 지원방향 → 성장기대',
    ratio: '사실:긍정:기대 = 2:3:5'
  }
};

// 교과별 특화 프롬프트 요소
export const SUBJECT_SPECIFIC_ELEMENTS = {
  '국어': {
    핵심역량: ['언어사용능력', '의사소통역량', '비판적사고력'],
    관찰포인트: ['읽기 이해력', '표현력', '어휘 활용', '창작 능력'],
    연결어: ['~를 통해 언어 감각을', '~에서 표현력을', '~과정에서 이해력을']
  },
  '수학': {
    핵심역량: ['수학적사고력', '문제해결능력', '논리적추론'],
    관찰포인트: ['계산 정확성', '문제해결 과정', '수학적 의사소통', '추상적 사고'],
    연결어: ['~를 해결하며', '~과정에서 논리적으로', '~를 통해 수학적으로']
  },
  '과학': {
    핵심역량: ['과학적탐구능력', '창의적사고력', '과학적의사소통'],
    관찰포인트: ['탐구 과정', '가설 설정', '실험 태도', '결과 해석'],
    연결어: ['~을 탐구하며', '~실험에서', '~과정을 통해 과학적으로']
  }
};

// 학생 응답 분석 및 해석 함수
export function analyzeStudentResponse(responses: any) {
  const analysis = {
    achievementLevel: '',
    learningPattern: '',
    strengths: [] as string[],
    growthAreas: [] as string[],
    motivationLevel: '',
    metacognitionLevel: ''
  };

  // 객관식 응답 패턴 분석
  const mcResponses = responses.multipleChoice || [];
  const positiveResponses = mcResponses.filter((r: string) => 
    ['매우 그렇다', '그렇다', '잘 할 수 있다', '좋다'].includes(r)
  ).length;

  // 성취수준 자동 판정
  const responseRatio = positiveResponses / mcResponses.length;
  if (responseRatio >= 0.8) analysis.achievementLevel = '매우잘함';
  else if (responseRatio >= 0.6) analysis.achievementLevel = '잘함';
  else if (responseRatio >= 0.4) analysis.achievementLevel = '보통';
  else analysis.achievementLevel = '노력요함';

  // 주관식 응답 감정 분석 (간단한 키워드 기반)
  const saResponses = responses.shortAnswer || [];
  const motivationKeywords = ['재미있', '좋아', '열심히', '노력', '관심'];

  analysis.motivationLevel = saResponses.some((r: string) => 
    motivationKeywords.some(k => r.includes(k))
  ) ? 'high' : 'medium';

  return analysis;
}

// 평가계획 기반 맥락 생성
export function createEvaluationContext(evaluationPlan: any) {
  return {
    subject: evaluationPlan.subject,
    grade: evaluationPlan.grade,
    unit: evaluationPlan.unit,
    standards: evaluationPlan.achievement_standards || [],
    criteria: evaluationPlan.evaluation_criteria || {},
    objectives: evaluationPlan.learning_objectives || [],
    
    // 성취기준별 가중치 계산
    standardWeights: calculateStandardWeights(evaluationPlan.achievement_standards),
    
    // 평가 영역별 중요도
    areaImportance: categorizeEvaluationAreas()
  };
}

// 성취기준별 가중치 계산
function calculateStandardWeights(standards: string[]) {
  // 성취기준의 복잡도와 중요도를 기반으로 가중치 부여
  return standards.map((standard) => ({
    standard,
    weight: 1.0, // 기본값, 추후 AI 분석으로 개선
    complexity: analyzeComplexity(standard),
    importance: analyzeImportance(standard)
  }));
}

// 정교화된 메인 프롬프트 생성 함수
export function createEnhancedRecordPrompt(data: {
  recordType: string;
  responseData: any;
  evaluation: any;
  responses: any;
  teacherObservation?: string;
  teacherEvaluation?: any; // 교사 평가(성취수준) 추가
  additionalContext?: string;
}) {
  const { evaluation, responses, teacherObservation, teacherEvaluation } = data;
  
  // 교사 평가 데이터가 있으면 우선 사용, 없으면 학생 응답 분석
  let finalAchievementLevel: string;
  let teacherAssessmentData: any = null;
  
  if (teacherEvaluation) {
    // 교사가 직접 입력한 성취수준 사용
    finalAchievementLevel = teacherEvaluation.achievement_level;
    teacherAssessmentData = {
      level: teacherEvaluation.achievement_level,
      comment: teacherEvaluation.teacher_comment,
      achievements: teacherEvaluation.specific_achievements || [],
      improvements: teacherEvaluation.improvement_areas || [],
      areaDetails: teacherEvaluation.achievement_details || {}
    };
  } else {
    // 학생 응답 기반 자동 분석 (폴백)
    const studentAnalysis = analyzeStudentResponse(responses);
    finalAchievementLevel = studentAnalysis.achievementLevel;
  }
  
  // 평가계획 맥락 구성 (향후 사용 예정)
  // const evalContext = createEvaluationContext(evaluation);
  
  // 교과별 특화 요소 추출
  const subjectElements = SUBJECT_SPECIFIC_ELEMENTS[evaluation.subject as keyof typeof SUBJECT_SPECIFIC_ELEMENTS] || SUBJECT_SPECIFIC_ELEMENTS['국어'];
  
  // 성취수준별 서술 전략 선택
  const strategy = ACHIEVEMENT_STRATEGIES[finalAchievementLevel as keyof typeof ACHIEVEMENT_STRATEGIES] || ACHIEVEMENT_STRATEGIES['보통'];

  const prompt = `
# 교과학습발달상황 생성 - 고도화 버전

## 📋 생성 규칙 (절대 준수)
- 글자수: 정확히 450-500자 (공백 포함)
- 형식: 하나의 연결된 문단 (영역별 구분 금지)
- 어조: 명사형 종결 (~함, ~임, ~됨)
- 학생명: 절대 언급 금지

## 📊 평가계획 정보
**과목**: ${evaluation.subject} (${evaluation.grade}학년 ${evaluation.semester}학기)
**단원**: ${evaluation.unit}
**성취기준**: ${evaluation.achievement_standards?.join(', ') || '제공되지 않음'}
**학습목표**: ${evaluation.learning_objectives?.join(', ') || '제공되지 않음'}

## 🎯 학생 자기평가 분석
${responses?.shortAnswer?.map((answer: string, idx: number) => 
  `Q${idx + 1}: ${answer}`
).join('\n') || '응답 없음'}

## 👨‍🏫 교사 평가 정보
${teacherAssessmentData ? `
**확정 성취수준**: ${teacherAssessmentData.level}
**교사 평가 코멘트**: ${teacherAssessmentData.comment || '없음'}
**구체적 성취사항**: ${teacherAssessmentData.achievements.join(', ') || '없음'}
**개선 필요 영역**: ${teacherAssessmentData.improvements.join(', ') || '없음'}
${Object.keys(teacherAssessmentData.areaDetails).length > 0 ? 
  `**영역별 성취수준**: ${Object.entries(teacherAssessmentData.areaDetails)
    .map(([area, level]) => `${area}(${level})`).join(', ')}` : ''}
` : '교사 평가 정보 없음 (학생 자기평가 기반 분석 사용)'}

## 👁️ 교사 관찰 기록
${teacherObservation || '관찰 기록 없음'}

## 🎨 서술 전략 (${finalAchievementLevel} 수준)
**중점사항**: ${strategy.focus}
**어조**: ${strategy.tone}
**구조**: ${strategy.structure}
**비율**: ${strategy.ratio}

## 📝 교과별 특화 요소
**핵심역량**: ${subjectElements.핵심역량.join(', ')}
**관찰포인트**: ${subjectElements.관찰포인트.join(', ')}
**연결어 예시**: ${subjectElements.연결어.join(', ')}

## 🔗 맥락적 연결 가이드라인
1. **활동-성취-성장의 논리적 흐름**:
   - 구체적 학습 상황 제시 → 관찰된 행동/태도 → 성취 수준 → 성장 방향

2. **자연스러운 연결어 사용**:
   - 인과관계: "~을 통해", "~에서", "~과정에서"
   - 시간흐름: "점차", "꾸준히", "지속적으로"
   - 미래지향: "앞으로", "더욱", "계속해서"

3. **개인화 요소 강화**:
   - 학생의 자기평가 내용을 구체적으로 반영
   - 평가계획의 성취기준과 학생 성취를 연결
   - 교사 관찰과 학생 인식의 통합적 서술

## ⚡ 생성 지침
다음 흐름으로 500자 내외의 자연스럽고 논리적인 하나의 문단을 생성하세요:

**1단계 (100-120자)**: 평가계획의 주요 학습활동과 학생의 참여 양상을 자연스럽게 연결하여 제시

**2단계 (150-180자)**: 학생의 자기평가 내용과 교사 관찰을 바탕으로 구체적인 성취 과정과 수준을 서술

**3단계 (120-150자)**: 현재 성취수준에 맞는 긍정적 표현으로 강점과 성장 가능성을 제시

**4단계 (80-100자)**: 향후 학습 방향과 기대를 ${subjectElements.핵심역량[0]}과 연결하여 마무리

⚠️ 주의사항:
- 볼드체, 제목, 번호 등 서식 사용 금지
- 영역별 구분 (듣기·말하기, 읽기 등) 절대 금지
- 추상적 표현보다 구체적 학습 상황 중심
- 학생의 목소리(자기평가)가 자연스럽게 녹아들도록 작성
`;

  return prompt;
}

// 복잡도 분석 함수 (추후 AI로 개선 가능)
function analyzeComplexity(standard: string): number {
  const complexWords = ['분석', '종합', '평가', '창조', '적용'];
  return complexWords.filter(word => standard.includes(word)).length / complexWords.length;
}

// 중요도 분석 함수 (추후 AI로 개선 가능)  
function analyzeImportance(standard: string): number {
  const importantKeywords = ['핵심', '중요', '기본', '필수'];
  return importantKeywords.filter(word => standard.includes(word)).length / importantKeywords.length;
}

// 평가영역 분류 함수
function categorizeEvaluationAreas() {
  // 평가기준을 영역별로 분류하고 중요도 부여
  return {
    knowledge: 0.3,    // 지식 이해
    skill: 0.4,        // 기능 숙달  
    attitude: 0.3      // 가치 태도
  };
}