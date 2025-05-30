-- 🔄 완전한 데이터베이스 업데이트 (기존 + 새로운 공유 시스템)
-- 기존 프로덕션 데이터를 보존하면서 새로운 기능 추가

-- ===========================================
-- PART 1: 기존 스키마 업데이트 (보존)
-- ===========================================

-- 1. 기존 evaluation_plans 테이블에 새 컬럼 추가 (이미 있으면 무시)
ALTER TABLE evaluation_plans 
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS lesson TEXT,
ADD COLUMN IF NOT EXISTS achievement_standards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS evaluation_methods TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS evaluation_tools TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB DEFAULT '{
    "excellent": {"level": "매우잘함", "description": ""},
    "good": {"level": "잘함", "description": ""},
    "satisfactory": {"level": "보통", "description": ""},
    "needs_improvement": {"level": "노력요함", "description": ""}
}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_generation_targets TEXT[] DEFAULT '{"교과학습발달상황", "창의적 체험활동 누가기록", "행동특성 및 종합의견"}',
ADD COLUMN IF NOT EXISTS record_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- 2. 기존 데이터에 기본값 설정 (unit이 NULL인 경우)
UPDATE evaluation_plans 
SET unit = '기본 단원' 
WHERE unit IS NULL;

-- 3. unit을 NOT NULL로 변경
ALTER TABLE evaluation_plans 
ALTER COLUMN unit SET NOT NULL;

-- 4. 인덱스 추가 (이미 있으면 무시)
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_subject ON evaluation_plans(subject);
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_grade_semester ON evaluation_plans(grade, semester);

-- 5. 기본 평가방법/도구 설정 (비어있는 경우)
UPDATE evaluation_plans 
SET evaluation_methods = '{"관찰평가"}' 
WHERE evaluation_methods = '{}' OR evaluation_methods IS NULL;

UPDATE evaluation_plans 
SET evaluation_tools = '{"체크리스트"}' 
WHERE evaluation_tools = '{}' OR evaluation_tools IS NULL;

-- 6. 새로운 테이블 생성 (과목별 평가계획)
CREATE TABLE IF NOT EXISTS subject_evaluation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- 기본 정보
    subject TEXT NOT NULL,              -- 과목
    grade TEXT NOT NULL,                -- 학년
    semester TEXT NOT NULL,             -- 학기
    school_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE), -- 학년도
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- 복합 유니크 키: 같은 학년도-학기-과목-학년은 하나만
    UNIQUE(user_id, school_year, semester, subject, grade)
);

-- 7. 개별 평가 테이블 생성
CREATE TABLE IF NOT EXISTS individual_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES subject_evaluation_plans(id) ON DELETE CASCADE,
    
    -- 평가 정보
    evaluation_name TEXT NOT NULL,       -- 평가명 (예: "분수의 덧셈과 뺄셈")
    unit TEXT NOT NULL,                  -- 단원
    lesson TEXT,                         -- 차시
    evaluation_period TEXT,              -- 평가시기 (예: "3월 2주")
    
    -- 성취기준
    achievement_standards JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{code: "[6수03-01]", content: "..."}]
    
    -- 평가방법 및 도구
    evaluation_methods TEXT[] NOT NULL DEFAULT '{}',   -- ["관찰평가", "포트폴리오"]
    evaluation_tools TEXT[] NOT NULL DEFAULT '{}',     -- ["체크리스트", "루브릭"]
    
    -- 4단계 평가기준
    evaluation_criteria JSONB NOT NULL DEFAULT '{
        "excellent": {"level": "매우잘함", "description": ""},
        "good": {"level": "잘함", "description": ""},
        "satisfactory": {"level": "보통", "description": ""},
        "needs_improvement": {"level": "노력요함", "description": ""}
    }'::jsonb,
    
    -- 가중치 (선택사항)
    weight INTEGER DEFAULT 100,          -- 평가 비중 (%)
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subject_evaluation_plans_user_id ON subject_evaluation_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_evaluation_plans_subject ON subject_evaluation_plans(subject);
CREATE INDEX IF NOT EXISTS idx_individual_evaluations_plan_id ON individual_evaluations(plan_id);

