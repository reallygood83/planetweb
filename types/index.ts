// Evaluation types
export interface Evaluation {
  evaluationName: string
  unitName?: string
  achievementStandards: string[]
  evaluationCriteria: {
    excellent: string
    good: string
    average: string
    needsImprovement: string
  }
  evaluationMethod: string
  evaluationPeriod: string
}

export interface EvaluationPlan {
  id?: string
  user_id?: string
  subject: string
  grade: string
  semester: string
  evaluations: Evaluation[]
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

// Student types
export interface Student {
  number: number
  name: string
}

export interface Class {
  id: string
  user_id: string
  class_name: string
  grade: string
  semester: string
  teacher?: string
  students: Student[]
  created_at: string
  updated_at: string
}

export interface ClassInfo {
  id?: string
  className: string
  grade: string
  semester: string
  teacher?: string
  students: Student[]
  createdAt?: string
  updatedAt?: string
}

// Content generation types
export type ContentType = '교과학습발달상황' | '창의적체험활동' | '행동특성및종합의견'

export interface GenerationParams {
  type: ContentType
  studentName: string
  className?: string
  subject?: string
  activityType?: string
  observationNotes?: string
  selfEvaluation?: string
  evaluationPlan?: EvaluationPlan
  yearSummary?: string
}

export interface GeneratedContent {
  id?: string
  studentName: string
  className?: string
  contentType: ContentType
  content: string
  metadata?: {
    subject?: string
    characterCount?: number
    validation?: ValidationResult
  }
  createdAt?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  characterCount: number
}

// Survey types
export interface SurveyQuestion {
  question: string
  options?: string[]
  guideline?: string
}

export interface Survey {
  id?: string
  title: string
  evaluationPlanId?: string
  questions: {
    multipleChoice: SurveyQuestion[]
    shortAnswer: SurveyQuestion[]
  }
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// School group types
export interface SchoolGroup {
  id?: string
  code: string
  name: string
  description?: string
  schoolName?: string
  creatorId?: string
  memberCount?: number
  isCreator?: boolean
  settings?: {
    canInvite?: boolean
    canShare?: boolean
    canEdit?: boolean
  }
  createdAt?: string
  updatedAt?: string
}

// API key management
export interface ApiKeyStatus {
  hasKey: boolean
  isValid: boolean
  hint?: string
  message?: string
}

// User profile
export interface UserProfile {
  id: string
  email: string
  name?: string
  schoolName?: string
  apiKeyHint?: string
  createdAt?: string
  updatedAt?: string
}