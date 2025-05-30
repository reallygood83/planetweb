-- ⚠️ 기존 테이블 정리를 위한 SQL ⚠️
-- 실행 전에 반드시 데이터 백업을 하세요!

-- 1. 먼저 기존 테이블 확인
-- 이 쿼리를 실행해서 어떤 테이블들이 있는지 확인하세요
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'school_groups',
  'group_memberships',
  'school_code_classes',
  'evaluation_shares',
  'survey_access_codes',
  'student_survey_submissions'
)
ORDER BY table_name;

-- 2. 기존 학교코드 관련 테이블들의 데이터 확인
-- 각 테이블에 데이터가 있는지 확인
SELECT 'school_groups' as table_name, COUNT(*) as row_count FROM school_groups
UNION ALL
SELECT 'group_memberships', COUNT(*) FROM group_memberships
UNION ALL
SELECT 'school_code_classes', COUNT(*) FROM school_code_classes;

-- 3. 데이터 백업 (필요한 경우)
-- 기존 데이터를 보존하려면 아래 쿼리로 백업 테이블 생성
/*
CREATE TABLE school_groups_backup AS SELECT * FROM school_groups;
CREATE TABLE group_memberships_backup AS SELECT * FROM group_memberships;
CREATE TABLE school_code_classes_backup AS SELECT * FROM school_code_classes;
*/

-- 4. 기존 학교코드 시스템 테이블 제거
-- ⚠️ 주의: 이 작업은 되돌릴 수 없습니다! 데이터가 완전히 삭제됩니다.
/*
DROP TABLE IF EXISTS school_code_classes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS school_groups CASCADE;
*/

-- 5. 새로운 공유 시스템 테이블이 이미 있는지 확인
SELECT 
  'evaluation_shares' as table_name, 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluation_shares') as exists
UNION ALL
SELECT 
  'survey_access_codes', 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_access_codes')
UNION ALL
SELECT 
  'student_survey_submissions', 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'student_survey_submissions');

-- 6. RUN_THIS_IN_SUPABASE.sql 실행 후 확인
-- 새 테이블들이 제대로 생성되었는지 확인
/*
SELECT 
  t.table_name,
  obj_description(c.oid) as description,
  COUNT(col.column_name) as column_count
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN information_schema.columns col ON col.table_name = t.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('evaluation_shares', 'survey_access_codes', 'student_survey_submissions')
GROUP BY t.table_name, c.oid
ORDER BY t.table_name;
*/