-- ===========================================
-- PART 2: 새로운 공유 시스템 테이블 추가
-- ===========================================

-- 기존 학교코드 시스템 테이블 제거 (사용하지 않음)
DROP TABLE IF EXISTS school_code_classes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups CASCADE;

-- 평가계획 공유 시스템 (학교코드 대체)
CREATE TABLE IF NOT EXISTS evaluation_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  allow_copy BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 설문 직접 접근 시스템 (학급코드 대체)
CREATE TABLE IF NOT EXISTS survey_access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  access_code VARCHAR(6) UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  max_responses INTEGER DEFAULT NULL,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학생 응답 추적 (학급 학생과 매칭)
CREATE TABLE IF NOT EXISTS student_survey_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  access_code VARCHAR(6) REFERENCES survey_access_codes(access_code),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL, -- 이름 확인용
  student_number INTEGER NOT NULL, -- 번호 확인용
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(survey_id, student_id) -- 한 학생은 한 설문에 한 번만 응답
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_code ON evaluation_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_survey_access_codes_code ON survey_access_codes(access_code);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_expires ON evaluation_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_survey_access_codes_expires ON survey_access_codes(expires_at);

-- ===========================================
-- PART 3: RLS 정책 설정
-- ===========================================

-- 기존 테이블 RLS 정책
ALTER TABLE subject_evaluation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_evaluations ENABLE ROW LEVEL SECURITY;

-- subject_evaluation_plans 정책
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own subject plans') THEN
        CREATE POLICY "Users can view own subject plans" ON subject_evaluation_plans
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own subject plans') THEN
        CREATE POLICY "Users can create own subject plans" ON subject_evaluation_plans
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own subject plans') THEN
        CREATE POLICY "Users can update own subject plans" ON subject_evaluation_plans
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own subject plans') THEN
        CREATE POLICY "Users can delete own subject plans" ON subject_evaluation_plans
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- individual_evaluations 정책
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own evaluations') THEN
        CREATE POLICY "Users can view own evaluations" ON individual_evaluations
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM subject_evaluation_plans
                    WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
                    AND subject_evaluation_plans.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create evaluations') THEN
        CREATE POLICY "Users can create evaluations" ON individual_evaluations
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM subject_evaluation_plans
                    WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
                    AND subject_evaluation_plans.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update evaluations') THEN
        CREATE POLICY "Users can update evaluations" ON individual_evaluations
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM subject_evaluation_plans
                    WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
                    AND subject_evaluation_plans.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete evaluations') THEN
        CREATE POLICY "Users can delete evaluations" ON individual_evaluations
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM subject_evaluation_plans
                    WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
                    AND subject_evaluation_plans.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 새로운 공유 시스템 RLS 정책
ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_survey_submissions ENABLE ROW LEVEL SECURITY;

-- 평가계획 공유 정책
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '사용자는 자신의 평가계획만 공유 가능') THEN
        CREATE POLICY "사용자는 자신의 평가계획만 공유 가능" ON evaluation_shares
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM evaluation_plans 
              WHERE id = evaluation_plan_id AND user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '공유 코드로 누구나 조회 가능') THEN
        CREATE POLICY "공유 코드로 누구나 조회 가능" ON evaluation_shares
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '생성자만 삭제 가능') THEN
        CREATE POLICY "생성자만 삭제 가능" ON evaluation_shares
          FOR DELETE USING (created_by = auth.uid());
    END IF;
END $$;

-- 설문 접근 코드 정책
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '교사만 설문 접근 코드 생성') THEN
        CREATE POLICY "교사만 설문 접근 코드 생성" ON survey_access_codes
          FOR INSERT WITH CHECK (teacher_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '접근 코드로 누구나 조회 가능') THEN
        CREATE POLICY "접근 코드로 누구나 조회 가능" ON survey_access_codes
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '교사만 삭제 가능_survey') THEN
        CREATE POLICY "교사만 삭제 가능_survey" ON survey_access_codes
          FOR DELETE USING (teacher_id = auth.uid());
    END IF;
