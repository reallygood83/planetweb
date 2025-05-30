import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-slate-900">Planet</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login" className="text-slate-600 hover:text-slate-900 font-medium">
                로그인
              </Link>
              <Link href="/auth/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
              학생 자기평가로 만드는
              <span className="block text-blue-600">맞춤형 생활기록부</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-600">
              학생들의 소중한 성찰과 자기평가를 바탕으로
              <br />
              AI가 개인별 특성을 살린 생기부를 작성해드립니다.
            </p>
            <div className="mt-10 flex gap-4 justify-center">
              <Link href="/auth/register" className="bg-blue-600 text-white text-lg px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl">
                무료로 시작하기
              </Link>
              <Link href="#features" className="bg-white text-slate-700 text-lg px-8 py-3 rounded-lg hover:bg-slate-50 transition-colors font-medium border border-slate-300">
                더 알아보기
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">학생 중심 설계</h3>
              <p className="text-slate-600">
                학생들의 자기평가와 성찰 내용을 중심으로 개인별 특성을 반영합니다.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">NEIS 규정 준수</h3>
              <p className="text-slate-600">
                500자 제한, 명사형 종결어미 등 NEIS 규정을 자동으로 검증합니다.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">맞춤형 AI 분석</h3>
              <p className="text-slate-600">
                개별 학생의 자기평가 패턴을 분석하여 개성 있는 생기부를 생성합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              학생 성장을 담는 특별한 기능들
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              학생들의 목소리와 성찰이 살아있는 생활기록부를 만들어주는 기능들
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🎯",
                title: "학생 자기평가 설문",
                description: "학생들이 스스로의 성장과 노력을 돌아볼 수 있는 맞춤형 설문을 AI가 생성합니다."
              },
              {
                icon: "💭",
                title: "성찰 기반 AI 분석",
                description: "학생들의 자기평가 내용을 분석하여 개별 특성과 성장 포인트를 찾아냅니다."
              },
              {
                icon: "📝",
                title: "개인 맞춤 생기부",
                description: "각 학생의 자기평가를 바탕으로 개성 있고 진정성 있는 생기부를 작성합니다."
              },
              {
                icon: "🌱",
                title: "성장 스토리 생성",
                description: "학생의 변화와 발전 과정을 자기평가 결과로부터 스토리텔링합니다."
              },
              {
                icon: "📊",
                title: "평가 데이터 분석",
                description: "학생들의 자기평가 패턴을 분석하여 교육적 인사이트를 제공합니다."
              },
              {
                icon: "🤝",
                title: "교사-학생 연결",
                description: "학생의 목소리가 교사의 관찰과 조화롭게 어우러진 기록을 만듭니다."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              간단한 사용 방법
            </h2>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "1",
                title: "학급과 학생 등록",
                description: "담당 학급과 학생들을 등록하고 기본 정보를 설정합니다."
              },
              {
                step: "2",
                title: "자기평가 설문 생성",
                description: "AI가 교육과정에 맞는 학생 자기평가 설문을 자동으로 생성합니다."
              },
              {
                step: "3",
                title: "학생 자기평가 수집",
                description: "학생들이 온라인으로 자기평가를 작성하면 자동으로 수집됩니다."
              },
              {
                step: "4",
                title: "맞춤형 생기부 생성",
                description: "학생의 자기평가와 교사 관찰을 종합하여 개인별 생기부를 작성합니다."
              }
            ].map((item, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                  {item.step === "2" && (
                    <Link href="https://makersuite.google.com/app/apikey" target="_blank" className="inline-flex items-center text-blue-600 hover:text-blue-700 mt-2">
                      API 키 발급하기
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            학생들의 목소리를 담은 생기부를 만들어보세요
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            학생 자기평가 중심의 새로운 생활기록부 작성을 지금 시작하세요.
          </p>
          <Link href="/auth/register" className="inline-block bg-white text-blue-600 text-lg px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-lg">
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 박달초 김문정 | <a href="https://www.youtube.com/@%EB%B0%B0%EC%9B%80%EC%9D%98%EB%8B%AC%EC%9D%B8-p5v" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">유튜브 배움의 달인</a></p>
        </div>
      </footer>
    </div>
  )
}