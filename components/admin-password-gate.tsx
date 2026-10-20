"use client"

import { useState } from "react"
import { Bus, Lock, Eye, EyeOff } from "lucide-react"

const ADMIN_PASSWORD = "admin123"

interface AdminPasswordGateProps {
  onAuthenticated: () => void
}

export function AdminPasswordGate({ onAuthenticated }: AdminPasswordGateProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate a small delay for security feel
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (password === ADMIN_PASSWORD) {
      // Store auth in sessionStorage (valid only for this session)
      sessionStorage.setItem("adminAuth", "true")
      onAuthenticated()
    } else {
      setError("Invalid password")
      setPassword("")
      setAttempts((n) => n + 1)
      setIsLoading(false)
    }
  }

  return (
    <div dir="ltr" className="admin-root flex items-center justify-center px-4">
      {/* Decorative ambient background */}
      <div className="admin-ambient" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[400px] py-10">
        <div key={attempts} className={`admin-card p-6 sm:p-8 ${attempts > 0 ? "admin-shake" : ""}`}>
          {/* Brand mark */}
          <div className="mb-7 flex items-center justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-white/20 shadow-[0_12px_32px_-8px_var(--admin-glow),0_1px_0_rgba(255,255,255,0.25)_inset]"
              style={{
                background: "linear-gradient(135deg, #12c48b 0%, #0da271 55%, #0b7a55 100%)",
              }}
            >
              <Bus className="h-7 w-7 text-white" strokeWidth={2.2} />
            </div>
          </div>

          <h1 className="mb-1.5 text-center text-[22px] font-bold tracking-tight text-[var(--admin-text)]">
            Admin Dashboard
          </h1>
          <p className="mb-7 text-center text-[13.5px] text-[var(--admin-text-2)]">
            Enter your password to continue
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-3)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter admin password"
                  className="admin-input h-[52px] ps-11 pe-12 text-[15px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--admin-text-3)] transition-colors hover:bg-white/5 hover:text-[var(--admin-text-2)] disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {error && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium text-red-400">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isLoading || !password} className="admin-btn-primary w-full h-[50px]">
              {isLoading ? "Verifying..." : "Unlock Admin Panel"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-[var(--admin-text-3)]">
            Secure Session
            <span className="mx-2 text-[rgba(148,163,184,0.35)]">•</span>
            Session-only authentication
          </p>
        </div>
      </div>
    </div>
  )
}
