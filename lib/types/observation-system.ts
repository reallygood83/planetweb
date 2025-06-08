/**
 * 키워드 기반 교사 관찰 기록 시스템 타입 정의
 */

// 관찰 영역별 키워드 카테고리
export interface ObservationCategory {
  id: string;
  name: string;
  description: string;
  keywords: ObservationKeyword[];
  order: number;
  color: string; // Tailwind color class
}

// 개별 관찰 키워드
export interface ObservationKeyword {
  id: string;
  text: string;
  description?: string;
  weight: number; // 중요도 가중치 (1-5)
  frequency: number; // 사용 빈도 통계
  positivity: 'positive' | 'neutral' | 'improvement'; // 긍정/중립/개선필요
  autoText?: string; // 자동 생성될 문장 템플릿
}

// 관찰 기록 세션
export interface ObservationSession {
  id: string;
  user_id: string;
  class_id: string;
  date: string;
  subject?: string;
  lesson_topic?: string;
  students: StudentObservation[];
  created_at: string;
  updated_at: string;
}

// 학생별 관찰 기록
export interface StudentObservation {
  student_name: string;
  student_number?: number;
  selected_keywords: SelectedKeyword[];
  additional_notes?: string;
  overall_rating?: 1 | 2 | 3 | 4 | 5; // 전체적 평가 (1=개선필요, 5=매우우수)
}

// 선택된 키워드 (컨텍스트 정보 포함)
export interface SelectedKeyword {
  keyword_id: string;
  category_id: string;
  intensity?: 1 | 2 | 3; // 강도 (1=약간, 2=보통, 3=매우)
  context?: string; // 상황 맥락
  timestamp: string;
}

// 일상 관찰 기록 (누적용)
export interface DailyObservation {
  id: string;
  user_id: string;
  student_name: string;
  class_id: string;
  observation_date: string;
  category_id: string;
  keyword_id: string;
  intensity: number;
  context?: string;
  subject?: string;
  created_at: string;
}

// 관찰 분석 결과
export interface ObservationAnalysis {
  student_name: string;
  period: { start: string; end: string };
  
  // 영역별 분석
  categories: {
    [categoryId: string]: {
      total_count: number;
      positive_ratio: number;
      improvement_areas: string[];
      strengths: string[];
      trend: 'improving' | 'stable' | 'declining';
    };
  };
  
  // 전체 요약
  summary: {
    most_frequent_keywords: ObservationKeyword[];
    growth_pattern: string;
    recommended_focus: string[];
    record_suggestion: string;
  };
}

// 키워드 자동완성/추천
export interface KeywordSuggestion {
  keyword: ObservationKeyword;
  relevance_score: number;
  reason: string; // 추천 이유
  used_with: string[]; // 함께 자주 사용되는 키워드들
}