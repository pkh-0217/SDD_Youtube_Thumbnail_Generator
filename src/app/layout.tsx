import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "썸네일 생성기",
  description: "프롬프트로 YouTube 썸네일 후보를 만들고 제목을 얹어 PNG로 내려받는 도구.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
