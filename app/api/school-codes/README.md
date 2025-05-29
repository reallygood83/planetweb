# 학교 코드 API 문서

## 개요
학교 코드는 교사들이 협업하고 자료를 공유하기 위한 6자리 코드 시스템입니다.

## 현재 구현 상태

### 1. Supabase 연결 시
- school_codes 테이블이 있으면: 정상 작동
- school_codes 테이블이 없으면: 시뮬레이션된 응답 반환

### 2. Supabase 미연결 시
- 항상 시뮬레이션된 응답 반환
- 메모리에만 저장 (새로고침 시 초기화)

## API 엔드포인트

### GET /api/school-codes
사용자가 참여한 학교 코드 목록 조회

### POST /api/school-codes
새로운 학교 코드 생성
```json
{
  "group_name": "수학과 협의회",
  "description": "2024학년도 수학과 평가계획 공유",
  "school_name": "한국초등학교",
  "target_grade": "3학년",
  "primary_subject": "수학"
}
```

### POST /api/school-codes/join
기존 학교 코드에 참여
```json
{
  "code": "ABC123"
}
```

## 데이터베이스 설정

school_codes 테이블이 필요한 경우:
```sql
-- /supabase/migrations/004_add_school_codes.sql 실행
```

또는 간단한 대안:
- 학급 코드 시스템만 사용 (classes.school_code)
- 별도 협업 기능 없이 학급별 설문 공유만 지원