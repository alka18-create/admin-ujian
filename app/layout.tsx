import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import NextAuthProvider from "@/components/providers/NextAuthProvider";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Admin Ujian Sekolah",
    template: "%s | Admin Ujian Sekolah",
  },
  description: "Aplikasi Administrasi Ujian Sekolah - Kelola jadwal, pengawas, dan denah kursi ujian",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={publicSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthProvider>{children}</NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
