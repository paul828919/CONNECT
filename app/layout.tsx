import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Connect - 한국 R&D 생태계 매칭 플랫폼',
  description: 'Connect는 기업, 연구소, 대학을 연결하는 한국 R&D 생태계 매칭 플랫폼입니다. 정부 R&D 자금 지원 정보와 협업 기회를 제공합니다.',
  keywords: ['R&D', '연구개발', '정부지원', '창업', '기술개발', '산학협력'],
  authors: [{ name: 'Connect Platform' }],
  openGraph: {
    title: 'Connect - 한국 R&D 생태계 매칭 플랫폼',
    description: '기업, 연구소, 대학을 위한 R&D 자금 지원 및 협업 매칭 서비스',
    type: 'website',
    locale: 'ko_KR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
}