import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'טופס השאלת גלגל - ידידים',
  description: 'טופס להשאלת גלגל מתחנת השאלת צמיגים של ידידים סיוע בדרכים',
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
  return children
}
