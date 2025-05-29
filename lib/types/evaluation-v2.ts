// 개선된 평가계획 타입 정의 v2

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

// 과목별 평가계획 (학기 전체)
export interface SubjectEvaluationPlan {
  id: string
  user_id: string
  
  // 기본 정보
  subject: string      // 과목
  grade: string        // 학년
  semester: string     // 학기  
  school_year: number  // 학년도
  
  // 메타데이터
  created_at: string
  updated_at: string
  
  // 관계
  evaluations?: IndividualEvaluation[]
}

// 개별 평가 (단원별/차시별)
export interface IndividualEvaluation {
  id: string
  plan_id: string  // 과목별 평가계획 ID
  
  // 평가 정보
  evaluation_name: string      // 평가명
  unit: string                 // 단원
  lesson?: string              // 차시
  evaluation_period?: string   // 평가시기
  
  // 성취기준
  achievement_standards: AchievementStandard[]
  
  // 평가방법 및 도구
  evaluation_methods: string[]    // ["관찰평가", "포트폴리오"]
  evaluation_tools: string[]      // ["체크리스트", "루브릭"]
  
  // 4단계 평가기준
  evaluation_criteria: EvaluationCriteria
  
  // 가중치
  weight?: number  // 평가 비중 (%)
  
  // 메타데이터
  created_at: string
  updated_at: string
}

// 평가 생성/수정 시 사용하는 DTO
export interface CreateSubjectPlanDTO {
  subject: string
  grade: string
  semester: string
  school_year?: number
}

export interface CreateEvaluationDTO {
  plan_id: string
  evaluation_name: string
  unit: string
  lesson?: string
  evaluation_period?: string
  achievement_standards: AchievementStandard[]
  evaluation_methods: string[]
  evaluation_tools: string[]
  evaluation_criteria: EvaluationCriteria
  weight?: number
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
  "발표평가",
  "수행평가",
  "지필평가"
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
  "발표평가표",
  "평가척도표",
  "채점기준표"
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

// 평가시기 옵션 예시
export const EVALUATION_PERIODS = [
  "3월 1주", "3월 2주", "3월 3주", "3월 4주",
  "4월 1주", "4월 2주", "4월 3주", "4월 4주",
  "5월 1주", "5월 2주", "5월 3주", "5월 4주",
  "6월 1주", "6월 2주", "6월 3주", "6월 4주",
  "7월 1주", "7월 2주", "7월 3주", "7월 4주",
  "8월 3주", "8월 4주",
  "9월 1주", "9월 2주", "9월 3주", "9월 4주",
  "10월 1주", "10월 2주", "10월 3주", "10월 4주",
  "11월 1주", "11월 2주", "11월 3주", "11월 4주",
  "12월 1주", "12월 2주", "12월 3주", "12월 4주",
  "1월 1주", "1월 2주", "1월 3주", "1월 4주",
  "2월 1주", "2월 2주", "2월 3주", "2월 4주",
  "수시"
] as const