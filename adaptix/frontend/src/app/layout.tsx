import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Or whatever font came with scaffold
import "./globals.css";
import Providers from "@/components/Providers";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Adaptix Dashboard",
  description: "Enterprise Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
