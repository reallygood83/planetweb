# Planet - 생기부 AI 도우미 (Web Version)

AI를 활용한 초등학교 생활기록부 작성 도우미 웹 애플리케이션

## 🚀 특징

- **개인 API 키 사용**: 사용자가 직접 Gemini API 키를 관리하여 비용 부담 없이 사용
- **NEIS 규정 준수**: 500자 제한, 명사형 종결어미 등 자동 검증
- **완전한 기능 구현**: 기존 Google Apps Script 버전의 모든 기능 포함
- **확장 가능한 아키텍처**: 수천 명이 동시에 사용 가능

## 🛠 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 📋 필수 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Supabase 계정
- Google AI Studio 계정 (Gemini API 키)

## 🔧 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone [your-repo-url]
cd planet-web
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 입력:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Encryption key for API keys
NEXT_PUBLIC_ENCRYPT_KEY=your_secure_random_string

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase 데이터베이스 설정

1. Supabase 대시보드에서 새 프로젝트 생성
2. SQL Editor에서 `/supabase/schema.sql` 파일의 내용 실행
3. Authentication > Providers에서 Google OAuth 활성화

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 📁 프로젝트 구조

```
planet-web/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # 인증 페이지
│   ├── dashboard/         # 대시보드
│   ├── evaluation/        # 평가계획 관리
│   ├── class/            # 학급 관리
│   └── generate/         # 콘텐츠 생성
├── components/            # React 컴포넌트
│   ├── ui/               # UI 컴포넌트
│   └── ...               # 기능별 컴포넌트
├── lib/                   # 유틸리티 함수
│   ├── supabase/         # Supabase 클라이언트
│   └── utils.ts          # 헬퍼 함수
├── types/                 # TypeScript 타입 정의
└── supabase/             # 데이터베이스 스키마
```

## 🔑 주요 기능

### 1. 평가계획 관리
- 평가계획서 텍스트 붙여넣기로 AI 자동 분석
- 과목별 다중 평가 지원
- CRUD 기능

### 2. 학급 관리
- 학급 생성 및 학생 명단 관리
- CSV 파일 일괄 업로드
- 학급별 데이터 격리

### 3. AI 콘텐츠 생성
- 교과학습발달상황
- 창의적체험활동
- 행동특성및종합의견
- NEIS 규정 자동 검증

### 4. 설문 시스템
- AI 기반 설문 문항 생성
- 학생 자기평가 수집
- 응답 데이터 자동 연동

### 5. 일괄 생성
- 학급 전체 생기부 동시 생성
- 진행 상황 실시간 표시
- 다양한 형식으로 내보내기

### 6. 학교 코드 협업
- 6자리 코드로 교사 그룹 생성
- 평가계획 및 자료 공유
- 권한 관리

## 🔐 보안

- 사용자별 데이터 격리 (Row Level Security)
- API 키 클라이언트 암호화
- HTTPS 전송 (Vercel 기본 제공)
- Rate Limiting 적용

## 🚀 배포

### Vercel 배포

```bash
npm run build
vercel --prod
```

### 환경 변수 설정
Vercel 대시보드에서 프로젝트 설정 > Environment Variables에 추가

## 📝 사용법

1. **회원가입/로그인**: Google 계정으로 간편 가입
2. **API 키 설정**: Google AI Studio에서 Gemini API 키 발급 후 입력
3. **평가계획 등록**: 기존 평가계획서 붙여넣기 또는 직접 입력
4. **학급 생성**: 학급 정보와 학생 명단 등록
5. **생기부 작성**: 관찰 내용 입력 후 AI 생성

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이센스

MIT License

## 👥 만든 사람

- 개발: Claude (Anthropic)
- 기획: [Your Name]

## 📞 문의

- Issues: [GitHub Issues](your-repo-url/issues)
- Email: your-email@example.com