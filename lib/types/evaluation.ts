// 개선된 평가계획 타입 정의

export interface AchievementStandard {
  code: string        // 예: "[6수03-01]"
  content: string     // 성취기준 내용
}

export interface EvaluationCriteria {
  excellent: {
    level: "매우잘함"
    description: string
  }
  good: {
    level: "잘함"
    description: string
  }
  satisfactory: {
    level: "보통"
    description: string
  }
  needs_improvement: {
    level: "노력요함"
    description: string
  }
}

export type AIGenerationTarget = 
  | "교과학습발달상황" 
  | "창의적 체험활동 누가기록" 
  | "행동특성 및 종합의견"

export interface EvaluationPlan {
  id: string
  user_id: string
  
  // 기본 정보
  subject: string
  grade: string
  semester: string
  unit: string                    // 단원명
  lesson?: string                 // 차시
  
  // 교육과정 정보
  achievement_standards: AchievementStandard[]
  learning_objectives: string[]
  
  // 평가 설계
  evaluation_methods: string[]    // ["관찰평가", "포트폴리오", "실기평가"]
  evaluation_tools: string[]      // ["체크리스트", "루브릭", "자기평가지"]
  evaluation_criteria: EvaluationCriteria
  
  // AI 생성 대상
  ai_generation_targets: AIGenerationTarget[]
  
  // 생기부 연계
  record_keywords: string[]       // 핵심 키워드
  special_notes?: string          // 특별 고려사항
  
  // 메타데이터
  created_at: string
  updated_at: string
}

// 평가방법 옵션
export const EVALUATION_METHODS = [
  "관찰평가",
  "포트폴리오",
  "실기평가", 
  "프로젝트평가",
  "자기평가",
  "동료평가",
  "구술평가",
  "실험보고서",
  "토론평가",
  "발표평가"
] as const

// 평가도구 옵션  
export const EVALUATION_TOOLS = [
  "체크리스트",
  "루브릭",
  "자기평가지",
  "관찰일지",
  "포트폴리오",
  "실기채점표",
  "토론평가표",
  "발표평가표"
] as const

// 교과목 옵션
export const SUBJECTS = [
  "국어", "수학", "사회", "과학", "도덕", "실과",
  "체육", "음악", "미술", "영어",
  "창의적 체험활동"
] as const

// 학년 옵션
export const GRADES = [
  "1학년", "2학년", "3학년", "4학년", "5학년", "6학년"
] as const

// 학기 옵션
export const SEMESTERS = [
  "1학기", "2학기"
] as const