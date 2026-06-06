"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import { isAuthorizedDriverPhone } from "@/lib/driver-config"

const DRIVER_MODE_KEY = "tanoukli_driver_mode"
const DRIVER_AUTH_SESSION_KEY = "tanakoli_is_driver"

// ── Test driver flag — set by onboarding for Play Store reviewer ─────────────
const TEST_DRIVER_FLAG = "tanakoli_test_driver_mode"

interface DriverModeContextType {
  isDriverMode: boolean
  isAuthorizedDriver: boolean
  isCheckingRole: boolean
  roleError: string | null
  enterDriverMode: () => Promise<boolean>
  exitDriverMode: () => void
  clearRoleError: () => void
}

const DriverModeContext = createContext<DriverModeContextType | null>(null)

function getPersistedDriverMode(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(DRIVER_MODE_KEY) === "true"
  } catch {
    return false
  }
}

function setPersistedDriverMode(value: boolean): void {
  if (typeof window === "undefined") return
  try {
    if (value) {
      localStorage.setItem(DRIVER_MODE_KEY, "true")
    } else {
      localStorage.removeItem(DRIVER_MODE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export function DriverModeProvider({ children }: { children: ReactNode }) {
  const { firestoreUserId, currentUser, isAuthLoading } = useAuth()
  const [isDriverMode, setIsDriverMode] = useState(false)
  const [isAuthorizedDriver, setIsAuthorizedDriver] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  // Compute driver authorization from the phone whitelist, cached in sessionStorage
  useEffect(() => {
    if (isAuthLoading) return

    // Test driver bypass — reviewer session set by onboarding screen
    try {
      if (sessionStorage.getItem(TEST_DRIVER_FLAG) === "true" && currentUser) {
        setIsAuthorizedDriver(true)
        return
      }
    } catch {}

    if (!currentUser?.phoneNumber) {
      setIsAuthorizedDriver(false)
      try { sessionStorage.removeItem(DRIVER_AUTH_SESSION_KEY) } catch {}
      return
    }

    // Check sessionStorage cache first to avoid recomputing every render
    try {
      const cached = sessionStorage.getItem(DRIVER_AUTH_SESSION_KEY)
      if (cached !== null) {
        setIsAuthorizedDriver(cached === "true")
        return
      }
    } catch {}

    // Not in cache — compute from whitelist and store
    const authorized = isAuthorizedDriverPhone(currentUser.phoneNumber)
    setIsAuthorizedDriver(authorized)
    try { sessionStorage.setItem(DRIVER_AUTH_SESSION_KEY, String(authorized)) } catch {}
  }, [currentUser, isAuthLoading])

  useEffect(() => {
    if (isAuthLoading) return

    if (!firestoreUserId) {
      setIsDriverMode(false)
      setPersistedDriverMode(false)
      return
    }

    const restoreDriverMode = async () => {
      const persisted = getPersistedDriverMode()
      if (persisted) {
        try {
          const userDocRef = doc(db, "users", firestoreUserId)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists() && userDoc.data()?.role === "driver") {
            setIsDriverMode(true)
          } else {
            setPersistedDriverMode(false)
          }
        } catch {
          setPersistedDriverMode(false)
        }
      }
    }

    restoreDriverMode()
  }, [firestoreUserId, isAuthLoading])

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      setIsDriverMode(false)
      setIsAuthorizedDriver(false)
      setPersistedDriverMode(false)
      try { sessionStorage.removeItem(DRIVER_AUTH_SESSION_KEY) } catch {}
    }
  }, [currentUser, isAuthLoading])

  const enterDriverMode = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      setRoleError("يجب تسجيل الدخول أولاً")
      return false
    }

    // Test driver bypass — allow reviewer session without phone whitelist
    try {
      if (sessionStorage.getItem(TEST_DRIVER_FLAG) === "true") {
        setIsDriverMode(true)
        setPersistedDriverMode(true)
        return true
      }
    } catch {}

    if (!isAuthorizedDriverPhone(currentUser.phoneNumber)) {
      setRoleError("عذراً، هذا الحساب غير مصرح له بالدخول كونه ليس سائقاً معتمداً")
      return false
    }

    setIsDriverMode(true)
    setPersistedDriverMode(true)
    return true
  }, [currentUser])

  const exitDriverMode = useCallback(() => {
    setIsDriverMode(false)
    setPersistedDriverMode(false)
    setRoleError(null)
    // Clear test driver flag on explicit exit so the session doesn't linger
    try { sessionStorage.removeItem(TEST_DRIVER_FLAG) } catch {}
  }, [])

  const clearRoleError = useCallback(() => {
    setRoleError(null)
  }, [])

  return (
    <DriverModeContext.Provider value={{
      isDriverMode,
      isAuthorizedDriver,
      isCheckingRole,
      roleError,
      enterDriverMode,
      exitDriverMode,
      clearRoleError,
    }}>
      {children}
    </DriverModeContext.Provider>
  )
}

export function useDriverMode() {
  const context = useContext(DriverModeContext)
  if (!context) {
    throw new Error("useDriverMode must be used within a DriverModeProvider")
  }
  return context
}
