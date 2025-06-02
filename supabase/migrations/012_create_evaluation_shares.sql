-- 평가계획 공유 시스템 테이블 생성
-- 이 파일을 Supabase Dashboard의 SQL Editor에서 실행하세요

-- 평가계획 공유 테이블 생성
CREATE TABLE IF NOT EXISTS evaluation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  allow_copy BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_code ON evaluation_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_expires ON evaluation_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_plan_id ON evaluation_shares(evaluation_plan_id);

-- RLS 활성화
ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "사용자는 자신의 평가계획만 공유 가능" ON evaluation_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluation_plans 
      WHERE id = evaluation_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "공유 코드로 누구나 조회 가능" ON evaluation_shares
  FOR SELECT USING (true);

CREATE POLICY "생성자만 업데이트 가능" ON evaluation_shares
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "생성자만 삭제 가능" ON evaluation_shares
  FOR DELETE USING (created_by = auth.uid());

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_evaluation_shares_updated_at 
  BEFORE UPDATE ON evaluation_shares
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 실행 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ evaluation_shares 테이블이 성공적으로 생성되었습니다!';
  RAISE NOTICE '✅ 이제 평가계획 공유 기능을 사용할 수 있습니다.';
END $$;