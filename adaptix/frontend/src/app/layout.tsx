import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Or whatever font came with scaffold
import "./globals.css";
import Providers from "@/components/Providers";
import { ThemeProvider } from "@/components/theme-provider"; // Standard next-themes
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext"; // Custom backend colors
import { CommandMenu } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/sonner";

import { SyncManager } from "@/components/providers/SyncManager";

const inter = Inter({ subsets: ["latin"] });
// ... (rest of the imports)

export const metadata: Metadata = {
  title: "Adaptix Dashboard",
  description: "Enterprise Management System",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CustomThemeProvider>{children}</CustomThemeProvider>
            <SyncManager />
            <CommandMenu />
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
