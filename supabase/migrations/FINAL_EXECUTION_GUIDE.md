# 🚀 최종 실행 가이드

## ⚠️ 중요: 한 번만 실행하세요!

이 가이드는 **기존 프로덕션 데이터를 보존**하면서 새로운 공유 시스템을 추가합니다.

## 📋 실행 단계

### 1단계: Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 해당 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2단계: 완전한 업데이트 실행
1. **New Query** 버튼 클릭
2. `COMPLETE_UPDATE.sql` 파일의 **전체 내용** 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭 (⚡)

### 3단계: 실행 결과 확인
성공 시 다음 메시지들이 출력됩니다:
```
✅ 완전한 데이터베이스 업데이트 완료!
✅ 기존 데이터가 보존되었습니다.
✅ 새로운 공유 시스템이 추가되었습니다.
✅ 학교 코드 시스템이 제거되었습니다.
```

## 🔍 업데이트 내용

### ✅ 보존되는 것들
- 기존 `evaluation_plans` 테이블과 모든 데이터
- 기존 `surveys`, `survey_responses` 테이블
- 기존 `classes`, `students` 테이블
- 모든 사용자 데이터 (`profiles` 테이블)

### ➕ 추가되는 것들
- `evaluation_shares` - 평가계획 6자리 코드 공유
- `survey_access_codes` - 설문 6자리 코드 접근
- `student_survey_submissions` - 학생 설문 응답 (학급 매칭)
- `subject_evaluation_plans` - 과목별 평가계획
- `individual_evaluations` - 개별 단원 평가

### 🗑️ 제거되는 것들
- `school_groups` - 더 이상 사용하지 않는 학교 그룹
- `group_memberships` - 더 이상 사용하지 않는 멤버십
- `school_code_classes` - 더 이상 사용하지 않는 학급 코드

## 🔧 문제 발생 시

### 권한 오류가 발생하면:
```sql
-- RLS 정책 확인
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 테이블 생성 확인:
```sql
-- 새 테이블들이 생성되었는지 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('evaluation_shares', 'survey_access_codes', 'student_survey_submissions')
ORDER BY table_name;
```

### 기존 데이터 확인:
```sql
-- 기존 데이터가 보존되었는지 확인
SELECT 'evaluation_plans' as table_name, COUNT(*) as count FROM evaluation_plans
UNION ALL
SELECT 'surveys', COUNT(*) FROM surveys
UNION ALL
SELECT 'classes', COUNT(*) FROM classes;
```

## 🎉 완료 후 확인사항

1. **웹 애플리케이션 접속**: 500 에러가 사라져야 함
2. **평가계획 공유**: 평가계획 페이지에서 "공유" 버튼 작동
3. **설문 공유**: 설문 페이지에서 "공유" 버튼 작동
4. **학교 코드 페이지**: 새로운 안내 페이지로 변경됨

## 📞 지원

문제가 발생하면:
1. SQL Editor의 오류 메시지 확인
2. 브라우저 개발자 도구에서 네트워크 오류 확인
3. 이 가이드의 문제 해결 섹션 참조