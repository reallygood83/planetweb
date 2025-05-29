# 배포 가이드

## Vercel 환경변수 설정

Vercel 대시보드에서 다음 환경변수를 설정해야 합니다:

1. `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
3. `NEXT_PUBLIC_ENCRYPT_KEY` - 32자리 암호화 키 (예: `abcdefghijklmnopqrstuvwxyz123456`)
4. `NEXT_PUBLIC_APP_URL` - `https://planetweb.vercel.app` (Vercel 배포 URL)

## Supabase OAuth 설정

### 1. Supabase 대시보드에서 Authentication > Providers 로 이동

### 2. Google Provider 활성화
- Enable Google 토글 ON
- Google Console에서 OAuth 2.0 Client ID 생성 필요

### 3. Redirect URLs 설정
Supabase 대시보드의 Authentication > URL Configuration에서:

**Site URL**: `https://planetweb.vercel.app`

**Redirect URLs** (모두 추가):
- `https://planetweb.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback` (개발용)

### 4. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. APIs & Services > Credentials 로 이동
3. Create Credentials > OAuth client ID 선택
4. Application type: Web application
5. Authorized JavaScript origins:
   - `https://planetweb.vercel.app`
   - `http://localhost:3000`
6. Authorized redirect URIs:
   - `https://[YOUR-SUPABASE-PROJECT].supabase.co/auth/v1/callback`
   - Supabase 대시보드의 Authentication > Providers > Google에서 확인 가능

### 5. Supabase에 Google OAuth 정보 입력
- Client ID: Google Cloud Console에서 복사
- Client Secret: Google Cloud Console에서 복사

## 문제 해결

### "localhost에서 연결을 거부했습니다" 오류
- Vercel 환경변수에 `NEXT_PUBLIC_APP_URL`이 올바르게 설정되었는지 확인
- Supabase Redirect URLs에 production URL이 추가되었는지 확인

### 스타일이 적용되지 않는 문제
- Tailwind CSS가 dependencies에 있는지 확인
- postcss.config.js 파일이 올바르게 설정되었는지 확인
- Vercel 빌드 로그에서 CSS 관련 오류 확인

### 환경변수가 인식되지 않는 문제
- Vercel 대시보드에서 환경변수 설정 후 재배포 필요
- `NEXT_PUBLIC_` 접두사가 있는지 확인