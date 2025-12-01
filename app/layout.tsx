import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '이으리 - 학교 밖 청소년을 위한 AI 동반자',
  description: '학교 밖 청소년을 위한 비공식 안내자이자, 감정·진로·정보를 함께 정리해주는 AI 친구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

