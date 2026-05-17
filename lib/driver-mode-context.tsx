"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

const DRIVER_MODE_KEY = "tanoukli_driver_mode"
const USER_DOC_ID = "0775453629"

interface DriverModeContextType {
  isDriverMode: boolean
  isCheckingRole: boolean
  roleError: string | null
  enterDriverMode: () => Promise<boolean>
  exitDriverMode: () => void
  clearRoleError: () => void
}

const DriverModeContext = createContext<DriverModeContextType | null>(null)

// Persist driver mode to localStorage
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
  const [isDriverMode, setIsDriverMode] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  // Restore driver mode on mount (check role first)
  useEffect(() => {
    const restoreDriverMode = async () => {
      const persisted = getPersistedDriverMode()
      if (persisted) {
        // Verify the user still has driver role
        try {
          const userDocRef = doc(db, "users", USER_DOC_ID)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists() && userDoc.data()?.role === "driver") {
            setIsDriverMode(true)
          } else {
            // Role no longer valid, clear persistence
            setPersistedDriverMode(false)
          }
        } catch {
          // On error, clear persistence for safety
          setPersistedDriverMode(false)
        }
      }
    }
    
    restoreDriverMode()
  }, [])

  const enterDriverMode = useCallback(async (): Promise<boolean> => {
    setIsCheckingRole(true)
    setRoleError(null)
    
    try {
      // Fetch user role from Firestore
      const userDocRef = doc(db, "users", USER_DOC_ID)
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
      
      // User is a driver, enter driver mode
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
  }, [])

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
      clearRoleError
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
