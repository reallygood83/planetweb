-- ⚠️ 이 SQL을 Supabase SQL Editor에서 실행해주세요! ⚠️
-- Dashboard > SQL Editor에서 새 쿼리를 만들고 아래 내용을 모두 복사해서 실행하세요.

-- 기존 테이블이 있다면 삭제 (주의: 데이터가 삭제됩니다)
DROP TABLE IF EXISTS student_survey_submissions CASCADE;
DROP TABLE IF EXISTS survey_access_codes CASCADE;
DROP TABLE IF EXISTS evaluation_shares CASCADE;

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

-- RLS 정책 (간단하게)
ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_survey_submissions ENABLE ROW LEVEL SECURITY;

-- 평가계획 공유 정책
CREATE POLICY "사용자는 자신의 평가계획만 공유 가능" ON evaluation_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluation_plans 
      WHERE id = evaluation_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "공유 코드로 누구나 조회 가능" ON evaluation_shares
  FOR SELECT USING (true);

CREATE POLICY "생성자만 삭제 가능" ON evaluation_shares
  FOR DELETE USING (created_by = auth.uid());

-- 설문 접근 코드 정책
CREATE POLICY "교사만 설문 접근 코드 생성" ON survey_access_codes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "접근 코드로 누구나 조회 가능" ON survey_access_codes
  FOR SELECT USING (true);

CREATE POLICY "교사만 삭제 가능" ON survey_access_codes
  FOR DELETE USING (teacher_id = auth.uid());

-- 학생 설문 응답 정책
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

CREATE POLICY "교사는 자신의 설문 응답 조회 가능" ON student_survey_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM surveys s
      JOIN survey_access_codes sac ON sac.survey_id = s.id
      WHERE s.id = student_survey_submissions.survey_id
      AND s.teacher_id = auth.uid()
    )
  );

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

CREATE TRIGGER update_response_count
  AFTER INSERT ON student_survey_submissions
  FOR EACH ROW
  EXECUTE FUNCTION increment_response_count();

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

-- 실행 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 새로운 공유 시스템 테이블이 성공적으로 생성되었습니다!';
  RAISE NOTICE '✅ 이제 평가계획 공유와 설문 접근 기능을 사용할 수 있습니다.';
END $$;