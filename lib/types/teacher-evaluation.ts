/**
 * 교사 평가(성취수준) 시스템 타입 정의
 */

// 성취수준 레벨
export type AchievementLevel = '매우잘함' | '잘함' | '보통' | '노력요함';

// 학생별 성취수준 데이터
export interface StudentAchievement {
  student_name: string;
  student_number?: number;
  achievement_level: AchievementLevel;
  achievement_details?: {
    [area: string]: AchievementLevel;
  };
  teacher_comment?: string;
  specific_achievements?: string[];
  improvement_areas?: string[];
  evaluated_at?: string;
}

// 교사 평가 세션
export interface TeacherEvaluation {
  id: string;
  user_id: string;
  evaluation_plan_id: string;
  class_id: string;
  evaluation_date: string;
  evaluation_name?: string;
  evaluation_period?: string;
  student_achievements: StudentAchievement[];
  evaluation_criteria?: any;
  observation_points?: string[];
  created_at: string;
  updated_at: string;
}

// 평가 영역 정의
export interface EvaluationArea {
  area_name: string;
  weight: number;
  criteria: {
    [key in AchievementLevel]: string;
  };
}

// 평가 템플릿
export interface AchievementTemplate {
  id: string;
  template_name: string;
  subject?: string;
  grade?: string;
  evaluation_areas: EvaluationArea[];
  overall_guidelines?: any;
  is_public: boolean;
}

// 성취수준 입력 폼 데이터
export interface AchievementFormData {
  evaluation_plan_id: string;
  class_id: string;
  evaluation_name: string;
  evaluation_period: string;
  students: {
    name: string;
    number?: number;
    overall_level: AchievementLevel;
    area_levels?: {
      [area: string]: AchievementLevel;
    };
    comment?: string;
    achievements?: string[];
    improvements?: string[];
  }[];
}

// 성취수준 통계
export interface AchievementStatistics {
  total_students: number;
  level_distribution: {
    [key in AchievementLevel]: number;
  };
  area_averages?: {
    [area: string]: number;
  };
  class_trends?: {
    improvement_rate: number;
    consistency_score: number;
  };
}

// 빠른 입력을 위한 프리셋
export interface AchievementPreset {
  level: AchievementLevel;
  common_comments: string[];
  common_achievements: string[];
  common_improvements: string[];
}

export const ACHIEVEMENT_PRESETS: Record<AchievementLevel, AchievementPreset> = {
  '매우잘함': {
    level: '매우잘함',
    common_comments: [
      '모든 학습 활동에 적극적으로 참여하며 우수한 성취를 보임',
      '학습 내용을 완벽히 이해하고 창의적으로 응용함',
      '또래 학습을 도우며 리더십을 발휘함'
    ],
    common_achievements: [
      '창의적 문제해결',
      '우수한 발표력',
      '협력적 리더십',
      '자기주도학습',
      '비판적 사고력'
    ],
    common_improvements: [
      '완벽주의 성향 조절',
      '다양한 관점 수용',
      '인내심 기르기'
    ]
  },
  '잘함': {
    level: '잘함',
    common_comments: [
      '학습 목표를 성실히 달성하며 꾸준한 성장을 보임',
      '주요 개념을 잘 이해하고 적절히 활용함',
      '수업 활동에 성실하게 참여함'
    ],
    common_achievements: [
      '성실한 학습태도',
      '꾸준한 향상',
      '협력적 태도',
      '과제 성실 수행',
      '적극적 참여'
    ],
    common_improvements: [
      '자신감 향상',
      '심화 학습',
      '발표력 강화'
    ]
  },
  '보통': {
    level: '보통',
    common_comments: [
      '기본적인 학습 목표를 달성하며 점진적인 향상을 보임',
      '기초 개념을 이해하고 있으나 응용에는 도움이 필요함',
      '꾸준한 노력으로 성장 가능성이 큼'
    ],
    common_achievements: [
      '기초 개념 이해',
      '꾸준한 노력',
      '긍정적 태도',
      '협동심',
      '규칙 준수'
    ],
    common_improvements: [
      '기초 학습 강화',
      '집중력 향상',
      '자신감 개발',
      '적극성 향상'
    ]
  },
  '노력요함': {
    level: '노력요함',
    common_comments: [
      '기초 학습에 추가적인 지원이 필요하며 개별 지도가 요구됨',
      '학습 동기 부여와 기초 개념 이해에 도움이 필요함',
      '잠재력은 있으나 지속적인 관심과 격려가 필요함'
    ],
    common_achievements: [
      '출석 성실',
      '노력하는 자세',
      '친구관계 원만',
      '예술적 감각',
      '운동 능력'
    ],
    common_improvements: [
      '기초 학습',
      '학습 습관 형성',
      '집중력 개발',
      '과제 완성도',
      '자신감 회복'
    ]
  }
};

// 평가 영역별 가중치 계산
export function calculateOverallLevel(
  areaLevels: Record<string, AchievementLevel>,
  areaWeights: Record<string, number>
): AchievementLevel {
  const levelScores: Record<AchievementLevel, number> = {
    '매우잘함': 4,
    '잘함': 3,
    '보통': 2,
    '노력요함': 1
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(areaLevels).forEach(([area, level]) => {
    const weight = areaWeights[area] || 0.25;
    totalScore += levelScores[level] * weight;
    totalWeight += weight;
  });

  const averageScore = totalScore / totalWeight;

  if (averageScore >= 3.5) return '매우잘함';
  if (averageScore >= 2.5) return '잘함';
  if (averageScore >= 1.5) return '보통';
  return '노력요함';
}