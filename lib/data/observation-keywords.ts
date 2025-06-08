/**
 * 교사 관찰 기록용 키워드 데이터베이스
 * 교육 현장에서 자주 사용되는 표현들을 체계적으로 분류
 */

import { ObservationCategory } from '../types/observation-system';

export const OBSERVATION_CATEGORIES: ObservationCategory[] = [
  {
    id: 'learning_attitude',
    name: '학습태도',
    description: '수업 참여도, 집중력, 과제 수행 등',
    order: 1,
    color: 'blue',
    keywords: [
      {
        id: 'active_participation',
        text: '적극적 참여',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '수업에 적극적으로 참여하며',
        description: '발표, 질문, 토론 등에 능동적 참여'
      },
      {
        id: 'high_concentration',
        text: '집중력 우수',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '높은 집중력을 보이며',
        description: '수업 시간 내내 집중하여 참여'
      },
      {
        id: 'frequent_questions',
        text: '질문 빈도 높음',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '궁금한 점을 적극적으로 질문하며',
        description: '호기심을 바탕으로 한 적극적 질문'
      },
      {
        id: 'task_completion',
        text: '과제 성실 수행',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '주어진 과제를 성실히 수행하고',
        description: '과제를 빠짐없이 완성하여 제출'
      },
      {
        id: 'attention_needed',
        text: '집중력 개선 필요',
        weight: 3,
        frequency: 0,
        positivity: 'improvement',
        autoText: '수업 집중력 향상이 기대되며',
        description: '주의가 산만하거나 집중 시간이 짧음'
      },
      {
        id: 'passive_participation',
        text: '수동적 참여',
        weight: 3,
        frequency: 0,
        positivity: 'improvement',
        autoText: '보다 적극적인 참여가 기대되며',
        description: '지시에만 따르고 자발성이 부족'
      }
    ]
  },
  {
    id: 'social_skills',
    name: '대인관계',
    description: '협력, 배려, 소통 능력 등',
    order: 2,
    color: 'green',
    keywords: [
      {
        id: 'collaborative',
        text: '협력적',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '친구들과 협력하여',
        description: '모둠 활동에서 잘 협력함'
      },
      {
        id: 'caring',
        text: '배려심 많음',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '친구들을 배려하는 마음으로',
        description: '다른 학생들을 잘 도와줌'
      },
      {
        id: 'leadership',
        text: '리더십 발휘',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '모둠을 이끌어가는 리더십을 보이며',
        description: '모둠 활동에서 주도적 역할'
      },
      {
        id: 'conflict_resolution',
        text: '갈등 해결 능력',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '문제 상황을 슬기롭게 해결하며',
        description: '친구 간 갈등을 원만히 해결'
      },
      {
        id: 'communication_skills',
        text: '의사소통 능력',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '자신의 생각을 명확히 표현하고',
        description: '자신의 의견을 잘 전달함'
      },
      {
        id: 'shy_interaction',
        text: '소극적 교우관계',
        weight: 3,
        frequency: 0,
        positivity: 'improvement',
        autoText: '친구들과의 활발한 교류가 기대되며',
        description: '친구들과의 상호작용이 부족'
      }
    ]
  },
  {
    id: 'cognitive_abilities',
    name: '학습능력',
    description: '이해력, 사고력, 창의성 등',
    order: 3,
    color: 'purple',
    keywords: [
      {
        id: 'quick_understanding',
        text: '이해력 빠름',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '새로운 내용을 빠르게 이해하며',
        description: '설명을 듣고 즉시 이해함'
      },
      {
        id: 'good_application',
        text: '응용력 좋음',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '학습한 내용을 다양하게 응용하며',
        description: '배운 것을 새로운 상황에 적용'
      },
      {
        id: 'creative_thinking',
        text: '창의적 사고',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '독창적인 아이디어로',
        description: '기존과 다른 참신한 접근'
      },
      {
        id: 'logical_expression',
        text: '논리적 표현',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '논리적으로 설명하며',
        description: '체계적이고 순서있는 설명'
      },
      {
        id: 'analytical_thinking',
        text: '분석적 사고',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '문제를 체계적으로 분석하며',
        description: '복잡한 내용을 잘 분석함'
      },
      {
        id: 'needs_reinforcement',
        text: '기초 개념 보강 필요',
        weight: 3,
        frequency: 0,
        positivity: 'improvement',
        autoText: '기초 개념 이해가 더욱 향상되면',
        description: '기본 개념의 추가 학습이 필요'
      }
    ]
  },
  {
    id: 'participation_level',
    name: '참여도',
    description: '발표, 토론, 활동 참여 정도',
    order: 4,
    color: 'orange',
    keywords: [
      {
        id: 'active_presentation',
        text: '발표 적극적',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '자신 있게 발표하며',
        description: '발표 기회에 적극적으로 참여'
      },
      {
        id: 'discussion_leader',
        text: '토론 주도',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '토론을 주도적으로 이끌어가며',
        description: '토론에서 중심적 역할 수행'
      },
      {
        id: 'idea_contributor',
        text: '아이디어 제시',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '참신한 아이디어를 제시하며',
        description: '새로운 아이디어를 자주 제안'
      },
      {
        id: 'group_activity_leader',
        text: '모둠활동 주도',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '모둠 활동에서 주도적 역할을 하며',
        description: '모둠 활동을 이끌어감'
      },
      {
        id: 'presentation_anxiety',
        text: '발표 부담감',
        weight: 3,
        frequency: 0,
        positivity: 'improvement',
        autoText: '발표에 대한 자신감 향상이 기대되며',
        description: '발표를 어려워하거나 피하려 함'
      },
      {
        id: 'observer_role',
        text: '관찰자 역할',
        weight: 3,
        frequency: 0,
        positivity: 'neutral',
        autoText: '신중하게 관찰하며',
        description: '직접 참여보다는 관찰을 선호'
      }
    ]
  },
  {
    id: 'character_traits',
    name: '성격특성',
    description: '성실성, 책임감, 인내심 등',
    order: 5,
    color: 'indigo',
    keywords: [
      {
        id: 'responsible',
        text: '책임감 강함',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '맡은 일에 책임감을 갖고',
        description: '자신의 역할을 끝까지 완수'
      },
      {
        id: 'diligent',
        text: '성실함',
        weight: 5,
        frequency: 0,
        positivity: 'positive',
        autoText: '성실한 태도로',
        description: '꾸준하고 성실한 학습 태도'
      },
      {
        id: 'patient',
        text: '인내심 있음',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '끈기있게 노력하며',
        description: '어려운 상황에서도 포기하지 않음'
      },
      {
        id: 'organized',
        text: '체계적',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '체계적으로 정리하며',
        description: '계획적이고 정돈된 학습'
      },
      {
        id: 'curious',
        text: '호기심 많음',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '호기심을 바탕으로',
        description: '새로운 것에 대한 관심이 높음'
      },
      {
        id: 'impulsive',
        text: '충동적 행동',
        weight: 3,
        frequency: 0,
        positivity: 'improvement',
        autoText: '신중한 행동이 더욱 기대되며',
        description: '생각 없이 행동하는 경우가 있음'
      }
    ]
  },
  {
    id: 'special_talents',
    name: '특기사항',
    description: '특별한 재능이나 관심사',
    order: 6,
    color: 'pink',
    keywords: [
      {
        id: 'artistic_talent',
        text: '예술적 재능',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '뛰어난 예술적 감각으로',
        description: '그리기, 만들기 등 예술 활동에 재능'
      },
      {
        id: 'mathematical_aptitude',
        text: '수학적 사고력',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '뛰어난 수학적 사고력으로',
        description: '수학적 문제 해결 능력이 뛰어남'
      },
      {
        id: 'language_skills',
        text: '언어 능력',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '우수한 언어 능력으로',
        description: '읽기, 쓰기, 말하기 능력이 뛰어남'
      },
      {
        id: 'physical_coordination',
        text: '신체 협응력',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '뛰어난 신체 협응력으로',
        description: '체육 활동이나 손재주가 좋음'
      },
      {
        id: 'technology_interest',
        text: '기술 관심도',
        weight: 4,
        frequency: 0,
        positivity: 'positive',
        autoText: '기술에 대한 높은 관심으로',
        description: 'IT, 과학 기술에 특별한 흥미'
      },
      {
        id: 'area_exploration',
        text: '관심 영역 탐색',
        weight: 3,
        frequency: 0,
        positivity: 'neutral',
        autoText: '다양한 영역을 탐색하며',
        description: '아직 특별한 관심사를 찾는 중'
      }
    ]
  }
];

