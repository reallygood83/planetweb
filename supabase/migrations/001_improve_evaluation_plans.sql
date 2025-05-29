-- Improve evaluation_plans table structure for detailed educational evaluation

-- Drop existing table and recreate with improved structure
DROP TABLE IF EXISTS evaluation_plans CASCADE;

CREATE TABLE evaluation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- 기본 정보
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    semester TEXT NOT NULL,
    unit TEXT NOT NULL,                    -- 단원명
    lesson TEXT,                          -- 차시
    
    -- 교육과정 정보
    achievement_standards JSONB NOT NULL DEFAULT '[]'::jsonb,  -- 성취기준 배열
    learning_objectives TEXT[] NOT NULL DEFAULT '{}',          -- 학습목표 배열
    
    -- 평가 설계
    evaluation_methods TEXT[] NOT NULL DEFAULT '{}',           -- 평가방법 (관찰, 포트폴리오 등)
    evaluation_tools TEXT[] NOT NULL DEFAULT '{}',            -- 평가도구 (체크리스트, 루브릭 등)
    
    -- 4단계 평가기준: 매우잘함, 잘함, 보통, 노력요함
    evaluation_criteria JSONB NOT NULL DEFAULT '{
        "excellent": {"level": "매우잘함", "description": ""},
        "good": {"level": "잘함", "description": ""},
        "satisfactory": {"level": "보통", "description": ""},
        "needs_improvement": {"level": "노력요함", "description": ""}
    }'::jsonb,
    
    -- AI 생성 대상 영역
    ai_generation_targets TEXT[] NOT NULL DEFAULT '{"교과학습발달상황", "창의적 체험활동 누가기록", "행동특성 및 종합의견"}',
    
    -- 생기부 연계 정보
    record_keywords TEXT[] NOT NULL DEFAULT '{}',              -- 핵심 키워드
    special_notes TEXT,                                        -- 특별 고려사항
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 인덱스 생성
CREATE INDEX idx_evaluation_plans_user_id ON evaluation_plans(user_id);
CREATE INDEX idx_evaluation_plans_subject ON evaluation_plans(subject);
CREATE INDEX idx_evaluation_plans_grade_semester ON evaluation_plans(grade, semester);

-- RLS 정책
ALTER TABLE evaluation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluation plans" ON evaluation_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own evaluation plans" ON evaluation_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluation plans" ON evaluation_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluation plans" ON evaluation_plans
    FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 트리거
CREATE TRIGGER update_evaluation_plans_updated_at BEFORE UPDATE ON evaluation_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- surveys 테이블의 evaluation_plan_id 외래키 재생성
ALTER TABLE surveys 
DROP CONSTRAINT IF EXISTS surveys_evaluation_plan_id_fkey,
ADD CONSTRAINT surveys_evaluation_plan_id_fkey 
    FOREIGN KEY (evaluation_plan_id) REFERENCES evaluation_plans(id) ON DELETE SET NULL;