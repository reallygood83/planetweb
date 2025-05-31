-- 창의적 체험활동 관리를 위한 테이블 생성

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