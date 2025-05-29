# Supabase 데이터베이스 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 계정 생성
2. 새 프로젝트 생성
3. 프로젝트 설정에서 다음 정보 확인:
   - Project URL
   - Anon public key

## 2. 환경 변수 설정

`.env.local` 파일에 다음 정보 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ENCRYPT_KEY=your_32_character_encryption_key
```

## 3. 데이터베이스 마이그레이션

### 방법 1: Supabase SQL Editor 사용 (권장)

1. Supabase 대시보드 → SQL Editor
2. 다음 순서로 SQL 파일 실행:
   - `/supabase/schema.sql` (기본 스키마)
   - `/supabase/migrations/001_improve_evaluation_plans.sql`
   - `/supabase/migrations/002_restructure_evaluations.sql`
   - `/supabase/migrations/003_generated_records.sql`
   - `/supabase/migrations/004_add_school_codes.sql`
   - `/supabase/migrations/005_add_behavior_survey_fields.sql`
   - `/supabase/migrations/production_update.sql`

### 방법 2: 간단한 설정 (학급 코드만 사용)

classes 테이블에 school_code 필드만 추가:

```sql
-- classes 테이블에 school_code 추가
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS school_code VARCHAR(6);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_classes_school_code ON classes(school_code);
```

## 4. 현재 시스템 동작 방식

### 학급 코드 시스템
- 학급 생성 시 6자리 영숫자 코드 자동 생성
- 학생들은 이 코드로 해당 학급의 설문에 접근
- 별도의 school_codes 테이블 없이도 작동

### 학교 코드 시스템 (선택사항)
- 교사 간 협업을 위한 별도 테이블
- 평가계획 공유 기능
- 004_add_school_codes.sql 마이그레이션 필요

## 5. 문제 해결

### "relation does not exist" 오류
- 테이블이 생성되지 않은 경우 발생
- 위의 마이그레이션 실행으로 해결

### 500 오류
- Supabase 연결은 되었지만 테이블이 없는 경우
- 현재는 fallback 응답으로 처리됨

## 6. 테스트 방법

1. 학급 생성 → 자동으로 학급 코드 부여 확인
2. 설문 관리 → 학생 접속 링크에서 학급 코드 확인
3. 학교 코드 → 생성 및 참여 기능 테스트