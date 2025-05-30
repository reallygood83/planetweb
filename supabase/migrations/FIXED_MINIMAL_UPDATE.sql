-- 🔧 수정된 최소 업데이트 (surveys.teacher_id 오류 해결)
-- 현재 데이터베이스 구조에 맞춰서 수정

-- ===========================================
-- PART 1: 기존 학교코드 시스템 테이블 제거
-- ===========================================

DROP TABLE IF EXISTS school_code_classes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups CASCADE;

-- ===========================================
-- PART 2: 새로운 공유 시스템 테이블 추가
-- ===========================================

-- 평가계획 공유 시스템
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

-- 설문 직접 접근 시스템
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

-- 익명 설문 응답
CREATE TABLE IF NOT EXISTS anonymous_survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  access_code VARCHAR(6) REFERENCES survey_access_codes(access_code),
  student_name TEXT NOT NULL,
  student_number INTEGER NOT NULL,
  class_name TEXT,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
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

ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_survey_responses ENABLE ROW LEVEL SECURITY;

-- 평가계획 공유 정책
CREATE POLICY "평가계획_공유_삽입" ON evaluation_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluation_plans 
      WHERE id = evaluation_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "평가계획_공유_조회" ON evaluation_shares
  FOR SELECT USING (true);

CREATE POLICY "평가계획_공유_삭제" ON evaluation_shares
  FOR DELETE USING (created_by = auth.uid());

-- 설문 접근 코드 정책
CREATE POLICY "설문코드_생성" ON survey_access_codes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "설문코드_조회" ON survey_access_codes
  FOR SELECT USING (true);

CREATE POLICY "설문코드_삭제" ON survey_access_codes
  FOR DELETE USING (teacher_id = auth.uid());

-- 익명 설문 응답 정책 (수정된 버전)
CREATE POLICY "익명응답_제출" ON anonymous_survey_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_access_codes 
      WHERE access_code = anonymous_survey_responses.access_code
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- 수정: survey_access_codes의 teacher_id 사용
CREATE POLICY "익명응답_조회" ON anonymous_survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survey_access_codes sac
      WHERE sac.survey_id = anonymous_survey_responses.survey_id
      AND sac.teacher_id = auth.uid()
    )
  );

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
    new_code := prefix || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
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
CREATE TRIGGER update_response_count
  AFTER INSERT ON anonymous_survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_response_count();

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 수정된 공유 시스템이 성공적으로 설치되었습니다!';
    RAISE NOTICE '✅ 학교 코드 시스템이 제거되었습니다.';
    RAISE NOTICE '✅ 평가계획 공유 기능이 추가되었습니다.';
    RAISE NOTICE '✅ 설문 접근 코드 기능이 추가되었습니다.';
    RAISE NOTICE '✅ 익명 설문 응답 기능이 추가되었습니다.';
END $$;