// 키워드 조합 패턴 (자주 함께 사용되는 키워드들)
export const KEYWORD_COMBINATIONS = [
  {
    primary: 'active_participation',
    related: ['frequent_questions', 'active_presentation', 'collaborative'],
    autoSentence: '수업에 적극적으로 참여하며 친구들과 협력하여 활동함'
  },
  {
    primary: 'creative_thinking',
    related: ['idea_contributor', 'artistic_talent'],
    autoSentence: '창의적인 아이디어를 제시하며 독창적인 접근을 보임'
  },
  {
    primary: 'leadership',
    related: ['collaborative', 'group_activity_leader', 'responsible'],
    autoSentence: '책임감을 갖고 모둠을 이끌어가는 리더십을 발휘함'
  }
];

// 강도별 표현 변형
export const INTENSITY_MODIFIERS = {
  1: { prefix: '약간', suffix: '경향을 보임' },      // 약간
  2: { prefix: '', suffix: '모습을 보임' },         // 보통  
  3: { prefix: '매우', suffix: '뛰어난 모습을 보임' } // 매우
};

// 맥락별 연결어
export const CONTEXT_CONNECTORS = {
  group_work: ['모둠 활동에서', '팀 프로젝트 중', '협력 학습 시'],
  individual_work: ['개별 활동에서', '혼자 공부할 때', '과제 수행 중'],
  presentation: ['발표할 때', '의견을 말할 때', '설명하는 과정에서'],
  discussion: ['토론 시간에', '의견 교환 중', '생각을 나눌 때'],
  creative_activity: ['만들기 활동에서', '창작 활동 중', '표현 활동 시'],
  problem_solving: ['문제 해결 과정에서', '탐구 활동 중', '실험할 때']
};