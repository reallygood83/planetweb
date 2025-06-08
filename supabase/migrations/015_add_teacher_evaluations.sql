-- 교사 평가(성취수준) 시스템 추가
-- 실행: Supabase SQL Editor에서 실행

-- 1. 교사 평가 테이블 (평가계획별 학생 성취수준)
CREATE TABLE teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- 평가 메타데이터
  evaluation_name VARCHAR(200),
  evaluation_period VARCHAR(100), -- 예: '1학기 중간', '2학기 기말'
  
  -- 학생별 성취수준 데이터 (JSONB 배열)
  student_achievements JSONB NOT NULL DEFAULT '[]',
  /* 
  예시 구조:
  [
    {
      "student_name": "홍길동",
      "student_number": 1,
      "achievement_level": "매우잘함",
      "achievement_details": {
        "영역1": "매우잘함",
        "영역2": "잘함",
        "영역3": "잘함"
      },
      "teacher_comment": "적극적인 수업 참여와 우수한 과제 수행",
      "specific_achievements": ["창의적 문제해결", "협력적 모둠활동"],
      "improvement_areas": ["발표 자신감"],
      "evaluated_at": "2024-03-15"
    }
  ]
  */
  
  -- 평가 기준 및 관찰 포인트
  evaluation_criteria JSONB DEFAULT '{}',
  observation_points TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 개별 학생 성취수준 테이블 (빠른 조회를 위한 정규화)
CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_evaluation_id UUID REFERENCES teacher_evaluations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  student_number INTEGER,
  
  -- 종합 성취수준
  overall_achievement_level VARCHAR(20) NOT NULL CHECK (
    overall_achievement_level IN ('매우잘함', '잘함', '보통', '노력요함')
  ),
  
  -- 영역별 성취수준 (선택사항)
  achievement_by_areas JSONB DEFAULT '{}',
  
  -- 평가 근거
  teacher_comment TEXT,
  specific_achievements TEXT[],
  improvement_areas TEXT[],
  
  -- 관찰 데이터 연결
  observation_session_ids UUID[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 성취수준 평가 템플릿 (학교/교과별 커스터마이징)
CREATE TABLE achievement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  grade VARCHAR(20),
  
  -- 평가 영역 정의
  evaluation_areas JSONB NOT NULL DEFAULT '[]',
  /* 
  예시:
  [
    {
      "area_name": "지식이해",
      "weight": 0.3,
      "criteria": {
        "매우잘함": "핵심 개념을 완벽히 이해하고 응용",
        "잘함": "주요 개념을 이해하고 설명 가능",
        "보통": "기본 개념을 이해",
        "노력요함": "기초 개념 이해에 도움 필요"
      }
    }
  ]
  */
  
  -- 종합 평가 가이드라인
  overall_guidelines JSONB DEFAULT '{}',
  
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 평가-생기부 연결 테이블
CREATE TABLE evaluation_record_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_evaluation_id UUID REFERENCES teacher_evaluations(id) ON DELETE CASCADE,
  survey_response_id UUID REFERENCES survey_responses(id),
  generated_content_id UUID REFERENCES generated_contents(id),
  
  -- 데이터 소스 가중치 (프롬프트 생성 시 활용)
  weights JSONB DEFAULT '{
    "evaluation_plan": 0.2,
    "student_self_assessment": 0.3,
    "teacher_evaluation": 0.5
  }',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_record_mappings ENABLE ROW LEVEL SECURITY;

-- teacher_evaluations 정책
CREATE POLICY "Users can manage own teacher evaluations" ON teacher_evaluations
  FOR ALL USING (auth.uid() = user_id);

-- student_achievements 정책
CREATE POLICY "Users can manage own student achievements" ON student_achievements
  FOR ALL USING (auth.uid() = user_id);

-- achievement_templates 정책
CREATE POLICY "Users can manage own achievement templates" ON achievement_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public achievement templates" ON achievement_templates
  FOR SELECT USING (is_public = true);

