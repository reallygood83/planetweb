-- 학교 코드 테이블 생성
CREATE TABLE IF NOT EXISTS school_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  school_name VARCHAR(100) NOT NULL,
  target_grade VARCHAR(50),
  primary_subject VARCHAR(50),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_email VARCHAR(255) NOT NULL,
  members TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_school_codes_code ON school_codes(code);
CREATE INDEX idx_school_codes_creator_id ON school_codes(creator_id);
CREATE INDEX idx_school_codes_members ON school_codes USING GIN(members);

-- RLS 정책 설정
ALTER TABLE school_codes ENABLE ROW LEVEL SECURITY;

-- 생성자와 멤버만 조회 가능
CREATE POLICY "Users can view school codes they belong to" ON school_codes
  FOR SELECT USING (
    auth.uid() = creator_id OR 
    auth.email() = ANY(members)
  );

-- 인증된 사용자는 누구나 생성 가능
CREATE POLICY "Authenticated users can create school codes" ON school_codes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 생성자만 수정 가능 (멤버 추가는 별도 정책)
CREATE POLICY "Creators can update their school codes" ON school_codes
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- 멤버 추가를 위한 특별 정책 (코드를 아는 사람은 참여 가능)
CREATE POLICY "Anyone with code can join" ON school_codes
  FOR UPDATE USING (true)
  WITH CHECK (
    -- 멤버 배열만 수정되었는지 확인
    code = OLD.code AND
    group_name = OLD.group_name AND
    description = OLD.description AND
    school_name = OLD.school_name AND
    target_grade IS NOT DISTINCT FROM OLD.target_grade AND
    primary_subject IS NOT DISTINCT FROM OLD.primary_subject AND
    creator_id = OLD.creator_id AND
    creator_email = OLD.creator_email
  );

-- 생성자만 삭제 가능
CREATE POLICY "Creators can delete their school codes" ON school_codes
  FOR DELETE USING (auth.uid() = creator_id);

-- 공유 평가계획 테이블 생성
CREATE TABLE IF NOT EXISTS shared_evaluation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code_id UUID NOT NULL REFERENCES school_codes(id) ON DELETE CASCADE,
  evaluation_plan_id UUID NOT NULL REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_code_id, evaluation_plan_id)
);

-- 공유 평가계획 인덱스
CREATE INDEX idx_shared_plans_school_code ON shared_evaluation_plans(school_code_id);
CREATE INDEX idx_shared_plans_evaluation ON shared_evaluation_plans(evaluation_plan_id);

-- 공유 평가계획 RLS 정책
ALTER TABLE shared_evaluation_plans ENABLE ROW LEVEL SECURITY;

-- 학교 코드 멤버만 조회 가능
CREATE POLICY "School code members can view shared plans" ON shared_evaluation_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM school_codes
      WHERE school_codes.id = shared_evaluation_plans.school_code_id
      AND (auth.uid() = school_codes.creator_id OR auth.email() = ANY(school_codes.members))
    )
  );

-- 학교 코드 멤버만 공유 가능
CREATE POLICY "School code members can share plans" ON shared_evaluation_plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_codes
      WHERE school_codes.id = school_code_id
      AND (auth.uid() = school_codes.creator_id OR auth.email() = ANY(school_codes.members))
    )
  );

-- 공유한 사람만 삭제 가능
CREATE POLICY "Users can delete their shared plans" ON shared_evaluation_plans
  FOR DELETE USING (auth.uid() = shared_by);