"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import { OnboardingScreen } from "./onboarding-screen"
import { LoadingScreen } from "./loading-screen"
import { IntroOnboarding } from "./intro-onboarding"

const STORAGE_KEY = "tanakoli_intro_seen"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthLoading } = useAuth()
  const pathname = usePathname()
  const [introSeen, setIntroSeen] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      setIntroSeen(seen === "1")
    } catch {
      setIntroSeen(true)
    }
  }, [])

  const handleIntroDone = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setIntroSeen(true)
  }

  const handleShowIntro = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setIntroSeen(false)
  }

  // Skip auth gate for admin routes — they have their own password protection
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>
  }

  // Wait for both auth and localStorage check to resolve
  if (isAuthLoading || introSeen === null) {
    return <LoadingScreen />
  }

  // Show intro slides only on the very first launch, before login
  if (!introSeen && !currentUser) {
    return <IntroOnboarding onDone={handleIntroDone} />
  }

  if (!currentUser) {
    return <OnboardingScreen onShowIntro={handleShowIntro} />
  }

  return <>{children}</>
}
