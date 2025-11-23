import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from './providers/SessionProvider'
import QueryClientProvider from './providers/QueryClientProvider'
import { FeedbackWidget } from '@/components/feedback-widget'
import { Toaster } from '@/components/ui/toaster'
import StructuredData from './components/StructuredData'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Connect - 한국 R&D 자동화 플랫폼 | 정부 과제 매칭',
  description: '국내 주요 4개 기관 200-500개 최신 공고 매칭. 귀사에 적합한 정부 R&D 과제를 자동으로 찾아드립니다. IITP, KEIT, TIPA, KIMST 연구과제 실시간 모니터링.',
  keywords: [
    '정부과제',
    'R&D',
    '매칭',
    '정부지원금',
    '기술개발',
    '사업화',
    'IITP',
    'KEIT',
    'TIPA',
    '연구과제',
    '정부R&D',
    '연구개발과제',
    '정부지원사업',
    '과기정통부',
    '산업통상자원부',
    '중소벤처기업부',
  ],
  authors: [{ name: 'Connect Platform' }],
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: 'Connect - 한국 R&D 자동화 플랫폼 | 정부 과제 매칭',
    description: '국내 주요 4개 기관 200-500개 최신 공고 매칭. 귀사에 적합한 정부 R&D 과제를 자동으로 찾아드립니다.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://connectplt.kr',
    siteName: 'Connect',
    images: [
      {
        url: 'https://connectplt.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Connect - 한국 R&D 자동화 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect - 한국 R&D 자동화 플랫폼',
    description: '국내 주요 4개 기관 200-500개 최신 공고 매칭',
    images: ['https://connectplt.kr/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://connectplt.kr',
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-google-verification-code',
    // Add Naver verification when available
    // other: {
    //   'naver-site-verification': 'your-naver-verification-code',
    // },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <QueryClientProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <FeedbackWidget />
            <Toaster />
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  )
}