"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import {
  isAuthorizedDriverPhone,
  isAuthorizedDriverInFirebase,
  recordGrantsDriverRole,
  isDriversCollectionRecord,
  registerAuthorizedDriverPhone,
  toLocalPhone,
  toE164,
  AUTHENTICATED_PHONE_STORAGE_KEY,
} from "@/lib/driver-config"
import {
  useDriverLocationTracking,
  syncDriverOnlinePresence,
  syncDriverOfflinePresence,
  type DriverLocation,
} from "@/hooks/use-driver-location-tracking"

const DRIVER_MODE_KEY = "tanoukli_driver_mode"
const DRIVER_AUTH_SESSION_KEY = "tanakoli_is_driver"

// ── Test driver flag — set by onboarding for Play Store reviewer ─────────────
const TEST_DRIVER_FLAG = "tanakoli_test_driver_mode"
const TEST_DRIVER_PHONE = "+213666666666"

interface DriverModeContextType {
  isDriverMode: boolean
  isAuthorizedDriver: boolean
  isCheckingRole: boolean
  roleError: string | null
  driverPhone: string | null
  isLocationTracking: boolean
  lastLocation: DriverLocation | null
  enterDriverMode: () => Promise<boolean>
  exitDriverMode: () => void
  clearRoleError: () => void
  triggerLocationUpdate: () => void
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

function resolveCurrentDriverPhone(
  authPhone: string | null | undefined,
  firestoreUserId: string | null | undefined
): string | null {
  if (authPhone) return authPhone
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(TEST_DRIVER_FLAG) === "true") {
        return TEST_DRIVER_PHONE
      }
    } catch {}
    try {
      const stored = localStorage.getItem(AUTHENTICATED_PHONE_STORAGE_KEY)
      if (stored) return stored
    } catch {}
  }
  return firestoreUserId || null
}

