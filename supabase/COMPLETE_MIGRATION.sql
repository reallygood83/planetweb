-- 💡 생기부 AI 도우미 고도화 - 완전 통합 마이그레이션
-- 🎯 교사 평가(성취수준) + 키워드 기반 관찰 기록 시스템
-- 📅 실행일: 2025년 1월
-- 
-- ⚠️ 중요: 이 파일을 Supabase SQL Editor에서 전체 복사-붙여넣기로 실행하세요
-- 📍 https://supabase.com/dashboard/project/cywpnewvxjjjicheahaw/sql
--

-- ===========================================
-- 1️⃣ 관찰 기록 시스템 (014_add_observation_system.sql)
-- ===========================================

-- 1. 관찰 키워드 카테고리 테이블
CREATE TABLE IF NOT EXISTS observation_categories (
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
CREATE TABLE IF NOT EXISTS observation_sessions (
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
CREATE TABLE IF NOT EXISTS daily_observations (
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
CREATE TABLE IF NOT EXISTS observation_analysis (
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
CREATE TABLE IF NOT EXISTS observation_templates (
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

-- ===========================================
-- 2️⃣ 교사 평가(성취수준) 시스템 (015_add_teacher_evaluations.sql)
-- ===========================================

-- 1. 교사 평가 테이블 (평가계획별 학생 성취수준)
CREATE TABLE IF NOT EXISTS teacher_evaluations (
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
CREATE TABLE IF NOT EXISTS student_achievements (
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
CREATE TABLE IF NOT EXISTS achievement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  grade VARCHAR(20),
  
  -- 평가 영역 정의
  evaluation_areas JSONB NOT NULL DEFAULT '[]',
  
  -- 종합 평가 가이드라인
  overall_guidelines JSONB DEFAULT '{}',
  
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 평가-생기부 연결 테이블
CREATE TABLE IF NOT EXISTS evaluation_record_mappings (
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

-- ===========================================
-- 3️⃣ RLS (Row Level Security) 정책 설정
-- ===========================================

-- 관찰 기록 시스템 RLS
ALTER TABLE observation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_templates ENABLE ROW LEVEL SECURITY;

-- 교사 평가 시스템 RLS
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_record_mappings ENABLE ROW LEVEL SECURITY;

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

-- ===========================================
-- 4️⃣ 인덱스 생성 (성능 최적화)
-- ===========================================

-- 관찰 기록 시스템 인덱스
CREATE INDEX IF NOT EXISTS idx_observation_sessions_user_class ON observation_sessions(user_id, class_id);
CREATE INDEX IF NOT EXISTS idx_observation_sessions_date ON observation_sessions(session_date);

CREATE INDEX IF NOT EXISTS idx_daily_observations_user_student ON daily_observations(user_id, student_name);
CREATE INDEX IF NOT EXISTS idx_daily_observations_date ON daily_observations(observation_date);
CREATE INDEX IF NOT EXISTS idx_daily_observations_keyword ON daily_observations(category_id, keyword_id);

CREATE INDEX IF NOT EXISTS idx_observation_analysis_user_student ON observation_analysis(user_id, student_name);
CREATE INDEX IF NOT EXISTS idx_observation_analysis_period ON observation_analysis(analysis_period_start, analysis_period_end);

-- 교사 평가 시스템 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_user_plan ON teacher_evaluations(user_id, evaluation_plan_id);
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_class ON teacher_evaluations(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_date ON teacher_evaluations(evaluation_date);

CREATE INDEX IF NOT EXISTS idx_student_achievements_evaluation ON student_achievements(teacher_evaluation_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(user_id, student_name);
CREATE INDEX IF NOT EXISTS idx_student_achievements_level ON student_achievements(overall_achievement_level);

-- ===========================================
-- 5️⃣ 트리거 함수 및 트리거 설정
-- ===========================================

-- 트리거 함수: 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
DROP TRIGGER IF EXISTS update_observation_sessions_updated_at ON observation_sessions;
CREATE TRIGGER update_observation_sessions_updated_at 
  BEFORE UPDATE ON observation_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_observation_templates_updated_at ON observation_templates;
CREATE TRIGGER update_observation_templates_updated_at
  BEFORE UPDATE ON observation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_evaluations_updated_at ON teacher_evaluations;
CREATE TRIGGER update_teacher_evaluations_updated_at 
  BEFORE UPDATE ON teacher_evaluations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_achievement_templates_updated_at ON achievement_templates;
CREATE TRIGGER update_achievement_templates_updated_at
  BEFORE UPDATE ON achievement_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 6️⃣ 기본 데이터 삽입
-- ===========================================

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
) ON CONFLICT DO NOTHING,
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
) ON CONFLICT DO NOTHING;

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
) ON CONFLICT DO NOTHING;

-- ===========================================
-- 🎉 마이그레이션 완료!
-- ===========================================

-- 💡 다음 단계:
-- 1. npm run dev 로 개발 서버 실행
-- 2. /dashboard/teacher-evaluation 에서 성취수준 입력 테스트
-- 3. /dashboard/observation-records 에서 관찰 기록 테스트
-- 4. /api/records/generate-enhanced 로 통합 생기부 생성 테스트

SELECT 
  '🎯 생기부 AI 도우미 고도화 완료!' as status,
  '✅ 교사 평가(성취수준) 시스템 추가' as feature_1,
  '✅ 키워드 기반 관찰 기록 시스템 추가' as feature_2,
  '✅ 3개 데이터 소스 통합 워크플로우 구현' as feature_3,
  NOW() as completed_at;