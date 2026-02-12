import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LogoTakeoffProvider } from "@/components/LogoTakeoffProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aetheris Airways",
  description: "Simple and trusted flight booking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <LogoTakeoffProvider>{children}</LogoTakeoffProvider>
      </body>
    </html>
  );
}
