# 🚀 Supabase에서 단계별 실행 방법

## ⚠️ 중요: 각 단계를 개별적으로 실행하세요!

한 번에 모든 SQL을 실행하면 오류가 발생할 수 있습니다. 
아래 단계를 **하나씩** 따라해주세요.

## 📋 실행 단계

### 1단계: 현재 상태 확인
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```
**결과**: 현재 어떤 테이블이 있는지 확인

### 2단계: 기존 학교코드 테이블 제거
```sql
DROP TABLE IF EXISTS school_code_classes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups CASCADE;
```
**결과**: 사용하지 않는 테이블 정리

### 3단계: 평가계획 공유 테이블 생성
```sql
CREATE TABLE IF NOT EXISTS evaluation_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_plan_id UUID REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  allow_copy BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4단계: 설문 접근 코드 테이블 생성
```sql
CREATE TABLE IF NOT EXISTS survey_access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  access_code VARCHAR(6) UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  max_responses INTEGER DEFAULT NULL,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5단계: 익명 설문 응답 테이블 생성
```sql
CREATE TABLE IF NOT EXISTS anonymous_survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  access_code VARCHAR(6) REFERENCES survey_access_codes(access_code),
  student_name TEXT NOT NULL,
  student_number INTEGER NOT NULL,
  class_name TEXT,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(survey_id, access_code, student_number, student_name)
);
```

### 6단계: 인덱스 생성
```sql
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_code ON evaluation_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_survey_access_codes_code ON survey_access_codes(access_code);
CREATE INDEX IF NOT EXISTS idx_evaluation_shares_expires ON evaluation_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_survey_access_codes_expires ON survey_access_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_responses_survey ON anonymous_survey_responses(survey_id);
```

### 7단계: RLS 활성화
```sql
ALTER TABLE evaluation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_survey_responses ENABLE ROW LEVEL SECURITY;
```

### 8단계: 평가계획 공유 정책
```sql
CREATE POLICY "평가계획_공유_삽입" ON evaluation_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluation_plans 
      WHERE id = evaluation_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "평가계획_공유_조회" ON evaluation_shares
  FOR SELECT USING (true);

CREATE POLICY "평가계획_공유_삭제" ON evaluation_shares
  FOR DELETE USING (created_by = auth.uid());
```

### 9단계: 설문 접근 코드 정책
```sql
CREATE POLICY "설문코드_생성" ON survey_access_codes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "설문코드_조회" ON survey_access_codes
  FOR SELECT USING (true);

CREATE POLICY "설문코드_삭제" ON survey_access_codes
  FOR DELETE USING (teacher_id = auth.uid());
```

### 10단계: 익명 설문 응답 정책
```sql
CREATE POLICY "익명응답_제출" ON anonymous_survey_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_access_codes 
      WHERE access_code = anonymous_survey_responses.access_code
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY "익명응답_조회" ON anonymous_survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM surveys s
      JOIN survey_access_codes sac ON sac.survey_id = s.id
      WHERE s.id = anonymous_survey_responses.survey_id
      AND s.teacher_id = auth.uid()
    )
  );
```

### 11단계: 공유 코드 생성 함수
```sql
CREATE OR REPLACE FUNCTION generate_unique_code(prefix TEXT DEFAULT '')
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  done BOOLEAN DEFAULT FALSE;
BEGIN
  WHILE NOT done LOOP
    new_code := prefix || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    IF NOT EXISTS (
      SELECT 1 FROM evaluation_shares WHERE share_code = new_code
      UNION
      SELECT 1 FROM survey_access_codes WHERE access_code = new_code
    ) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

### 12단계: 조회수 증가 함수
```sql
CREATE OR REPLACE FUNCTION increment_share_view_count(p_share_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE evaluation_shares 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE share_code = p_share_code;
END;
$$ LANGUAGE plpgsql;
```

### 13단계: 응답수 증가 함수 및 트리거
```sql
CREATE OR REPLACE FUNCTION increment_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_access_codes
  SET response_count = response_count + 1,
      updated_at = NOW()
  WHERE access_code = NEW.access_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_response_count
  AFTER INSERT ON anonymous_survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_response_count();
```

### 최종 확인
```sql
SELECT 'evaluation_shares' as table_name, COUNT(*) as count FROM evaluation_shares
UNION ALL
SELECT 'survey_access_codes', COUNT(*) FROM survey_access_codes
UNION ALL
SELECT 'anonymous_survey_responses', COUNT(*) FROM anonymous_survey_responses;
```

## 🎯 완료 후 확인

모든 단계가 성공했다면:
- 웹사이트에서 500 오류가 사라짐
- 평가계획 페이지에서 "공유" 버튼 작동
- 설문 페이지에서 "공유" 버튼 작동

## ❌ 오류 발생 시

특정 단계에서 오류가 발생하면:
1. 오류 메시지를 정확히 복사
2. 해당 단계만 다시 실행
3. 또는 문의주세요