-- 관찰 기록 시스템 테이블 추가
-- 실행: Supabase SQL Editor에서 실행

-- 1. 관찰 키워드 카테고리 테이블
CREATE TABLE observation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  keywords JSONB NOT NULL DEFAULT '[]',
  order_index INTEGER DEFAULT 0,
  color VARCHAR(20) DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 관찰 세션 테이블 (수업별 관찰 기록)
CREATE TABLE observation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  subject VARCHAR(50),
  lesson_topic VARCHAR(200),
  students_data JSONB NOT NULL DEFAULT '[]', -- StudentObservation 배열
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 일상 관찰 기록 테이블 (개별 관찰 누적)
CREATE TABLE daily_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  observation_date DATE NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  keyword_id VARCHAR(50) NOT NULL,
  intensity INTEGER DEFAULT 2 CHECK (intensity IN (1,2,3)),
  context TEXT,
  subject VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 관찰 분석 결과 테이블 (AI 분석 결과 저장)
CREATE TABLE observation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  categories_analysis JSONB NOT NULL DEFAULT '{}',
  summary JSONB NOT NULL DEFAULT '{}',
  generated_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 관찰 템플릿 테이블 (사용자 정의 키워드)
CREATE TABLE observation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  description TEXT,
  custom_keywords JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE observation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_templates ENABLE ROW LEVEL SECURITY;

-- observation_sessions 정책
CREATE POLICY "Users can manage own observation sessions" ON observation_sessions
  FOR ALL USING (auth.uid() = user_id);

-- daily_observations 정책  
CREATE POLICY "Users can manage own daily observations" ON daily_observations
  FOR ALL USING (auth.uid() = user_id);

-- observation_analysis 정책
CREATE POLICY "Users can manage own observation analysis" ON observation_analysis
  FOR ALL USING (auth.uid() = user_id);

-- observation_templates 정책
CREATE POLICY "Users can manage own templates" ON observation_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON observation_templates
  FOR SELECT USING (is_public = true);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_observation_sessions_user_class ON observation_sessions(user_id, class_id);
CREATE INDEX idx_observation_sessions_date ON observation_sessions(session_date);

CREATE INDEX idx_daily_observations_user_student ON daily_observations(user_id, student_name);
CREATE INDEX idx_daily_observations_date ON daily_observations(observation_date);
CREATE INDEX idx_daily_observations_keyword ON daily_observations(category_id, keyword_id);

CREATE INDEX idx_observation_analysis_user_student ON observation_analysis(user_id, student_name);
CREATE INDEX idx_observation_analysis_period ON observation_analysis(analysis_period_start, analysis_period_end);

-- 기본 관찰 카테고리 데이터 삽입
INSERT INTO observation_categories (name, description, keywords, order_index, color) VALUES
(
  '학습태도',
  '수업 참여도, 집중력, 과제 수행 등',
  '[
    {
      "id": "active_participation",
      "text": "적극적 참여",
      "weight": 5,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "수업에 적극적으로 참여하며",
      "description": "발표, 질문, 토론 등에 능동적 참여"
    },
    {
      "id": "high_concentration", 
      "text": "집중력 우수",
      "weight": 4,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "높은 집중력을 보이며",
      "description": "수업 시간 내내 집중하여 참여"
    },
    {
      "id": "frequent_questions",
      "text": "질문 빈도 높음",
      "weight": 4,
      "frequency": 0,
      "positivity": "positive", 
      "autoText": "궁금한 점을 적극적으로 질문하며",
      "description": "호기심을 바탕으로 한 적극적 질문"
    },
    {
      "id": "task_completion",
      "text": "과제 성실 수행",
      "weight": 4,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "주어진 과제를 성실히 수행하고",
      "description": "과제를 빠짐없이 완성하여 제출"
    },
    {
      "id": "attention_needed",
      "text": "집중력 개선 필요",
      "weight": 3,
      "frequency": 0,
      "positivity": "improvement",
      "autoText": "수업 집중력 향상이 기대되며",
      "description": "주의가 산만하거나 집중 시간이 짧음"
    }
  ]'::jsonb,
  1,
  'blue'
),
(
  '대인관계',
  '협력, 배려, 소통 능력 등',
  '[
    {
      "id": "collaborative",
      "text": "협력적", 
      "weight": 5,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "친구들과 협력하여",
      "description": "모둠 활동에서 잘 협력함"
    },
    {
      "id": "caring",
      "text": "배려심 많음",
      "weight": 4,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "친구들을 배려하는 마음으로",
      "description": "다른 학생들을 잘 도와줌"
    },
    {
      "id": "leadership",
      "text": "리더십 발휘",
      "weight": 5,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "모둠을 이끌어가는 리더십을 보이며",
      "description": "모둠 활동에서 주도적 역할"
    },
    {
      "id": "communication_skills",
      "text": "의사소통 능력",
      "weight": 4,
      "frequency": 0,
      "positivity": "positive",
      "autoText": "자신의 생각을 명확히 표현하고",
      "description": "자신의 의견을 잘 전달함"
    }
  ]'::jsonb,
  2,
  'green'
);

-- 트리거 함수: 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_observation_sessions_updated_at 
  BEFORE UPDATE ON observation_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observation_templates_updated_at
  BEFORE UPDATE ON observation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();