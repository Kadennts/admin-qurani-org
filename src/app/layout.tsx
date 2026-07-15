import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { I18nProvider } from "@/components/providers/i18n-provider";
import { PresenceProvider } from "@/components/providers/presence-provider";
import NextTopLoader from "nextjs-toploader";
import DynamicTitle from "@/components/dinamicTitle";
import { UnifiedNotificationToast } from "@/components/UnifiedNotificationToast";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Qurani",
  description: "Modern Quran application - Read, listen, and learn the Holy Quran with advanced features and beautiful interface",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/qurani-192.png",
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="/videos" />
        <link rel="dns-prefetch" href="/videos" />
        <link rel="preload" href="/videos/V-utama.mp4" as="video" type="video/mp4" />

        {/* Note: Quran fonts (indopak-nastaleeq, surah-name) are loaded conditionally in Quran/Recitation pages only */}
      </head>
      <body
        cz-shortcut-listen="true"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader
          color="#059669"
          height={4}
          showSpinner={false}
          crawlSpeed={200}
          speed={200}
        />
        <Toaster position="top-right" richColors />
        <DevServiceWorkerCleanup />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <I18nProvider namespaces={["common", "navigation", "search", "profile"]}>
            <DynamicTitle />
            <SWRProvider>
              <AuthProvider>
                <UnifiedNotificationToast />
                <PresenceProvider>
                  {children}
                </PresenceProvider>
              </AuthProvider>
            </SWRProvider>
          </I18nProvider>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
