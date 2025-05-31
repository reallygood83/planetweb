-- ===========================================
-- 최종 학생 응답 조회 문제 해결
-- ===========================================

-- 1. classes 테이블에 school_code 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'school_code'
    ) THEN
        ALTER TABLE classes ADD COLUMN school_code VARCHAR(6);
        RAISE NOTICE '✅ classes 테이블에 school_code 컬럼 추가됨';
    ELSE
        RAISE NOTICE 'ℹ️ classes 테이블에 school_code 컬럼이 이미 존재함';
    END IF;
END $$;

-- 2. survey_responses 테이블에 school_code 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'survey_responses' AND column_name = 'school_code'
    ) THEN
        ALTER TABLE survey_responses ADD COLUMN school_code VARCHAR(6);
        RAISE NOTICE '✅ survey_responses 테이블에 school_code 컬럼 추가됨';
    ELSE
        RAISE NOTICE 'ℹ️ survey_responses 테이블에 school_code 컬럼이 이미 존재함';
    END IF;
END $$;

-- 3. 기존 classes에 school_code 생성 (없는 경우)
DO $$
DECLARE
    class_record RECORD;
    new_code VARCHAR(6);
    code_exists BOOLEAN;
BEGIN
    FOR class_record IN 
        SELECT id, class_name FROM classes WHERE school_code IS NULL
    LOOP
        -- 유니크한 6자리 코드 생성
        LOOP
            new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || class_record.id::TEXT) FROM 1 FOR 6));
            
            SELECT EXISTS(
                SELECT 1 FROM classes WHERE school_code = new_code
            ) INTO code_exists;
            
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        UPDATE classes 
        SET school_code = new_code 
        WHERE id = class_record.id;
        
        RAISE NOTICE '생성된 학교코드: % -> %', class_record.class_name, new_code;
    END LOOP;
END $$;

-- 4. survey_responses 데이터 정리
DO $$
DECLARE
    v_updated_count INTEGER := 0;
    response_record RECORD;
    matching_class RECORD;
BEGIN
    -- class_name이 6자리 코드 패턴인 경우 처리
    FOR response_record IN 
        SELECT id, class_name, survey_id 
        FROM survey_responses 
        WHERE class_name ~ '^[A-Z0-9]{6}$' AND school_code IS NULL
    LOOP
        -- 해당 설문의 작성자와 매칭되는 학급 찾기
        SELECT c.class_name, c.school_code
        INTO matching_class
        FROM classes c
        INNER JOIN surveys s ON s.user_id = c.user_id
        WHERE s.id = response_record.survey_id 
        AND c.school_code = response_record.class_name
        LIMIT 1;
        
        IF matching_class.class_name IS NOT NULL THEN
            UPDATE survey_responses 
            SET 
                school_code = response_record.class_name,
                class_name = matching_class.class_name
            WHERE id = response_record.id;
            
            v_updated_count := v_updated_count + 1;
            RAISE NOTICE '응답 수정: % -> 학급명: %, 학교코드: %', 
                response_record.class_name, matching_class.class_name, response_record.class_name;
        ELSE
            -- 매칭되는 학급이 없는 경우 school_code만 설정
            UPDATE survey_responses 
            SET school_code = response_record.class_name
            WHERE id = response_record.id;
            
            RAISE NOTICE '학교코드만 설정: %', response_record.class_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ 총 %개의 응답이 수정되었습니다', v_updated_count;
END $$;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_classes_school_code ON classes(school_code);
CREATE INDEX IF NOT EXISTS idx_survey_responses_school_code ON survey_responses(school_code);
CREATE INDEX IF NOT EXISTS idx_survey_responses_class_name ON survey_responses(class_name);
CREATE INDEX IF NOT EXISTS idx_survey_responses_student_name ON survey_responses(student_name);

-- 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_student ON survey_responses(survey_id, student_name);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_class ON survey_responses(survey_id, class_name);

