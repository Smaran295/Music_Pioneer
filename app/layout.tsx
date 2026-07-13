import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Kalam } from "next/font/google"
import MobileHeaderClient from "./mobile-header-client"
import { Toaster } from "@/components/ui/toaster"
import { AuthInitializerWrapper } from "./auth-initializer-wrapper"

export const metadata: Metadata = {
  title: "Music Pioneer - Stream Your Favorite Music",
  description: "Discover and stream millions of songs, create playlists, and explore new artists",
}

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-brand",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${kalam.variable} antialiased`}
    >
      <body className={`font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthInitializerWrapper />
          <MobileHeaderClient />
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
