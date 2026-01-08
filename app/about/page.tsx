'use client';

/**
 * Company Introduction Page (회사 소개)
 * About page for 이노웨이브 (Innowave) and Connect platform
 */

import Link from 'next/link';
import { Building2, Target, Lightbulb, TrendingUp, Users, Globe, CheckCircle } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <PublicHeader />

      {/* Content */}
      <div className="container mx-auto px-4 pt-32 pb-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">회사 소개</h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">
            이노웨이브 (Innowave)
          </p>
          <p className="text-lg text-gray-500">
            국가 R&D 생태계를 연결하는 지능형 매칭 플랫폼, Connect
          </p>
        </div>

        {/* Section 1: Why we created Connect */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">왜 Connect를 만들었나요?</h2>
          </div>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              대한민국은 매년 수조 원 규모의 정부 R&D 예산을 집행하지만, 정작 이 자금이 필요한 기업, 대학, 연구기관의 연구자들은
              적합한 연구과제를 찾는 데 막대한 시간과 노력을 소비하고 있습니다.
            </p>

            <div className="grid md:grid-cols-3 gap-6 my-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">정보의 분산</h3>
                <p className="text-sm text-gray-600">
                  수십 개의 기관에서 발표하는 수천 개의 연구과제 정보가 여러 사이트에 흩어져 있어
                  기업, 대학, 연구기관의 연구자들은 자신에게 맞는 프로그램을 적시에 찾기 어렵습니다.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">복잡한 신청 절차</h3>
                <p className="text-sm text-gray-600">
                  각 연구과제마다 다른 요구사항과 서류, 복잡한 신청 절차로 인해
                  기업, 대학, 연구기관의 연구자들이 지원 기회를 놓치는 경우가 많습니다.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">매칭의 어려움</h3>
                <p className="text-sm text-gray-600">
                  기업, 대학, 연구기관의 기술 역량과 연구 목표에 가장 적합한 프로그램을 찾아내는 것은
                  전문 지식 없이는 불가능에 가깝습니다.
                </p>
              </div>
            </div>

            <p>
              이노웨이브는 이러한 문제를 해결하기 위해 <strong>Connect</strong>를 만들었습니다.
              인공지능 기반의 지능형 매칭 알고리즘을 통해 기업과 R&D 연구과제를 자동으로 연결하고,
              발굴부터 수주까지 전 과정을 지원하는 대한민국 최고의 R&D 상용화 운영 시스템입니다.
            </p>
          </div>
        </div>

        {/* Section 2: What results can you expect */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Connect로 어떤 결과를 얻을 수 있나요?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">효율적인 R&D 프로그램 발굴</h3>
                  <p className="text-gray-600 text-sm">
                    AI 매칭 알고리즘이 기업, 대학, 연구기관의 연구자들의 산업 분야, 기술 성숙도(TRL), 연구 역량을 분석하여
                    가장 적합한 국가 R&D 연구과제를 자동으로 매칭합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">시간과 비용 절감</h3>
                  <p className="text-gray-600 text-sm">
                    흩어진 정보를 찾아 헤매는 시간을 획기적으로 줄이고,
                    기업, 대학, 연구기관의 연구자들은 본연의 연구개발에 집중할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">높은 연구과제 선정 성공률</h3>
                  <p className="text-gray-600 text-sm">
                    실시간 국가 전체 연구과제 공고 분석 및 사용자 맞춤형 매칭, 컨소시엄 파트너 구축 서비스를 통해
                    R&D 연구과제 선정 성공률을 높일 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">발굴부터 선정까지 원스톱 지원</h3>
                  <p className="text-gray-600 text-sm">
                    연구과제 발굴, 컨소시엄 구성 등
                    R&D 연구과제 선정 전 과정을 커넥트가 함께합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Vision for Korea's R&D Ecosystem */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">대한민국 R&D 생태계 비전</h2>
          </div>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              이노웨이브는 Connect를 통해 <strong>대한민국 R&D 생태계의 혁신</strong>을 이끌고자 합니다.
              단순한 정보 제공을 넘어, 기업·대학·연구기관·정부를 유기적으로 연결하여
              지속 가능하고 강건한 R&D 생태계를 구축하는 것이 우리의 목표입니다.
            </p>

            <div className="grid md:grid-cols-3 gap-6 my-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">연결</h3>
                <p className="text-sm text-gray-600">
                  기업, 대학, 연구기관, 정부를 하나의 플랫폼에서 연결하여
                  협력의 시너지를 극대화합니다.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">성장</h3>
                <p className="text-sm text-gray-600">
                  혁신적인 기술이 적절한 지원을 받아 성장하고,
                  새로운 기술과 제품을 창출합니다.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">경쟁력</h3>
                <p className="text-sm text-gray-600">
                  R&D 투자의 효율성을 높여 대한민국의
                  국가 경쟁력을 강화합니다.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-center text-gray-800 font-medium">
                "혁신의 선순환을 통해 대한민국이 글로벌 R&D 강국으로 도약하는 그날까지,
                이노웨이브는 Connect를 통해 모든 연구자들과 함께 R&D 생태계를 만들어가겠습니다."
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">회사 정보</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">회사명</h3>
                <p className="text-gray-600">이노웨이브 (Innowave Inc.)</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">대표자</h3>
                <p className="text-gray-600">김병진</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">사업자등록번호</h3>
                <p className="text-gray-600">224-38-00690</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">주소</h3>
                <p className="text-gray-600">부산광역시 기장군 정관중앙로 45, 2F</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">고객지원</h3>
                <p className="text-gray-600">
                  <a href="mailto:support@connectplt.kr" className="text-blue-600 hover:text-blue-700">
                    support@connectplt.kr
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">전화</h3>
                <p className="text-gray-600">070-8778-2378 (월-금, 10:00 - 16:00)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
