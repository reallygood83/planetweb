# Playwright MCP 사용 가이드

## Playwright MCP란?

Playwright MCP(Model Context Protocol)는 Claude가 웹 브라우저를 제어하여 웹 애플리케이션을 테스트하고 자동화할 수 있게 해주는 도구입니다.

## 설치 방법

### 1. MCP 설정 파일 수정

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일에 추가:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-playwright"
      ]
    }
  }
}
```

### 2. Claude 재시작

설정을 적용하려면 Claude 앱을 완전히 종료 후 재시작합니다.

## 사용 예시

### 1. 웹사이트 테스트
```
playwright를 사용해서 https://planetweb.vercel.app 사이트를 열고 로그인 기능을 테스트해줘
```

### 2. 스크린샷 캡처
```
playwright로 대시보드 페이지의 스크린샷을 찍어줘
```

### 3. 자동화된 E2E 테스트
```
playwright로 다음 시나리오를 테스트해줘:
1. 로그인
2. 학급 생성
3. 설문 생성
4. 생기부 생성
```

## 아이빛(생기부 AI 도우미)에서 활용 방법

### 1. 기능 테스트
- 로그인/회원가입 플로우 테스트
- 설문 생성 및 응답 프로세스 테스트
- 생기부 생성 워크플로우 검증

### 2. UI/UX 검증
- 반응형 디자인 테스트 (모바일, 태블릿, 데스크톱)
- 네비게이션 동작 확인
- 에러 상태 처리 확인

### 3. 성능 테스트
- 페이지 로딩 시간 측정
- API 응답 시간 확인
- 대용량 데이터 처리 테스트

### 4. 접근성 테스트
- 키보드 네비게이션 확인
- 스크린 리더 호환성
- 색상 대비 검증

## 테스트 시나리오 예시

### 학생 설문 응답 플로우
```javascript
// Playwright가 자동으로 수행할 작업:
1. 학생 설문 페이지 접속 (/student/surveys?code=ABC123)
2. 학급 코드 입력
3. 설문 선택
4. 모든 문항 응답
5. 제출 및 완료 페이지 확인
```

### 교사 전체 워크플로우
```javascript
// 전체 프로세스 테스트:
1. 로그인
2. API 키 설정
3. 평가계획 등록
4. 학급 생성 (CSV 업로드)
5. 설문 생성 (AI 활용)
6. 학생 응답 확인
7. 생기부 생성
8. 결과 다운로드
```

## 주의사항

1. **개발 환경에서만 사용**: 프로덕션 환경에서는 실제 데이터에 영향을 줄 수 있음
2. **API 키 보안**: 테스트 시 실제 API 키가 노출되지 않도록 주의
3. **데이터 정리**: 테스트 후 생성된 데이터 정리 필요

## 장점

1. **자동화된 회귀 테스트**: 코드 변경 시 기존 기능 정상 동작 확인
2. **시각적 검증**: 스크린샷으로 UI 변경사항 확인
3. **사용자 시나리오 재현**: 실제 사용자의 행동 패턴 시뮬레이션
4. **버그 재현**: 보고된 버그를 자동으로 재현하여 디버깅

## 통합 테스트 작성 예시

```typescript
// tests/e2e/student-survey.spec.ts
test('학생이 설문에 응답할 수 있다', async ({ page }) => {
  // 1. 학생 설문 페이지 접속
  await page.goto('/student/surveys?code=TEST01')
  
  // 2. 설문 선택
  await page.click('text=수학 단원평가 자기평가')
  
  // 3. 객관식 문항 응답
  await page.click('input[name="q1"][value="매우 그렇다"]')
  
  // 4. 주관식 문항 응답
  await page.fill('textarea[name="q2"]', '분수의 덧셈을 잘 이해했습니다.')
  
  // 5. 제출
  await page.click('button:text("제출")')
  
  // 6. 완료 확인
  await expect(page).toHaveURL('/student/complete')
})
```

이렇게 Playwright MCP를 활용하면 수동 테스트 시간을 크게 줄이고, 안정적인 서비스 운영이 가능합니다.