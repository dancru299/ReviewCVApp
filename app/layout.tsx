import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewCV.vn",
  description: "Review CV actionable cho fresher và junior tech trong dưới 60 giây."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
