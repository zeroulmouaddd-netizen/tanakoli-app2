"use client"

import { useState } from "react"
import { AdminPasswordGate } from "./admin-password-gate"
import { AdminLanguageSwitcher } from "./admin-language-switcher"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import { Bus, LogOut } from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { dir, t, isRTL } = useAdminI18n()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if already authenticated in this session
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminAuth") === "true"
    }
    return false
  })

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth")
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return (
      <AdminPasswordGate onAuthenticated={() => setIsAuthenticated(true)} />
    )
  }

  return (
    <div dir={dir} className="admin-root">
      {/* Decorative ambient background */}
      <div className="admin-ambient" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--admin-border)] bg-[rgba(5,8,15,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:h-[68px] sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* Logo mark */}
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/20 shadow-[0_8px_20px_-6px_var(--admin-glow),0_1px_0_rgba(255,255,255,0.25)_inset]"
              style={{
                background: "linear-gradient(135deg, #12c48b 0%, #0da271 55%, #0b7a55 100%)",
              }}
            >
              <Bus className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-[var(--admin-text)]">
                {t("header.title")}
              </h1>
              <p className="truncate text-[11px] font-medium leading-tight text-[var(--admin-text-3)]">
                {t("header.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-2.5">
            <AdminLanguageSwitcher />
            <button
              onClick={handleLogout}
              className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-[12px] border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3.5 text-[13px] font-semibold text-[#fca5a5] transition-all duration-200 hover:border-[rgba(248,113,113,0.55)] hover:bg-[rgba(248,113,113,0.15)] hover:shadow-[0_0_0_3px_rgba(248,113,113,0.1)] active:scale-[0.97]"
            >
              <LogOut className={`h-4 w-4 ${isRTL ? "rtl-flip" : ""}`} />
              {t("header.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--admin-border)]">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <p className="text-center text-[12.5px] text-[var(--admin-text-3)]">
            {t("footer.brand")}
            <span className="mx-2 text-[rgba(148,163,184,0.35)]">•</span>
            {t("footer.secure")}
            <span className="mx-2 text-[rgba(148,163,184,0.35)]">•</span>
            {t("footer.warning")}
          </p>
        </div>
      </footer>
    </div>
  )
}
