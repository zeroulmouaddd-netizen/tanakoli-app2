import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { TrackingProvider } from '@/lib/tracking-context'
import { ThemeProvider } from '@/lib/theme-context'
import { BusSimulationProvider } from '@/lib/bus-simulation'
import { DriverModeProvider } from '@/lib/driver-mode-context'
import { AuthProvider } from '@/lib/auth-context'
import { AuthGate } from '@/components/auth-gate'
import { TouchInit } from '@/components/touch-init'
import './globals.css'

const notoArabic = Noto_Sans_Arabic({ 
  subsets: ["arabic"],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'تنقلي خنشلة | Tanakoli Khenchela',
  description: 'تطبيق النقل الحضري - تتبع الحافلات والمحطات',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#00A651',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${notoArabic.variable} font-sans antialiased theme-transition`}>
        <TouchInit />
        <AuthProvider>
          <ThemeProvider>
            <DriverModeProvider>
              <BusSimulationProvider>
                <TrackingProvider>
                  <AuthGate>
                    {children}
                  </AuthGate>
                </TrackingProvider>
              </BusSimulationProvider>
            </DriverModeProvider>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
