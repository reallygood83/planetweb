-- classes 테이블에 school_code 필드 추가
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS school_code VARCHAR(6);

-- 인덱스 생성 (학급 코드로 빠른 검색을 위해)
CREATE INDEX IF NOT EXISTS idx_classes_school_code ON classes(school_code);

-- 기존 학급에 코드 생성 (코드가 없는 경우)
DO $$
DECLARE
  class_record RECORD;
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  FOR class_record IN SELECT id FROM classes WHERE school_code IS NULL
  LOOP
    -- 고유한 6자리 코드 생성
    LOOP
      -- 랜덤 6자리 영숫자 코드 생성
      new_code := UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6)
      );
      
      -- 중복 확인
      SELECT EXISTS(SELECT 1 FROM classes WHERE school_code = new_code) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- 코드 업데이트
    UPDATE classes SET school_code = new_code WHERE id = class_record.id;
  END LOOP;
END $$;

-- 학급 코드를 고유하게 설정 (중복 방지)
ALTER TABLE classes 
ADD CONSTRAINT unique_school_code UNIQUE(school_code);