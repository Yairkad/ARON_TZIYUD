import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'טופס השאלת גלגל - ידידים',
  description: 'טופס להשאלת גלגל מתחנת השאלת גלגלים של ידידים סיוע בדרכים',
  icons: {
    icon: '/logo.wheels.png',
    apple: '/logo.wheels.png',
  },
  openGraph: {
    title: 'טופס השאלת גלגל - ידידים',
    description: 'טופס להשאלת גלגל מתחנת השאלת גלגלים של ידידים סיוע בדרכים',
    type: 'website',
    images: ['/yedidim-logo.png'],
  },
}

export default function SignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        html, body {
          background: linear-gradient(135deg, #1e3a8a 0%, #374151 100%) !important;
          min-height: 100vh;
        }
      `}} />
      {children}
    </>
  )
}
