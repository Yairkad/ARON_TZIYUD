import Image from 'next/image'

export default function Logo() {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      {/* Logo Image - שים את הקובץ בתיקייה public/logo.png */}
      <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20">
        <Image
          src="/logo.png"
          alt="ארון ציוד ידידים"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          ארון ציוד ידידים
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">מערכת ניהול השאלות וציוד</p>
      </div>
    </div>
  )
}