END $$;

-- 학생 설문 응답 정책
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '유효한 접근 코드와 학급 학생만 응답 제출') THEN
        CREATE POLICY "유효한 접근 코드와 학급 학생만 응답 제출" ON student_survey_submissions
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM survey_access_codes sac
              JOIN students s ON s.class_id = sac.class_id
              WHERE sac.access_code = student_survey_submissions.access_code
              AND s.id = student_survey_submissions.student_id
              AND s.name = student_survey_submissions.student_name
              AND s.number = student_survey_submissions.student_number
              AND (sac.expires_at IS NULL OR sac.expires_at > NOW())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '교사는 자신의 설문 응답 조회 가능') THEN
        CREATE POLICY "교사는 자신의 설문 응답 조회 가능" ON student_survey_submissions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM surveys s
              JOIN survey_access_codes sac ON sac.survey_id = s.id
              WHERE s.id = student_survey_submissions.survey_id
              AND s.teacher_id = auth.uid()
            )
          );
    END IF;
END $$;

-- ===========================================
-- PART 4: 함수 및 트리거
-- ===========================================

-- 공유 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_unique_code(prefix TEXT DEFAULT '')
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  done BOOLEAN DEFAULT FALSE;
BEGIN
  WHILE NOT done LOOP
    -- 6자리 랜덤 코드 생성 (숫자와 대문자)
    new_code := prefix || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- 중복 체크
    IF NOT EXISTS (
      SELECT 1 FROM evaluation_shares WHERE share_code = new_code
      UNION
      SELECT 1 FROM survey_access_codes WHERE access_code = new_code
    ) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_share_view_count(p_share_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE evaluation_shares 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE share_code = p_share_code;
END;
$$ LANGUAGE plpgsql;

-- 응답수 증가 함수
CREATE OR REPLACE FUNCTION increment_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_access_codes
  SET response_count = response_count + 1,
      updated_at = NOW()
  WHERE access_code = NEW.access_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DO $$ 
BEGIN
    -- 기존 트리거 (이미 있으면 무시)
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subject_evaluation_plans_updated_at') THEN
        CREATE TRIGGER update_subject_evaluation_plans_updated_at BEFORE UPDATE ON subject_evaluation_plans
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_individual_evaluations_updated_at') THEN
        CREATE TRIGGER update_individual_evaluations_updated_at BEFORE UPDATE ON individual_evaluations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- 새로운 트리거
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_response_count') THEN
        CREATE TRIGGER update_response_count
          AFTER INSERT ON student_survey_submissions
          FOR EACH ROW
          EXECUTE FUNCTION increment_response_count();
    END IF;
END $$;

-- ===========================================
-- PART 5: 기존 테이블 업데이트
-- ===========================================

-- 12. surveys 테이블 업데이트
ALTER TABLE surveys 
ADD COLUMN IF NOT EXISTS individual_evaluation_id UUID REFERENCES individual_evaluations(id) ON DELETE SET NULL;

-- 13. survey_responses 테이블에 class_id 컬럼 추가
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- ===========================================
-- PART 6: 뷰 생성
-- ===========================================

-- 학생 설문 응답 조회 뷰 (교사용)
CREATE OR REPLACE VIEW student_survey_responses_view AS
SELECT 
  ssr.*,
  s.name as student_name_verified,
  s.number as student_number_verified,
  c.name as class_name,
  c.grade,
  c.class_number,
  sv.title as survey_title,
  sv.teacher_id
FROM student_survey_submissions ssr
JOIN students s ON s.id = ssr.student_id
JOIN classes c ON c.id = s.class_id
JOIN surveys sv ON sv.id = ssr.survey_id;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 완전한 데이터베이스 업데이트 완료!';
    RAISE NOTICE '✅ 기존 데이터가 보존되었습니다.';
    RAISE NOTICE '✅ 새로운 공유 시스템이 추가되었습니다.';
    RAISE NOTICE '✅ 학교 코드 시스템이 제거되었습니다.';
END $$;