import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { TelegramProvider } from "@/contexts/TelegramContext"
import { Toaster } from "@/components/ui/toaster"
import ClientLayout from "./client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "JamolStroy - Qurilish materiallari va xizmatlari",
  description: "Qurilish materiallari, asbob-uskunalar va professional xizmatlar. Toshkent bo'ylab yetkazib berish.",
  keywords: "qurilish materiallari, asbob-uskunalar, qurilish xizmatlari, Toshkent, yetkazib berish",
  authors: [{ name: "JamolStroy" }],
  creator: "JamolStroy",
  publisher: "JamolStroy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://jamolstroy.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "JamolStroy - Qurilish materiallari va xizmatlari",
    description: "Qurilish materiallari, asbob-uskunalar va professional xizmatlar. Toshkent bo'ylab yetkazib berish.",
    url: "https://jamolstroy.vercel.app",
    siteName: "JamolStroy",
    locale: "uz_UZ",
    type: "website",
    images: [
      {
        url: "/placeholder-logo.png",
        width: 1200,
        height: 630,
        alt: "JamolStroy Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JamolStroy - Qurilish materiallari va xizmatlari",
    description: "Qurilish materiallari, asbob-uskunalar va professional xizmatlar. Toshkent bo'ylab yetkazib berish.",
    images: ["/placeholder-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/favicon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "icon",
        url: "/favicon.png",
      },
    ],
  },
  manifest: "/manifest.json",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TelegramProvider>
            <AuthProvider>
              <CartProvider>
                <ClientLayout>{children}</ClientLayout>
                <Toaster />
              </CartProvider>
            </AuthProvider>
          </TelegramProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
