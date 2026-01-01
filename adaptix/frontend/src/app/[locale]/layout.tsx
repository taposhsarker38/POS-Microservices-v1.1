import type { Metadata } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import "../globals.css";
import Providers from "@/components/Providers";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { CommandMenu } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/sonner";
import { SyncManager } from "@/components/providers/SyncManager";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  variable: "--font-hind-siliguri",
});

export const metadata: Metadata = {
  title: "Adaptix Dashboard",
  description: "Enterprise Management System",
  manifest: "/manifest.json",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${hindSiliguri.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
