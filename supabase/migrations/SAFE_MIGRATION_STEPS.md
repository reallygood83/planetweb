# 안전한 마이그레이션 단계별 가이드

## 🔍 1단계: 현재 상태 확인

Supabase SQL Editor에서 다음을 실행하여 현재 테이블 상태를 확인하세요:

```sql
-- 모든 public 테이블 목록 보기
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 📊 2단계: 기존 데이터 확인

### 학교코드 관련 테이블이 있다면:
```sql
-- 각 테이블의 데이터 개수 확인
SELECT 
  (SELECT COUNT(*) FROM school_groups) as school_groups_count,
  (SELECT COUNT(*) FROM group_memberships) as memberships_count,
  (SELECT COUNT(*) FROM school_code_classes) as classes_count;
```

### 중요한 데이터가 있다면 백업:
```sql
-- 백업 테이블 생성
CREATE TABLE _backup_school_groups AS SELECT * FROM school_groups;
CREATE TABLE _backup_group_memberships AS SELECT * FROM group_memberships;
```

## 🚀 3단계: 새 테이블 생성

### 옵션 A: 기존 테이블이 없거나 삭제해도 되는 경우
`RUN_THIS_IN_SUPABASE.sql` 파일 전체를 실행

### 옵션 B: 기존 테이블을 유지하면서 새 테이블 추가
`RUN_THIS_IN_SUPABASE.sql`에서 DROP 문을 제외하고 실행:
- 3번째 줄부터 7번째 줄까지의 DROP TABLE 문을 제거
- 나머지 CREATE TABLE 문부터 실행

## 🧹 4단계: 정리 (선택사항)

기존 학교코드 시스템을 완전히 제거하려면:
```sql
-- 외래키 관계 때문에 순서대로 삭제
DROP TABLE IF EXISTS school_code_classes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups CASCADE;
```

## ✅ 5단계: 검증

새 테이블이 제대로 생성되었는지 확인:
```sql
-- 새 테이블 존재 확인
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('evaluation_shares', 'survey_access_codes', 'student_survey_submissions')
ORDER BY table_name;
```

## 🔐 6단계: RLS 정책 확인

```sql
-- RLS가 활성화되었는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('evaluation_shares', 'survey_access_codes', 'student_survey_submissions');
```

## 💡 권장사항

1. **프로덕션 환경이라면**: 먼저 개발/테스트 환경에서 테스트
2. **데이터가 있다면**: 반드시 백업 후 진행
3. **단계별로 진행**: 한 번에 모든 작업을 하지 말고 단계별로 확인
4. **팀원과 공유**: 다른 개발자들에게 변경사항 공지

## 🆘 문제 발생 시

백업 테이블에서 복구:
```sql
-- 백업에서 복구 (백업을 만든 경우)
CREATE TABLE school_groups AS SELECT * FROM _backup_school_groups;
CREATE TABLE group_memberships AS SELECT * FROM _backup_group_memberships;
```