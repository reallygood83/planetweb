# 🔧 환경 변수 설정 확인 가이드

## ⚠️ 현재 문제

코드에서 다음과 같은 체크가 있습니다:
```javascript
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
```

이는 Supabase가 제대로 설정되지 않았음을 의미합니다.

## 🔍 확인해야 할 환경 변수

`.env.local` 파일에 다음 변수들이 올바르게 설정되어 있는지 확인하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 앱 설정
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_ENCRYPT_KEY=your-encryption-key
```

## 🛠 설정 방법

### 1. Supabase 프로젝트에서 키 확인
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택
3. **Settings** → **API** 메뉴
4. **Project URL**과 **anon public** 키 복사
5. **service_role** 키도 복사 (⚠️ 비밀 키)

### 2. .env.local 파일 업데이트
```bash
# 프로젝트 루트에 .env.local 파일 생성/수정
NEXT_PUBLIC_SUPABASE_URL=https://abcdefg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Vercel 배포 환경변수 설정 (배포된 경우)
1. [Vercel Dashboard](https://vercel.com/dashboard)
2. 프로젝트 → **Settings** → **Environment Variables**
3. 위 환경변수들 모두 추가

## 🎯 확인 방법

환경변수가 올바르게 설정되었는지 확인:

```bash
# 개발 서버 재시작
npm run dev

# 브라우저 개발자 도구에서 확인
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

## 🚨 주의사항

- `NEXT_PUBLIC_`로 시작하는 변수만 클라이언트에서 접근 가능
- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용 (보안)
- `.env.local` 파일은 Git에 커밋하지 말 것