-- 6. 트리거 함수: 새로운 응답의 school_code 자동 설정
CREATE OR REPLACE FUNCTION auto_set_school_code()
RETURNS TRIGGER AS $$
DECLARE
    matching_class RECORD;
BEGIN
    -- class_name이 6자리 코드 패턴이고 school_code가 없는 경우
    IF NEW.class_name ~ '^[A-Z0-9]{6}$' AND NEW.school_code IS NULL THEN
        -- 실제 학급명 찾기
        SELECT c.class_name, c.school_code
        INTO matching_class
        FROM classes c
        INNER JOIN surveys s ON s.user_id = c.user_id
        WHERE s.id = NEW.survey_id 
        AND c.school_code = NEW.class_name
        LIMIT 1;
        
        IF matching_class.class_name IS NOT NULL THEN
            NEW.school_code := NEW.class_name;
            NEW.class_name := matching_class.class_name;
            RAISE NOTICE '자동 수정: 학급명을 %로, 학교코드를 %로 설정', 
                NEW.class_name, NEW.school_code;
        ELSE
            -- 매칭되는 학급이 없으면 school_code만 설정
            NEW.school_code := NEW.class_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 트리거 생성
DROP TRIGGER IF EXISTS auto_set_school_code_trigger ON survey_responses;
CREATE TRIGGER auto_set_school_code_trigger
    BEFORE INSERT OR UPDATE ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_school_code();

-- 8. 뷰 생성: 개선된 학생 응답 조회
CREATE OR REPLACE VIEW v_enhanced_student_responses AS
SELECT 
    sr.id,
    sr.survey_id,
    sr.student_name,
    sr.class_name,
    sr.school_code,
    sr.responses,
    sr.submitted_at,
    s.title as survey_title,
    s.questions as survey_questions,
    s.evaluation_plan_id,
    s.user_id as teacher_id,
    ep.subject,
    ep.grade,
    ep.semester,
    ep.unit,
    c.id as matched_class_id,
    c.class_name as actual_class_name
FROM 
    survey_responses sr
    INNER JOIN surveys s ON sr.survey_id = s.id
    LEFT JOIN evaluation_plans ep ON s.evaluation_plan_id = ep.id
    LEFT JOIN classes c ON (
        c.user_id = s.user_id 
        AND (
            c.class_name = sr.class_name OR 
            c.school_code = sr.school_code OR 
            (sr.school_code IS NULL AND c.school_code = sr.class_name)
        )
    );

-- 9. 데이터 검증 및 통계
DO $$
DECLARE
    v_total_responses INTEGER;
    v_responses_with_school_code INTEGER;
    v_responses_with_matching_class INTEGER;
    v_total_classes INTEGER;
    v_classes_with_school_code INTEGER;
