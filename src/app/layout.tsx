import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'One Last Recess',
  description: 'A moment at the playground',
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
