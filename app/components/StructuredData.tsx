/**
 * Structured Data Component (JSON-LD)
 *
 * Provides rich structured data for search engines using JSON-LD format.
 * Implements:
 * - Organization schema (company info)
 * - WebApplication schema (product info)
 * - BreadcrumbList schema (navigation)
 *
 * SEO Benefits:
 * - Rich snippets in search results
 * - Knowledge Graph eligibility
 * - Better crawling and indexing
 * - Enhanced search appearance
 */
export default function StructuredData() {
  // Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Connect',
    legalName: 'Connect Platform',
    url: 'https://connectplt.kr',
    logo: 'https://connectplt.kr/logo.svg',
    description:
      '한국 R&D 생태계를 연결하는 지능형 매칭 플랫폼. 국내 주요 4개 기관의 정부 R&D 과제를 자동으로 모니터링하고 매칭합니다.',
    foundingDate: '2025',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      addressLocality: '서울',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean'],
    },
    sameAs: [
      // Add social media profiles when available
      // 'https://www.linkedin.com/company/connect-platform',
      // 'https://twitter.com/connect_kr',
    ],
  };

  // WebApplication Schema
  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Connect',
    url: 'https://connectplt.kr',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    description:
      '국내 주요 4개 기관 200-500개 최신 공고 매칭. 귀사에 적합한 정부 R&D 과제를 자동으로 찾아드립니다.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
      description: '무료 플랜 제공 - 매월 3회 무료 매칭',
    },
    featureList: [
      '4개 핵심 연구관리 전문기관 모니터링',
      'AI 기반 자동 매칭',
      '정기 공고 업데이트',
      '맞춤형 매칭 알림',
      '산학연 협력 네트워크',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: '50',
      bestRating: '5',
      worstRating: '1',
    },
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://connectplt.kr',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Sign In',
        item: 'https://connectplt.kr/auth/signin',
      },
    ],
  };

  // FAQ Schema (for common questions)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Connect는 어떤 기관의 R&D 과제를 모니터링하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'IITP (정보통신기획평가원), KEIT (한국산업기술평가관리원), TIPA (중소기업기술정보진흥원), KIMST (해양수산과학기술진흥원) 등 국내 주요 4개 연구관리 전문기관의 과제를 모니터링합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '무료 플랜으로 이용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 무료 플랜은 매월 3회 매칭을 제공합니다. 신용카드 등록 없이 3분 만에 시작하실 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'AI 매칭은 어떻게 작동하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '귀사의 프로필 (산업 분야, 기술 역량, 연구 경험)을 분석하여 적합한 R&D 과제를 자동으로 매칭합니다. 매칭 정확도는 평균 38%입니다.',
        },
      },
    ],
  };

  return (
    <>
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      {/* WebApplication Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />

      {/* BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