export function DriverModeProvider({ children }: { children: ReactNode }) {
  const { firestoreUserId, currentUser, isAuthLoading } = useAuth()
  const [isDriverMode, setIsDriverMode] = useState(false)
  const [isAuthorizedDriver, setIsAuthorizedDriver] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  const resolvedPhone = currentUser
    ? resolveCurrentDriverPhone(currentUser.phoneNumber, firestoreUserId)
    : null
  const lastActiveDriverPhoneRef = useRef<string | null>(null)

  if (resolvedPhone && (isAuthorizedDriver || isDriverMode)) {
    lastActiveDriverPhoneRef.current = resolvedPhone
  }

  // Persist authenticated phone for consistent resolution across reloads
  useEffect(() => {
    if (!currentUser?.phoneNumber) return
    try {
      localStorage.setItem(AUTHENTICATED_PHONE_STORAGE_KEY, currentUser.phoneNumber)
    } catch {}
  }, [currentUser?.phoneNumber])

  // Compute driver authorization from whitelist + Firebase records + real-time listeners
  useEffect(() => {
    if (isAuthLoading) return
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return
    }

    // Test driver bypass — reviewer session set by onboarding screen
    try {
      if (sessionStorage.getItem(TEST_DRIVER_FLAG) === "true" && currentUser) {
        setIsAuthorizedDriver(true)
        return
      }
    } catch {}

    if (!currentUser || !resolvedPhone) {
      setIsAuthorizedDriver(false)
      try {
        sessionStorage.removeItem(DRIVER_AUTH_SESSION_KEY)
      } catch {}
      return
    }

    // Fast path: sessionStorage cache or local whitelist
    try {
      const cached = sessionStorage.getItem(DRIVER_AUTH_SESSION_KEY)
      if (cached === "true") {
        setIsAuthorizedDriver(true)
      }
    } catch {}

    if (isAuthorizedDriverPhone(resolvedPhone)) {
      setIsAuthorizedDriver(true)
      try {
        sessionStorage.setItem(DRIVER_AUTH_SESSION_KEY, "true")
      } catch {}
    }

    let cancelled = false
    isAuthorizedDriverInFirebase(resolvedPhone).then((authorized) => {
      if (cancelled) return
      if (authorized) {
        setIsAuthorizedDriver(true)
        try {
          sessionStorage.setItem(DRIVER_AUTH_SESSION_KEY, "true")
        } catch {}
      }
    })

    // Also attach real-time listeners on `drivers/{local}` and `users/{local}`
    // so if an admin authorizes the phone while the user is logged in, it activates immediately
    const local = toLocalPhone(resolvedPhone)
    const e164 = toE164(resolvedPhone)
    let unsubDriverDoc = () => {}
    let unsubUserDoc = () => {}

    if (db && local) {
      try {
        unsubDriverDoc = onSnapshot(
          doc(db, "drivers", local),
          (snap) => {
            if (cancelled) return
            if (snap.exists() && isDriversCollectionRecord(snap.data())) {
              if (e164) registerAuthorizedDriverPhone(e164)
              setIsAuthorizedDriver(true)
              try {
                sessionStorage.setItem(DRIVER_AUTH_SESSION_KEY, "true")
              } catch {}
            }
          },
          () => {}
        )
      } catch {}

      try {
        unsubUserDoc = onSnapshot(
          doc(db, "users", local),
          (snap) => {
            if (cancelled) return
            if (snap.exists() && recordGrantsDriverRole(snap.data())) {
              if (e164) registerAuthorizedDriverPhone(e164)
              setIsAuthorizedDriver(true)
              try {
                sessionStorage.setItem(DRIVER_AUTH_SESSION_KEY, "true")
              } catch {}
            }
          },
          () => {}
        )
      } catch {}
    }

    return () => {
      cancelled = true
      unsubDriverDoc()
      unsubUserDoc()
    }
  }, [currentUser, isAuthLoading, resolvedPhone])

  // Restore persisted driver mode when an authorized driver opens the app
  useEffect(() => {
    if (isAuthLoading) return

    if (!currentUser || !resolvedPhone) {
      setIsDriverMode(false)
      setPersistedDriverMode(false)
      return
    }

    const restoreDriverMode = async () => {
      const persisted = getPersistedDriverMode()
      if (!persisted) return

      if (isAuthorizedDriver || isAuthorizedDriverPhone(resolvedPhone)) {
        setIsDriverMode(true)
        return
      }

      const authorized = await isAuthorizedDriverInFirebase(resolvedPhone)
      if (authorized) {
        setIsAuthorizedDriver(true)
        setIsDriverMode(true)
      } else {
        setPersistedDriverMode(false)
      }
    }

    void restoreDriverMode()
  }, [currentUser, resolvedPhone, isAuthorizedDriver, isAuthLoading])

  // Automatically activate real-time presence, heartbeat, and GPS sync whenever
  // an authorized driver is authenticated / has the app open
  const isDriverOnlineSession = Boolean(
    !isAuthLoading && currentUser && resolvedPhone && (isAuthorizedDriver || isDriverMode)
  )

  const {
    isTracking: isLocationTracking,
    lastLocation,
    triggerImmediateLocationUpdate,
  } = useDriverLocationTracking(resolvedPhone, isDriverOnlineSession)

  // Trigger an immediate GPS location & presence update when opening the driver view
  useEffect(() => {
    if (isDriverMode && resolvedPhone) {
      triggerImmediateLocationUpdate()
    }
  }, [isDriverMode, resolvedPhone, triggerImmediateLocationUpdate])

  // Handle logout: mark driver offline in Firebase and clear state
  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      if (lastActiveDriverPhoneRef.current) {
        const phoneToOffline = lastActiveDriverPhoneRef.current
        lastActiveDriverPhoneRef.current = null
        void syncDriverOfflinePresence(phoneToOffline)
      }
      setIsDriverMode(false)
      setIsAuthorizedDriver(false)
      setPersistedDriverMode(false)
      try {
        sessionStorage.removeItem(DRIVER_AUTH_SESSION_KEY)
      } catch {}
    }
  }, [currentUser, isAuthLoading])

  const enterDriverMode = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      setRoleError("يجب تسجيل الدخول أولاً")
      return false
    }

    const phone = resolveCurrentDriverPhone(currentUser.phoneNumber, firestoreUserId)

    // Test driver bypass — allow reviewer session without phone whitelist
    try {
      if (sessionStorage.getItem(TEST_DRIVER_FLAG) === "true") {
        setIsAuthorizedDriver(true)
        setIsDriverMode(true)
        setPersistedDriverMode(true)
        if (phone) {
          void syncDriverOnlinePresence(phone)
        }
        return true
      }
    } catch {}

    setIsCheckingRole(true)
    try {
      if (!isAuthorizedDriverPhone(phone)) {
        const authorized = await isAuthorizedDriverInFirebase(phone)
        if (!authorized) {
          setRoleError("عذراً، هذا الحساب غير مصرح له بالدخول كونه ليس سائقاً معتمداً")
          return false
        }
      }

      setIsAuthorizedDriver(true)
      try {
        sessionStorage.setItem(DRIVER_AUTH_SESSION_KEY, "true")
      } catch {}
      setIsDriverMode(true)
      setPersistedDriverMode(true)

      if (phone) {
        void syncDriverOnlinePresence(phone)
      }
      return true
    } finally {
      setIsCheckingRole(false)
    }
  }, [currentUser, firestoreUserId])

  const exitDriverMode = useCallback(() => {
    setIsDriverMode(false)
    setPersistedDriverMode(false)
    setRoleError(null)
    // Clear test driver flag on explicit exit so the session doesn't linger
    try {
      sessionStorage.removeItem(TEST_DRIVER_FLAG)
    } catch {}
  }, [])

  const clearRoleError = useCallback(() => {
    setRoleError(null)
  }, [])

  return (
    <DriverModeContext.Provider
      value={{
        isDriverMode,
        isAuthorizedDriver,
        isCheckingRole,
        roleError,
        driverPhone: resolvedPhone,
        isLocationTracking,
        lastLocation,
        enterDriverMode,
        exitDriverMode,
        clearRoleError,
        triggerLocationUpdate: triggerImmediateLocationUpdate,
      }}
    >
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
