import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "השאלת גלגלים - ידידים",
  description: "מערכת להשאלת גלגלים",
};

export default function WheelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
