import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "השאלת גלגלים - ידידים",
  description: "מערכת להשאלת גלגלים",
  manifest: "/manifest-wheels.json",
  themeColor: "#374151",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "גלגלים",
  },
  icons: {
    icon: "/logo.wheels.png",
    apple: "/logo.wheels.png",
  },
};

export default function WheelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
