"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"

const DRIVER_MODE_KEY = "tanoukli_driver_mode"

interface DriverModeContextType {
  isDriverMode: boolean
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
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

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
      setPersistedDriverMode(false)
    }
  }, [currentUser, isAuthLoading])

  const enterDriverMode = useCallback(async (): Promise<boolean> => {
    if (!firestoreUserId) {
      setRoleError("يجب تسجيل الدخول أولاً")
      return false
    }

    setIsCheckingRole(true)
    setRoleError(null)

    try {
      const userDocRef = doc(db, "users", firestoreUserId)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setRoleError("عذراً، لم يتم العثور على حسابك")
        setIsCheckingRole(false)
        return false
      }

      const userData = userDoc.data()

      if (userData?.role !== "driver") {
        setRoleError("عذراً، هذا الحساب غير مصرح له بالدخول كونه ليس سائقاً معتمداً")
        setIsCheckingRole(false)
        return false
      }

      setIsDriverMode(true)
      setPersistedDriverMode(true)
      setIsCheckingRole(false)
      return true
    } catch (error) {
      console.error("Error checking driver role:", error)
      setRoleError("حدث خطأ أثناء التحقق من الصلاحيات")
      setIsCheckingRole(false)
      return false
    }
  }, [firestoreUserId])

  const exitDriverMode = useCallback(() => {
    setIsDriverMode(false)
    setPersistedDriverMode(false)
    setRoleError(null)
  }, [])

  const clearRoleError = useCallback(() => {
    setRoleError(null)
  }, [])

  return (
    <DriverModeContext.Provider value={{
      isDriverMode,
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
