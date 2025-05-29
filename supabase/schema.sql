-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    school_name TEXT,
    api_key_hint TEXT, -- Last 4 characters of API key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create evaluation_plans table with improved structure
CREATE TABLE IF NOT EXISTS evaluation_plans (
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

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    semester TEXT NOT NULL,
    teacher TEXT,
    students JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, class_name)
);

-- Create student_evaluations table
CREATE TABLE IF NOT EXISTS student_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create generated_contents table
CREATE TABLE IF NOT EXISTS generated_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    class_name TEXT,
    content_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create school_groups table
CREATE TABLE IF NOT EXISTS school_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    school_name TEXT,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
    group_id UUID NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (group_id, user_id)
);

-- Create shared_contents table
CREATE TABLE IF NOT EXISTS shared_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create surveys table
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_user_id ON evaluation_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_class_id ON student_evaluations(class_id);
CREATE INDEX IF NOT EXISTS idx_generated_contents_user_id ON generated_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_school_groups_code ON school_groups(code);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_plans_updated_at BEFORE UPDATE ON evaluation_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_groups_updated_at BEFORE UPDATE ON school_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Evaluation plans policies
CREATE POLICY "Users can view own evaluation plans" ON evaluation_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own evaluation plans" ON evaluation_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluation plans" ON evaluation_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluation plans" ON evaluation_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Classes policies
CREATE POLICY "Users can view own classes" ON classes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own classes" ON classes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classes" ON classes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classes" ON classes
    FOR DELETE USING (auth.uid() = user_id);

-- Student evaluations policies
CREATE POLICY "Users can view own student evaluations" ON student_evaluations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own student evaluations" ON student_evaluations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own student evaluations" ON student_evaluations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own student evaluations" ON student_evaluations
    FOR DELETE USING (auth.uid() = user_id);

-- Generated contents policies
CREATE POLICY "Users can view own generated contents" ON generated_contents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generated contents" ON generated_contents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated contents" ON generated_contents
    FOR DELETE USING (auth.uid() = user_id);

-- School groups policies
CREATE POLICY "Anyone can view school groups they belong to" ON school_groups
    FOR SELECT USING (
        auth.uid() = creator_id OR 
        EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = school_groups.id 
            AND group_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create school groups" ON school_groups
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their school groups" ON school_groups
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their school groups" ON school_groups
    FOR DELETE USING (auth.uid() = creator_id);

-- Group memberships policies
CREATE POLICY "Users can view memberships of groups they belong to" ON group_memberships
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM group_memberships gm2
            WHERE gm2.group_id = group_memberships.group_id
            AND gm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Group creators can manage memberships" ON group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM school_groups
            WHERE school_groups.id = group_memberships.group_id
            AND school_groups.creator_id = auth.uid()
        )
    );

-- Shared contents policies
CREATE POLICY "Group members can view shared contents" ON shared_contents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships
            WHERE group_memberships.group_id = shared_contents.group_id
            AND group_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create shared contents" ON shared_contents
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM group_memberships
            WHERE group_memberships.group_id = shared_contents.group_id
            AND group_memberships.user_id = auth.uid()
        )
    );

-- Survey policies
CREATE POLICY "Users can view own surveys" ON surveys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own surveys" ON surveys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own surveys" ON surveys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own surveys" ON surveys
    FOR DELETE USING (auth.uid() = user_id);

-- Survey responses policies (public submit, owner read)
CREATE POLICY "Anyone can submit survey responses" ON survey_responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Survey owners can view responses" ON survey_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM surveys
            WHERE surveys.id = survey_responses.survey_id
            AND surveys.user_id = auth.uid()
        )
    );

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();