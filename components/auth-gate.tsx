"use client"

import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import { OnboardingScreen } from "./onboarding-screen"
import { LoadingScreen } from "./loading-screen"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthLoading } = useAuth()
  const pathname = usePathname()

  // Skip auth gate for admin routes - they have their own password protection
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>
  }

  if (isAuthLoading) {
    return <LoadingScreen />
  }

  if (!currentUser) {
    return <OnboardingScreen />
  }

  return <>{children}</>
}
