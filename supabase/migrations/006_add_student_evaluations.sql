-- 학생 평가 결과 테이블 생성
CREATE TABLE IF NOT EXISTS student_evaluation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 관계 정보
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_number INTEGER NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  
  -- 평가 정보
  evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE SET NULL,
  subject VARCHAR(50) NOT NULL,
  evaluation_name VARCHAR(100) NOT NULL,
  evaluation_period VARCHAR(50),
  
  -- 평가 결과 (매우잘함, 잘함, 보통, 노력요함)
  result VARCHAR(20) CHECK (result IN ('매우잘함', '잘함', '보통', '노력요함')),
  
  -- 평가 기준 텍스트 (선택된 수준의 평가 기준)
  result_criteria TEXT,
  
  -- 추가 관찰 사항
  teacher_notes TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 학생-평가 고유 제약
  UNIQUE(class_id, student_number, evaluation_plan_id)
);

-- 인덱스 생성
CREATE INDEX idx_student_eval_results_class ON student_evaluation_results(class_id);
CREATE INDEX idx_student_eval_results_student ON student_evaluation_results(class_id, student_number);
CREATE INDEX idx_student_eval_results_evaluation ON student_evaluation_results(evaluation_plan_id);
CREATE INDEX idx_student_eval_results_subject ON student_evaluation_results(subject);

-- RLS 정책 설정
ALTER TABLE student_evaluation_results ENABLE ROW LEVEL SECURITY;

-- 교사만 자신의 학급 평가 결과 조회 가능
CREATE POLICY "Teachers can view own class evaluation results" ON student_evaluation_results
  FOR SELECT USING (auth.uid() = user_id);

-- 교사만 자신의 학급 평가 결과 생성 가능
CREATE POLICY "Teachers can create evaluation results" ON student_evaluation_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 교사만 자신의 학급 평가 결과 수정 가능
CREATE POLICY "Teachers can update evaluation results" ON student_evaluation_results
  FOR UPDATE USING (auth.uid() = user_id);

-- 교사만 자신의 학급 평가 결과 삭제 가능
CREATE POLICY "Teachers can delete evaluation results" ON student_evaluation_results
  FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 트리거
CREATE TRIGGER update_student_evaluation_results_updated_at 
  BEFORE UPDATE ON student_evaluation_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 생기부 생성 시 평가 결과 집계를 위한 뷰
CREATE OR REPLACE VIEW student_evaluation_summary AS
SELECT 
  ser.class_id,
  ser.student_number,
  ser.student_name,
  ser.subject,
  COUNT(CASE WHEN ser.result = '매우잘함' THEN 1 END) as excellent_count,
  COUNT(CASE WHEN ser.result = '잘함' THEN 1 END) as good_count,
  COUNT(CASE WHEN ser.result = '보통' THEN 1 END) as average_count,
  COUNT(CASE WHEN ser.result = '노력요함' THEN 1 END) as needs_improvement_count,
  STRING_AGG(
    CASE 
      WHEN ser.result IN ('매우잘함', '잘함') 
      THEN ser.evaluation_name || ': ' || ser.result_criteria
      ELSE NULL
    END, 
    ' ' 
    ORDER BY ser.created_at
  ) as achievement_summary
FROM student_evaluation_results ser
GROUP BY ser.class_id, ser.student_number, ser.student_name, ser.subject;