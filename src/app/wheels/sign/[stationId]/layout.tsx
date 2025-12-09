import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'טופס השאלת גלגל - ידידים',
  description: 'טופס להשאלת גלגל מתחנת השאלת צמיגים של ידידים סיוע בדרכים',
  icons: {
    icon: '/logo.wheels.png',
    apple: '/logo.wheels.png',
  },
  openGraph: {
    title: 'טופס השאלת גלגל - ידידים',
    description: 'טופס להשאלת גלגל מתחנת השאלת צמיגים של ידידים סיוע בדרכים',
    type: 'website',
  },
}

export default function SignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link rel="icon" href="/logo.wheels.png" />
      <link rel="apple-touch-icon" href="/logo.wheels.png" />
      {children}
    </>
  )
}
