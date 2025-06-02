# 평가계획 공유 API 500 오류 해결 가이드

## 문제 상황
평가계획 공유 API에서 500 오류가 발생하는 이유는 `evaluation_shares` 테이블이 실제 데이터베이스에 존재하지 않기 때문입니다.

## 발견된 문제점들

### 1. 누락된 테이블
- `evaluation_shares` 테이블이 실제 데이터베이스에 생성되지 않음
- 마이그레이션 파일은 있지만 실행되지 않은 상태

### 2. 타입 정의 누락
- TypeScript 타입 정의에서 `evaluation_shares` 테이블 정의가 누락되어 있었음
- ✅ **해결됨**: `types/supabase.ts` 업데이트 완료

### 3. 스키마 파일 불일치
- 메인 스키마 파일에 `evaluation_shares` 테이블 정의가 없었음
- ✅ **해결됨**: `supabase/schema.sql` 업데이트 완료

## 해결 방법

### 단계 1: 데이터베이스에 테이블 생성
Supabase Dashboard의 SQL Editor에서 다음 마이그레이션을 실행하세요:

```sql
-- 파일 위치: supabase/migrations/012_create_evaluation_shares.sql
```

또는 더 간단하게, 아래 SQL을 직접 실행:

```sql
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
```

### 단계 2: 코드 변경사항 확인
다음 파일들이 업데이트되었습니다:

1. ✅ `types/supabase.ts` - evaluation_shares 테이블 타입 정의 추가
2. ✅ `supabase/schema.sql` - 테이블 정의, 인덱스, RLS 정책 추가
3. ✅ `supabase/migrations/012_create_evaluation_shares.sql` - 새 마이그레이션 파일 생성

### 단계 3: 테스트
데이터베이스 마이그레이션 실행 후:
1. 평가계획 생성
2. 평가계획 공유 링크 생성 테스트
3. 공유된 평가계획 조회 테스트

## API 엔드포인트 정보

### POST /api/share/evaluation
평가계획 공유 링크 생성
- `evaluationPlanId`: 공유할 평가계획 ID
- `allowCopy`: 복사 허용 여부 (기본값: false)
- `expiresInDays`: 만료 기간 (기본값: 30일)

### GET /api/share/evaluation?code={shareCode}
공유된 평가계획 조회
- `code`: 공유 코드 (6자리)

## 컬럼 정보
현재 API 코드에서 사용하는 모든 컬럼들이 올바르게 정의됨:
- ✅ `evaluation_plan_id` - 평가계획 ID
- ✅ `created_by` - 생성자 ID
- ✅ `expires_at` - 만료 시간
- ✅ `allow_copy` - 복사 허용 여부
- ✅ `view_count` - 조회수

## 참고사항
- RLS(Row Level Security) 정책이 적용되어 보안이 보장됩니다
- 공유 코드는 6자리 랜덤 문자열로 생성됩니다
- 기본 만료 기간은 30일입니다
- 조회수는 자동으로 증가됩니다