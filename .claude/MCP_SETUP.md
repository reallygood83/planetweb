# Supabase MCP 설정 가이드

## 1. Supabase Personal Access Token 생성

1. **Supabase Dashboard** 로그인
2. **Account Settings** → **Access Tokens** 메뉴로 이동
3. **Create new token** 클릭
4. 이름: "Claude Code MCP" 입력
5. **Create token** 클릭
6. 토큰을 복사해서 안전한 곳에 보관

## 2. MCP 설정 파일 선택

프로젝트에 3가지 설정 파일이 준비되어 있습니다:

### Option 1: 기본 설정 (권장)
```bash
cp .claude/mcp.json .claude/config.json
```
- 파일: `mcp.json`
- 토큰을 직접 파일에 입력

### Option 2: 환경변수 사용 (더 안전)
```bash
cp .claude/mcp-env.json .claude/config.json
export SUPABASE_ACCESS_TOKEN="your-token-here"
```
- 파일: `mcp-env.json`
- 토큰을 환경변수로 설정

### Option 3: 읽기 전용 모드
```bash
cp .claude/mcp-readonly.json .claude/config.json
```
- 파일: `mcp-readonly.json`
- 데이터 수정 불가, 조회만 가능

## 3. 토큰 설정

선택한 설정 파일에서 `YOUR_SUPABASE_ACCESS_TOKEN_HERE`를 실제 토큰으로 교체:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_abc123def456..."  // 여기에 실제 토큰 입력
      ]
    }
  }
}
```

## 4. 사용 가능한 기능

MCP 설정 완료 후 다음 기능들을 사용할 수 있습니다:

### 데이터베이스 쿼리
```sql
SELECT * FROM evaluation_plans WHERE user_id = 'user-id';
```

### 스키마 확인
```sql
DESCRIBE evaluation_plans;
```

### 마이그레이션 적용
```sql
ALTER TABLE evaluation_plans ADD COLUMN new_field TEXT;
```

### TypeScript 타입 생성
프로젝트의 데이터베이스 스키마 기반으로 TypeScript 타입을 자동 생성

## 5. 보안 주의사항

- **토큰을 Git에 커밋하지 마세요**
- 환경변수 사용을 권장합니다
- 읽기 전용 모드를 고려해보세요
- 토큰은 정기적으로 갱신하세요

## 6. 문제 해결

### MCP 서버 연결 실패
1. Node.js가 설치되어 있는지 확인
2. 토큰이 올바른지 확인
3. 네트워크 연결 상태 확인

### 권한 오류
1. Supabase 프로젝트 접근 권한 확인
2. 토큰의 유효성 확인
3. 읽기 전용 모드에서는 수정 불가

## 7. 다음 단계

MCP 설정이 완료되면:
1. Claude Code에서 데이터베이스 직접 접근 가능
2. SQL 쿼리 실행 및 결과 확인
3. 스키마 변경 사항 실시간 적용
4. 더 효율적인 데이터베이스 관리