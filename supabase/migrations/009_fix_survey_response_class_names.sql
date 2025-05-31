-- ===========================================
-- 학생 응답 조회 문제 해결을 위한 마이그레이션
-- ===========================================

-- 1. classes 테이블에 school_code 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'classes' 
        AND column_name = 'school_code'
    ) THEN
        ALTER TABLE classes ADD COLUMN school_code VARCHAR(6);
    END IF;
END $$;

-- 2. survey_responses 테이블에 school_code 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'survey_responses' 
        AND column_name = 'school_code'
    ) THEN
        ALTER TABLE survey_responses ADD COLUMN school_code VARCHAR(6);
    END IF;
END $$;

-- 3. 기존 survey_responses에서 class_name이 학교 코드 형태인 경우 처리
-- 학교 코드는 일반적으로 6자리 대문자로 구성됨
UPDATE survey_responses sr
SET school_code = sr.class_name
WHERE sr.class_name ~ '^[A-Z0-9]{6}$';

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_survey_responses_class_name ON survey_responses(class_name);
CREATE INDEX IF NOT EXISTS idx_survey_responses_school_code ON survey_responses(school_code);
CREATE INDEX IF NOT EXISTS idx_survey_responses_student_name ON survey_responses(student_name);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);

-- 4. 복합 인덱스 추가 (자주 함께 사용되는 컬럼들)
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_student ON survey_responses(survey_id, student_name);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_class ON survey_responses(survey_id, class_name);

-- 5. 뷰 생성: 학생 응답을 쉽게 조회할 수 있는 뷰
CREATE OR REPLACE VIEW v_student_responses_with_survey AS
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
    ep.subject,
    ep.grade,
    ep.semester,
    ep.unit,
    ep.achievement_standards,
    ep.evaluation_criteria,
    c.id as matched_class_id,
    c.class_name as actual_class_name,
    c.school_code as class_school_code
FROM 
    survey_responses sr
    INNER JOIN surveys s ON sr.survey_id = s.id
    LEFT JOIN evaluation_plans ep ON s.evaluation_plan_id = ep.id
    LEFT JOIN classes c ON (
        c.user_id = s.user_id 
        AND (c.class_name = sr.class_name OR 
             (sr.school_code IS NOT NULL AND c.school_code = sr.school_code) OR
             (sr.class_name ~ '^[A-Z0-9]{6}$' AND sr.class_name = c.school_code))
    );

-- 6. 뷰에 대한 RLS 정책
CREATE POLICY "교사는_자신의_학생응답_조회" ON survey_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM surveys s
            WHERE s.id = survey_responses.survey_id
            AND s.user_id = auth.uid()
        )
    );

-- 7. 함수: 학생 응답 조회 (class_name 또는 school_code로 검색 가능)
CREATE OR REPLACE FUNCTION get_student_responses(
    p_teacher_id UUID,
    p_survey_id UUID DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_student_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    survey_id UUID,
    student_name TEXT,
    class_name TEXT,
    school_code VARCHAR(6),
    responses JSONB,
    submitted_at TIMESTAMPTZ,
    survey_title TEXT,
    survey_questions JSONB,
    evaluation_plan_subject TEXT,
    evaluation_plan_unit TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.survey_id,
        sr.student_name,
        sr.class_name,
        sr.school_code,
        sr.responses,
        sr.submitted_at,
        s.title,
        s.questions,
        ep.subject,
        ep.unit
    FROM 
        survey_responses sr
        INNER JOIN surveys s ON sr.survey_id = s.id
        LEFT JOIN evaluation_plans ep ON s.evaluation_plan_id = ep.id
        LEFT JOIN classes c ON c.id = p_class_id
    WHERE 
        s.user_id = p_teacher_id
        AND (p_survey_id IS NULL OR sr.survey_id = p_survey_id)
        AND (p_class_id IS NULL OR 
            sr.class_name = c.class_name OR 
            sr.school_code = c.school_code OR
            sr.class_name = c.school_code)
        AND (p_student_name IS NULL OR sr.student_name = p_student_name)
    ORDER BY sr.submitted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 데이터 정합성 검증 및 통계
DO $$
DECLARE
    v_total_responses INTEGER;
    v_fixed_responses INTEGER;
    v_responses_with_code INTEGER;
BEGIN
    -- 전체 응답 수
    SELECT COUNT(*) INTO v_total_responses FROM survey_responses;
    
    -- school_code가 있는 응답 수
    SELECT COUNT(*) INTO v_responses_with_code 
    FROM survey_responses 
    WHERE school_code IS NOT NULL;
    
    -- 수정된 응답 수 (school_code가 설정된 경우)
    SELECT COUNT(*) INTO v_fixed_responses
    FROM survey_responses sr
    WHERE sr.school_code IS NOT NULL;
    
    RAISE NOTICE '=== 학생 응답 데이터 수정 완료 ===';
    RAISE NOTICE '전체 응답 수: %', v_total_responses;
    RAISE NOTICE '학교 코드가 있는 응답: %', v_responses_with_code;
    RAISE NOTICE '정상적으로 수정된 응답: %', v_fixed_responses;
END $$;

-- 9. 트리거: 새로운 응답 제출 시 school_code 자동 설정
CREATE OR REPLACE FUNCTION ensure_school_code()
RETURNS TRIGGER AS $$
BEGIN
    -- class_name이 학교 코드 패턴인 경우 school_code에 저장
    IF NEW.class_name ~ '^[A-Z0-9]{6}$' AND NEW.school_code IS NULL THEN
        NEW.school_code := NEW.class_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS ensure_school_code_trigger ON survey_responses;
CREATE TRIGGER ensure_school_code_trigger
    BEFORE INSERT OR UPDATE ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_school_code();

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 학생 응답 조회 문제 해결 완료!';
    RAISE NOTICE '✅ classes와 survey_responses 테이블에 school_code 컬럼 추가';
    RAISE NOTICE '✅ 인덱스 및 뷰 생성 완료';
    RAISE NOTICE '✅ 향후 응답 제출 시 자동으로 school_code 설정됨';
END $$;