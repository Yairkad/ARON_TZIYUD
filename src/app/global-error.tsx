'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>שגיאה כללית</h2>
          <p>{error.message}</p>
          <button onClick={() => reset()}>נסה שוב</button>
        </div>
      </body>
    </html>
  )
}
