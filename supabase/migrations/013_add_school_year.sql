-- 평가계획 테이블에 학년도 컬럼 추가
-- 이 파일을 Supabase Dashboard의 SQL Editor에서 실행하세요

-- school_year 컬럼 추가 (기본값은 현재 년도)
ALTER TABLE evaluation_plans 
ADD COLUMN IF NOT EXISTS school_year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT;

-- 기존 데이터에 현재 년도 설정 (NULL인 경우만)
UPDATE evaluation_plans 
SET school_year = EXTRACT(YEAR FROM created_at)::TEXT 
WHERE school_year IS NULL;

-- NOT NULL 제약조건 추가
ALTER TABLE evaluation_plans 
ALTER COLUMN school_year SET NOT NULL;

-- 학년도별 조회를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_school_year ON evaluation_plans(school_year);

-- 사용자별 + 학년도별 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_user_year ON evaluation_plans(user_id, school_year);

-- 실행 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ evaluation_plans 테이블에 school_year 컬럼이 추가되었습니다!';
  RAISE NOTICE '✅ 기존 데이터는 생성일 기준으로 학년도가 자동 설정되었습니다.';
  RAISE NOTICE '✅ 이제 학년도별 평가계획 관리가 가능합니다.';
END $$;