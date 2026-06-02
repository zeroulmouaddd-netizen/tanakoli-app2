import type { Metadata } from "next"

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
