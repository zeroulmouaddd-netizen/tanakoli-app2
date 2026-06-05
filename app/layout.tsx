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
  title: 'تنقلي خنشلة - معاذ عبد الودود زروال',
  description: 'تطبيق تنقلي خنشلة - تطبيق النقل الحضري لمدينة خنشلة، من تطوير المهندس معاذ عبد الودود زروال',
  authors: [{ name: 'معاذ عبد الودود زروال' }],
  creator: 'معاذ عبد الودود زروال',
  openGraph: {
    title: 'تنقلي خنشلة - معاذ عبد الودود زروال',
    description: 'تطبيق النقل الحضري لمدينة خنشلة، من تطوير المهندس معاذ عبد الودود زروال',
    type: 'website',
    locale: 'ar_DZ',
  },
  other: {
    'author': 'معاذ عبد الودود زروال',
  },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "تنقلي خنشلة",
    "author": {
      "@type": "Person",
      "name": "معاذ عبد الودود زروال",
      "jobTitle": "مهندس برمجيات"
    },
    "applicationCategory": "TransportationApplication",
    "operatingSystem": "Android, Web",
    "description": "تطبيق النقل الحضري لمدينة خنشلة"
  }

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
