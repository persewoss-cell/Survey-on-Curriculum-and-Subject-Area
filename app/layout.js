import "./globals.css";

export const metadata = {
  title: "학교자율시간 설문",
  description: "연수용 실시간 익명 설문",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f4fd1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
