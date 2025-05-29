-- 평가계획과 개별 평가를 분리하는 구조 개선

-- 1. 과목별 평가계획 테이블 (학기 전체 계획)
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

-- 2. 개별 평가 테이블 (각 단원/차시별 평가)
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

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subject_evaluation_plans_user_id ON subject_evaluation_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_evaluation_plans_subject ON subject_evaluation_plans(subject);
CREATE INDEX IF NOT EXISTS idx_individual_evaluations_plan_id ON individual_evaluations(plan_id);

-- 4. RLS 정책
ALTER TABLE subject_evaluation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_evaluations ENABLE ROW LEVEL SECURITY;

-- subject_evaluation_plans 정책
CREATE POLICY "Users can view own subject plans" ON subject_evaluation_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subject plans" ON subject_evaluation_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subject plans" ON subject_evaluation_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subject plans" ON subject_evaluation_plans
    FOR DELETE USING (auth.uid() = user_id);

-- individual_evaluations 정책
CREATE POLICY "Users can view own evaluations" ON individual_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subject_evaluation_plans
            WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
            AND subject_evaluation_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create evaluations" ON individual_evaluations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subject_evaluation_plans
            WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
            AND subject_evaluation_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update evaluations" ON individual_evaluations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subject_evaluation_plans
            WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
            AND subject_evaluation_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete evaluations" ON individual_evaluations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subject_evaluation_plans
            WHERE subject_evaluation_plans.id = individual_evaluations.plan_id
            AND subject_evaluation_plans.user_id = auth.uid()
        )
    );

-- 5. 트리거
CREATE TRIGGER update_subject_evaluation_plans_updated_at BEFORE UPDATE ON subject_evaluation_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_individual_evaluations_updated_at BEFORE UPDATE ON individual_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 기존 테이블과의 관계 업데이트
-- surveys 테이블이 individual_evaluations를 참조하도록 변경
ALTER TABLE surveys 
ADD COLUMN individual_evaluation_id UUID REFERENCES individual_evaluations(id) ON DELETE SET NULL;

-- 기존 evaluation_plan_id는 deprecated로 표시
COMMENT ON COLUMN surveys.evaluation_plan_id IS 'DEPRECATED - use individual_evaluation_id instead';