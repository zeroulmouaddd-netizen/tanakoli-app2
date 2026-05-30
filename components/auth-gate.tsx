"use client"

import { useAuth } from "@/lib/auth-context"
import { OnboardingScreen } from "./onboarding-screen"
import { Loader2 } from "lucide-react"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-sm text-white/50">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <OnboardingScreen />
  }

  return <>{children}</>
}
