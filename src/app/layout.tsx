import type { Metadata } from "next";
import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  weight: ["400", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});
const dancingScript = Dancing_Script({
  subsets: ["latin", "vietnamese"],
  variable: "--font-dancing",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LMS Đào tạo",
  description: "Nền tảng học trực tuyến — học viên, giảng viên, quản trị.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${playfair.variable} ${dancingScript.variable}`}
    >
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
