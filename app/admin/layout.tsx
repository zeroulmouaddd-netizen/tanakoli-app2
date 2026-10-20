import type { Metadata } from "next"
// Admin console typography — self-hosted so the build needs no external
// network. Inter (Latin) + Cairo (Arabic) give a professional mixed-script
// pairing with tabular numerals for money values.
import "@fontsource-variable/inter"
import "@fontsource/cairo/400.css"
import "@fontsource/cairo/500.css"
import "@fontsource/cairo/600.css"
import "@fontsource/cairo/700.css"
import "@fontsource/cairo/800.css"

export const metadata: Metadata = {
  title: "Admin Dashboard | Tanakoli",
  description: "Secure admin dashboard for managing drivers and transactions",
  robots: "noindex,nofollow",
}

// Skip static prerendering for admin routes (they use client-side authentication)
export const dynamic = "force-dynamic"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
