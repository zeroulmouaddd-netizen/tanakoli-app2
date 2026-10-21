"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"

export type DemoStep = 1 | 2 | 3 | 4 | 5

interface DemoModeContextValue {
  isActive: boolean
  isPreparing: boolean
  step: DemoStep | null
  stepStartedAt: number | null
  startDemo: () => void
  stopDemo: () => void
  setHomeMapReady: (ready: boolean) => void
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null)
const STEP_DURATION_MS = 5_000

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [step, setStep] = useState<DemoStep | null>(null)
  const [stepStartedAt, setStepStartedAt] = useState<number | null>(null)
  const [pendingStart, setPendingStart] = useState(false)
  const mapReadyRef = useRef(false)
  const activeRef = useRef(false)
  const waitingForMapRef = useRef(false)
  const stepFiveNavigationStartedRef = useRef(false)

  const beginPresentation = useCallback(() => {
    activeRef.current = true
    setIsActive(true)
    if (mapReadyRef.current) {
      waitingForMapRef.current = false
      setStep(1)
      setStepStartedAt(Date.now())
    } else {
      waitingForMapRef.current = true
      setStep(null)
      setStepStartedAt(null)
    }
  }, [])

  const startDemo = useCallback(() => {
    setPendingStart(false)
    if (pathname !== "/") {
      setPendingStart(true)
      router.push("/")
      return
    }
    beginPresentation()
  }, [beginPresentation, pathname, router])

  useEffect(() => {
    if (!pendingStart || pathname !== "/") return
    setPendingStart(false)
    beginPresentation()
  }, [beginPresentation, pathname, pendingStart])

  const stopDemo = useCallback(() => {
    activeRef.current = false
    waitingForMapRef.current = false
    setPendingStart(false)
    setIsActive(false)
    setStep(null)
    setStepStartedAt(null)
  }, [])

  const setHomeMapReady = useCallback((ready: boolean) => {
    mapReadyRef.current = ready
    if (ready && activeRef.current && waitingForMapRef.current) {
      waitingForMapRef.current = false
      setStep(1)
      setStepStartedAt(Date.now())
    }
  }, [])

  useEffect(() => {
    if (!isActive || step !== 5) {
      stepFiveNavigationStartedRef.current = false
      return
    }
    if (pathname === "/stations") {
      stepFiveNavigationStartedRef.current = true
      return
    }
    if (stepFiveNavigationStartedRef.current) return

    stepFiveNavigationStartedRef.current = true
    router.push("/stations")
  }, [isActive, pathname, router, step])

  useEffect(() => {
    if (!isActive || step === null) return

    const timer = window.setTimeout(() => {
      if (step === 5) {
        stopDemo()
        return
      }
      setStep((step + 1) as DemoStep)
      setStepStartedAt(Date.now())
    }, STEP_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [isActive, step, stopDemo])

  useEffect(() => {
    if (!isActive) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      stopDemo()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isActive, stopDemo])

  const value = useMemo<DemoModeContextValue>(() => ({
    isActive,
    isPreparing: isActive && step === null,
    step,
    stepStartedAt,
    startDemo,
    stopDemo,
    setHomeMapReady,
  }), [isActive, step, stepStartedAt, startDemo, stopDemo, setHomeMapReady])

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider")
  }
  return context
}
