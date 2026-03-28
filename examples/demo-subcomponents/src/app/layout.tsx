import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'tailwind-styled-v4 Demo',
  description: 'The first explainable styling system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