-- evaluation_record_mappings 정책
CREATE POLICY "Users can manage own evaluation mappings" ON evaluation_record_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teacher_evaluations te
      WHERE te.id = evaluation_record_mappings.teacher_evaluation_id
      AND te.user_id = auth.uid()
    )
  );

-- 인덱스 생성
CREATE INDEX idx_teacher_evaluations_user_plan ON teacher_evaluations(user_id, evaluation_plan_id);
CREATE INDEX idx_teacher_evaluations_class ON teacher_evaluations(class_id);
CREATE INDEX idx_teacher_evaluations_date ON teacher_evaluations(evaluation_date);

CREATE INDEX idx_student_achievements_evaluation ON student_achievements(teacher_evaluation_id);
CREATE INDEX idx_student_achievements_student ON student_achievements(user_id, student_name);
CREATE INDEX idx_student_achievements_level ON student_achievements(overall_achievement_level);

-- 트리거: 업데이트 시간 자동 갱신
CREATE TRIGGER update_teacher_evaluations_updated_at 
  BEFORE UPDATE ON teacher_evaluations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievement_templates_updated_at
  BEFORE UPDATE ON achievement_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기본 평가 템플릿 삽입 (국어 예시)
INSERT INTO achievement_templates (
  template_name, 
  subject, 
  grade,
  evaluation_areas,
  overall_guidelines,
  is_public
) VALUES (
  '국어과 성취수준 평가 기준',
  '국어',
  '초등',
  '[
    {
      "area_name": "듣기·말하기",
      "weight": 0.25,
      "criteria": {
        "매우잘함": "다양한 상황에서 적절하게 듣고 말하며, 자신의 생각을 논리적으로 표현함",
        "잘함": "일상적인 상황에서 효과적으로 듣고 말하며, 자신의 생각을 전달함",
        "보통": "기본적인 듣기와 말하기가 가능하며, 간단한 의사소통을 함",
        "노력요함": "듣기와 말하기에 어려움이 있어 지속적인 연습이 필요함"
      }
    },
    {
      "area_name": "읽기",
      "weight": 0.25,
      "criteria": {
        "매우잘함": "다양한 글을 읽고 내용을 정확히 이해하며, 비판적으로 사고함",
        "잘함": "학년 수준의 글을 읽고 주요 내용을 파악하며, 자신의 생각을 연결함",
        "보통": "기본적인 글을 읽고 대략적인 내용을 이해함",
        "노력요함": "글 읽기와 이해에 도움이 필요하며, 기초 읽기 능력 향상이 필요함"
      }
    },
    {
      "area_name": "쓰기",
      "weight": 0.25,
      "criteria": {
        "매우잘함": "목적에 맞게 체계적으로 글을 쓰며, 창의적인 표현을 활용함",
        "잘함": "주제에 맞게 글을 쓰며, 문단을 구성하여 표현함",
        "보통": "간단한 문장으로 자신의 생각을 표현함",
        "노력요함": "글쓰기에 어려움이 있어 기초적인 쓰기 연습이 필요함"
      }
    },
    {
      "area_name": "문법·문학",
      "weight": 0.25,
      "criteria": {
        "매우잘함": "국어 규범을 정확히 이해하고 활용하며, 문학 작품을 깊이 있게 감상함",
        "잘함": "기본적인 국어 규범을 알고 활용하며, 문학 작품의 주제를 파악함",
        "보통": "간단한 국어 규범을 이해하며, 문학 작품을 읽고 느낌을 표현함",
        "노력요함": "국어 규범과 문학 이해에 기초적인 학습이 필요함"
      }
    }
  ]'::jsonb,
  '{
    "종합평가지침": "4개 영역의 성취수준을 종합적으로 고려하되, 학생의 강점과 성장 가능성을 중심으로 평가",
    "가중치적용": "각 영역별 가중치를 적용하여 종합 성취수준 결정",
    "향상도고려": "이전 평가 대비 향상도를 긍정적으로 반영"
  }'::jsonb,
  true
);