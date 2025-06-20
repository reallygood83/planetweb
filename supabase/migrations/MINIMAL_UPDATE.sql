-- 🔧 최소한의 필수 업데이트 (students 테이블 없이)
-- 기존 데이터베이스 구조에 맞춰서 새로운 공유 시스템만 추가

-- ===========================================
-- PART 1: 기존 학교코드 시스템 테이블 제거
-- ===========================================

-- 기존 학교코드 시스템 테이블 제거 (사용하지 않음)
DROP TABLE IF EXISTS school_code_classes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups CASCADE;

-- ===========================================
-- PART 2: 새로운 공유 시스템 테이블 추가 (students 없이)
-- ===========================================

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

-- 설문 직접 접근 시스템 (학급코드 대체) - 단순화
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

-- 익명 설문 응답 (students 테이블 없이)
CREATE TABLE IF NOT EXISTS anonymous_survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  access_code VARCHAR(6) REFERENCES survey_access_codes(access_code),
  student_name TEXT NOT NULL,
  student_number INTEGER NOT NULL,
  class_name TEXT,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  -- 같은 설문에 같은 번호/이름으로 중복 응답 방지
  UNIQUE(survey_id, access_code, student_number, student_name)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_code ON evaluation_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_survey_access_codes_code ON survey_access_codes(access_code);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_expires ON evaluation_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_survey_access_codes_expires ON survey_access_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_responses_survey ON anonymous_survey_responses(survey_id);

-- ===========================================
-- PART 3: RLS 정책 설정
-- ===========================================

-- 새로운 공유 시스템 RLS 정책
ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_survey_responses ENABLE ROW LEVEL SECURITY;

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
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '접근 코드로 누구나 조회 가능2') THEN
        CREATE POLICY "접근 코드로 누구나 조회 가능2" ON survey_access_codes
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '교사만 삭제 가능_survey2') THEN
        CREATE POLICY "교사만 삭제 가능_survey2" ON survey_access_codes
          FOR DELETE USING (teacher_id = auth.uid());
    END IF;
END $$;

-- 익명 설문 응답 정책
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '유효한 접근 코드로 익명 응답 제출') THEN
        CREATE POLICY "유효한 접근 코드로 익명 응답 제출" ON anonymous_survey_responses
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM survey_access_codes 
              WHERE access_code = anonymous_survey_responses.access_code
              AND (expires_at IS NULL OR expires_at > NOW())
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '교사는 자신의 설문 응답 조회 가능2') THEN
        CREATE POLICY "교사는 자신의 설문 응답 조회 가능2" ON anonymous_survey_responses
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM surveys s
              JOIN survey_access_codes sac ON sac.survey_id = s.id
              WHERE s.id = anonymous_survey_responses.survey_id
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
    -- 새로운 트리거
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_response_count') THEN
        CREATE TRIGGER update_response_count
          AFTER INSERT ON anonymous_survey_responses
          FOR EACH ROW
          EXECUTE FUNCTION increment_response_count();
    END IF;
END $$;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 최소한의 공유 시스템 업데이트 완료!';
    RAISE NOTICE '✅ 학교 코드 시스템이 제거되었습니다.';
    RAISE NOTICE '✅ 평가계획 공유 기능이 추가되었습니다.';
    RAISE NOTICE '✅ 설문 접근 코드 기능이 추가되었습니다.';
    RAISE NOTICE '✅ 익명 설문 응답 기능이 추가되었습니다.';
END $$;