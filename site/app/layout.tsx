import type { Metadata } from "next";
import "./globals.css";
import "./rihla-visual.css";

export const metadata: Metadata = {
  title: "رِحلة — مستشارك الشخصي للسفر",
  description: "اكتشف الوجهات وقارن بينها وخطّط رحلتك بمصادر رسمية وخطط محفوظة.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}

