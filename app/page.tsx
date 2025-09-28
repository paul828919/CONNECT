export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Connect
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          한국 R&D 생태계를 연결하는 지능형 매칭 플랫폼
        </p>
        <p className="text-lg text-gray-500 max-w-3xl mx-auto">
          기업, 연구소, 대학을 위한 정부 R&D 자금 지원 정보와 협업 기회를 제공합니다.
          19개 정부 기관의 실시간 공고 정보를 통해 최적의 매칭을 찾아보세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
          <div className="p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              정부 R&D 자금 지원
            </h3>
            <p className="text-blue-700">
              19개 정부 기관의 실시간 공고 정보로 놓치는 기회 없이 지원하세요.
            </p>
          </div>

          <div className="p-6 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              산학연 협력 매칭
            </h3>
            <p className="text-green-700">
              기업-대학-연구소 간의 효과적인 협력 파트너를 찾아 혁신을 가속화하세요.
            </p>
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              기술 이전 지원
            </h3>
            <p className="text-purple-700">
              대학과 연구소의 기술을 상용화로 연결하는 기술이전 생태계를 지원합니다.
            </p>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <div className="text-sm text-gray-500">
            현재 개발 중 • 2024년 12월 15일 출시 예정
          </div>
          <div className="text-sm text-gray-400">
            Connect Platform v7.0 • 한국 R&D 생태계의 디지털 혁신
          </div>
        </div>
      </div>
    </div>
  )
}