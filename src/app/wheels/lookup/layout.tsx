import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'חיפוש גלגל לפי לוחית רישוי | ידידים',
  description: 'מצא את הגלגל המתאים לרכב שלך לפי מספר רישוי. המערכת מזהה אוטומטית את סוג הרכב ומוצאת גלגלים מתאימים במלאי.',
  openGraph: {
    title: 'חיפוש גלגל לפי לוחית רישוי',
    description: 'הזן מספר רישוי ומצא גלגל מתאים לרכב שלך',
    type: 'website',
  },
}

export default function LookupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