BEGIN
    -- 통계 수집
    SELECT COUNT(*) INTO v_total_responses FROM survey_responses;
    SELECT COUNT(*) INTO v_responses_with_school_code FROM survey_responses WHERE school_code IS NOT NULL;
    SELECT COUNT(*) INTO v_total_classes FROM classes;
    SELECT COUNT(*) INTO v_classes_with_school_code FROM classes WHERE school_code IS NOT NULL;
    
    SELECT COUNT(*) INTO v_responses_with_matching_class
    FROM survey_responses sr
    INNER JOIN surveys s ON sr.survey_id = s.id
    INNER JOIN classes c ON c.user_id = s.user_id
    WHERE (
        c.class_name = sr.class_name OR 
        c.school_code = sr.school_code OR 
        (sr.school_code IS NULL AND c.school_code = sr.class_name)
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 데이터 수정 완료 통계 ===';
    RAISE NOTICE '📊 학급 정보:';
    RAISE NOTICE '   - 전체 학급 수: %', v_total_classes;
    RAISE NOTICE '   - 학교코드가 있는 학급: %', v_classes_with_school_code;
    RAISE NOTICE '';
    RAISE NOTICE '📊 학생 응답 정보:';
    RAISE NOTICE '   - 전체 응답 수: %', v_total_responses;
    RAISE NOTICE '   - 학교코드가 있는 응답: %', v_responses_with_school_code;
    RAISE NOTICE '   - 학급과 매칭되는 응답: %', v_responses_with_matching_class;
    RAISE NOTICE '';
    
    IF v_responses_with_matching_class = v_total_responses THEN
        RAISE NOTICE '✅ 모든 응답이 학급과 정상적으로 매칭됨!';
    ELSE
        RAISE NOTICE '⚠️  일부 응답이 학급과 매칭되지 않음. 데이터를 확인해주세요.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ 학생 응답 조회 문제 해결 완료!';
    RAISE NOTICE '✅ 데이터베이스 구조 개선 완료';
    RAISE NOTICE '✅ 자동화 트리거 설정 완료';
END $$;

-- ===========================================
-- 창의적 체험활동 관리를 위한 테이블 생성
-- ===========================================

-- 창의적 체험활동 목록 테이블
CREATE TABLE IF NOT EXISTS creative_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  semester VARCHAR(20) NOT NULL, -- '2024-1', '2024-2' 형식
  order_number INTEGER NOT NULL, -- 순번
  activity_date DATE NOT NULL, -- 활동 날짜
  activity_name VARCHAR(200) NOT NULL, -- 활동명
  activity_area VARCHAR(20) NOT NULL, -- 영역 (자율활동, 동아리활동, 봉사활동, 진로활동)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 복합 유니크 키: 같은 학급, 같은 학기에 순번이 중복되지 않도록
  CONSTRAINT unique_class_semester_order UNIQUE (class_id, semester, order_number)
);

-- 창의적 체험활동 생성 기록 테이블 (학생별 선택 및 생성 기록)
CREATE TABLE IF NOT EXISTS creative_activity_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  selected_activity_ids UUID[] NOT NULL, -- 선택된 활동 ID 배열
  generated_content TEXT, -- 생성된 누가기록
  teacher_notes TEXT, -- 교사 추가 관찰 사항
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 한 학생, 한 학기에 하나의 기록만 있도록
  CONSTRAINT unique_student_semester_record UNIQUE (class_id, student_name, semester)
);

-- 인덱스 생성
CREATE INDEX idx_creative_activities_user_id ON creative_activities(user_id);
CREATE INDEX idx_creative_activities_class_id ON creative_activities(class_id);
CREATE INDEX idx_creative_activities_semester ON creative_activities(semester);
CREATE INDEX idx_creative_activity_records_user_id ON creative_activity_records(user_id);
CREATE INDEX idx_creative_activity_records_class_id ON creative_activity_records(class_id);

-- RLS 정책
ALTER TABLE creative_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_activity_records ENABLE ROW LEVEL SECURITY;

-- 창의적 체험활동 RLS 정책
CREATE POLICY "Users can view their own creative activities" ON creative_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creative activities" ON creative_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creative activities" ON creative_activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creative activities" ON creative_activities
  FOR DELETE USING (auth.uid() = user_id);

-- 창의적 체험활동 기록 RLS 정책
CREATE POLICY "Users can view their own creative activity records" ON creative_activity_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creative activity records" ON creative_activity_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creative activity records" ON creative_activity_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creative activity records" ON creative_activity_records
  FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_creative_activities_updated_at BEFORE UPDATE ON creative_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creative_activity_records_updated_at BEFORE UPDATE ON creative_activity_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 최종 통계 및 완료 메시지
-- ===========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ 모든 마이그레이션이 성공적으로 완료되었습니다!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 완료된 작업:';
    RAISE NOTICE '   1. 학생 응답 조회 문제 해결';
    RAISE NOTICE '   2. school_code 컬럼 추가 및 데이터 정리';
    RAISE NOTICE '   3. 자동화 트리거 설정';
    RAISE NOTICE '   4. 창의적 체험활동 테이블 생성';
    RAISE NOTICE '   5. RLS 정책 및 인덱스 설정';
    RAISE NOTICE '============================================';
END $$;