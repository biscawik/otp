import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OTP Bot - Virtual Number Service",
  description: "Beli nomor virtual untuk verifikasi OTP dengan mudah dan cepat. Powered by 5sim.net",
  keywords: "OTP, virtual number, SMS verification, 5sim",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
