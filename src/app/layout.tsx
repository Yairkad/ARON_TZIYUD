import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import ToastProvider from "@/components/ToastProvider";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ארון ציוד ידידים",
  description: "מערכת לניהול השאלות והחזרות ציוד",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // This enables safe area support
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
      <body className={`${rubik.className} antialiased`}>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
