import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" className="block">
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 cursor-pointer transition-all duration-200 hover:scale-105">
        {/* Logo Image - שים את הקובץ בתיקייה public/logo.png */}
        {/* גודל התמונה: 832x290 - רוחב גדול פי 2.87 מהגובה */}
        <div className="w-40 h-14 sm:w-52 sm:h-18 md:w-64 md:h-[88px]">
          <img
            src="/logo.png"
            alt="ארון ציוד ידידים"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ארון ציוד ידידים
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">מערכת השאלות וניהול ציוד</p>
        </div>
      </div>
    </Link>
  )
}
