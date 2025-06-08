-- 💡 생기부 AI 도우미 고도화 - 단순화된 마이그레이션
-- 🎯 교사 평가(성취수준) + 키워드 기반 관찰 기록 시스템
-- 📅 실행일: 2025년 1월
--

-- ===========================================
-- 1️⃣ 테이블 생성
-- ===========================================

-- 관찰 키워드 카테고리 테이블
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

-- 관찰 세션 테이블
CREATE TABLE IF NOT EXISTS observation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  subject VARCHAR(50),
  lesson_topic VARCHAR(200),
  students_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 일상 관찰 기록 테이블
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

-- 관찰 분석 결과 테이블
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

-- 관찰 템플릿 테이블
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

-- 교사 평가 테이블
CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluation_name VARCHAR(200),
  evaluation_period VARCHAR(100),
  student_achievements JSONB NOT NULL DEFAULT '[]',
  evaluation_criteria JSONB DEFAULT '{}',
  observation_points TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 개별 학생 성취수준 테이블
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_evaluation_id UUID REFERENCES teacher_evaluations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  student_number INTEGER,
  overall_achievement_level VARCHAR(20) NOT NULL CHECK (
    overall_achievement_level IN ('매우잘함', '잘함', '보통', '노력요함')
  ),
  achievement_by_areas JSONB DEFAULT '{}',
  teacher_comment TEXT,
  specific_achievements TEXT[],
  improvement_areas TEXT[],
  observation_session_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 성취수준 평가 템플릿 테이블
CREATE TABLE IF NOT EXISTS achievement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  grade VARCHAR(20),
  evaluation_areas JSONB NOT NULL DEFAULT '[]',
  overall_guidelines JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 평가-생기부 연결 테이블
CREATE TABLE IF NOT EXISTS evaluation_record_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_evaluation_id UUID REFERENCES teacher_evaluations(id) ON DELETE CASCADE,
  survey_response_id UUID REFERENCES survey_responses(id),
  generated_content_id UUID REFERENCES generated_contents(id),
  weights JSONB DEFAULT '{
    "evaluation_plan": 0.2,
    "student_self_assessment": 0.3,
    "teacher_evaluation": 0.5
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 2️⃣ RLS 정책 설정
-- ===========================================

ALTER TABLE observation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_record_mappings ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3️⃣ 기본 데이터 삽입 (간단한 방식)
-- ===========================================

-- 학습태도 카테고리 삽입
INSERT INTO observation_categories (name, description, keywords, order_index, color) 
SELECT 
  '학습태도',
  '수업 참여도, 집중력, 과제 수행 등',
  '[]'::jsonb,
  1,
  'blue'
WHERE NOT EXISTS (
  SELECT 1 FROM observation_categories WHERE name = '학습태도'
);

-- 대인관계 카테고리 삽입
INSERT INTO observation_categories (name, description, keywords, order_index, color) 
SELECT 
  '대인관계',
  '협력, 배려, 소통 능력 등',
  '[]'::jsonb,
  2,
  'green'
WHERE NOT EXISTS (
  SELECT 1 FROM observation_categories WHERE name = '대인관계'
);

-- 국어과 평가 템플릿 삽입
INSERT INTO achievement_templates (template_name, subject, grade, evaluation_areas, overall_guidelines, is_public) 
SELECT 
  '국어과 성취수준 평가 기준',
  '국어',
  '초등',
  '[]'::jsonb,
  '{}'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM achievement_templates WHERE template_name = '국어과 성취수준 평가 기준'
);

-- ===========================================
-- 4️⃣ 완료 메시지
-- ===========================================

SELECT 
  '🎯 생기부 AI 도우미 고도화 완료!' as status,
  '✅ 교사 평가(성취수준) 시스템 추가' as feature_1,
  '✅ 키워드 기반 관찰 기록 시스템 추가' as feature_2,
  '✅ 3개 데이터 소스 통합 워크플로우 구현' as feature_3,
  NOW() as completed_at;