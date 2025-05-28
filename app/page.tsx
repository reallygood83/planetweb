import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            생기부 AI 도우미
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI를 활용하여 초등학교 생활기록부 작성을 도와드립니다.
            <br />
            개인 API 키로 안전하고 경제적으로 사용하세요.
          </p>
          <div className="flex gap-4 justify-center mb-12">
            <Link href="/auth/login">
              <button className="bg-blue-500 text-white text-lg px-8 py-3 rounded-lg hover:bg-blue-600 transition">
                시작하기
              </button>
            </Link>
            <Link href="#features">
              <button className="border border-gray-300 text-gray-700 text-lg px-8 py-3 rounded-lg hover:bg-gray-50 transition">
                기능 알아보기
              </button>
            </Link>
          </div>

          {/* Key Features Summary */}
          <div className="grid md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">🔐 개인 API 키 사용</h3>
              <p className="text-gray-600">
                사용자 개인의 Gemini API 키로 비용 부담 없이 사용
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">📝 NEIS 규정 준수</h3>
              <p className="text-gray-600">
                500자 제한, 명사형 종결어미 등 규정 자동 검증
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">👥 교사 협업 지원</h3>
              <p className="text-gray-600">
                학교 코드로 평가계획과 자료를 공유
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            주요 기능
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">평가계획 관리</h3>
              <p className="text-gray-600">
                기존 평가계획서를 붙여넣기하면 AI가 자동으로 분석하고 구조화합니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI 콘텐츠 생성</h3>
              <p className="text-gray-600">
                교과학습발달상황, 창의적체험활동, 행동특성 등을 AI가 작성합니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-xl font-semibold mb-2">학급 관리</h3>
              <p className="text-gray-600">
                학급별 학생 명단을 관리하고 CSV 파일로 일괄 등록할 수 있습니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">설문 시스템</h3>
              <p className="text-gray-600">
                학생 자기평가 설문을 AI로 생성하고 응답을 자동으로 수집합니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">일괄 생성</h3>
              <p className="text-gray-600">
                한 학급 전체의 생기부를 한 번에 생성하고 다양한 형식으로 내보냅니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-4">🏫</div>
              <h3 className="text-xl font-semibold mb-2">학교 코드</h3>
              <p className="text-gray-600">
                6자리 코드로 교사 그룹을 만들고 평가계획을 공유합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            사용 방법
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">회원가입 및 로그인</h3>
                <p className="text-gray-600">
                  Google 계정으로 간편하게 시작하세요.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Gemini API 키 설정</h3>
                <p className="text-gray-600">
                  Google AI Studio에서 무료 API 키를 발급받아 입력하세요.
                  <Link href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline ml-1">
                    API 키 발급하기 →
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">평가계획 및 학급 설정</h3>
                <p className="text-gray-600">
                  평가계획을 등록하고 학급 정보를 입력합니다.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI로 생기부 작성</h3>
                <p className="text-gray-600">
                  학생별 관찰 내용을 입력하면 AI가 생기부를 작성합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            개인 API 키로 비용 걱정 없이 생기부 작성을 시작하세요.
          </p>
          <Link href="/auth/register">
            <button className="bg-blue-500 text-white text-lg px-8 py-3 rounded-lg hover:bg-blue-600 transition">
              무료로 시작하기
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p>&copy; 2024 생기부 AI 도우미. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}