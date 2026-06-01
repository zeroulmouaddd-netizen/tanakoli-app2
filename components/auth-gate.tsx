"use client"

import { useAuth } from "@/lib/auth-context"
import { OnboardingScreen } from "./onboarding-screen"
import { LoadingScreen } from "./loading-screen"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return <LoadingScreen />
  }

  if (!currentUser) {
    return <OnboardingScreen />
  }

  return <>{children}</>
}
