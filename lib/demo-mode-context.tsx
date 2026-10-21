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

export type DemoStep = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type DemoStep6Phase = "past" | "upcoming" | "history"
export type DemoPhase = "auth" | "tour"

interface DemoModeContextValue {
  isActive: boolean
  demoPhase: DemoPhase
  isPreparing: boolean
  step: DemoStep | null
  stepStartedAt: number | null
  step6Phase: DemoStep6Phase
  setStep6Phase: (phase: DemoStep6Phase) => void
  startDemo: () => void
  completeAuthDemo: () => void
  stopDemo: () => void
  setHomeMapReady: (ready: boolean) => void
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null)
const STEP_DURATION_MS = 5_000

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("tour")
  const [step, setStep] = useState<DemoStep | null>(null)
  const [stepStartedAt, setStepStartedAt] = useState<number | null>(null)
  const [step6Phase, setStep6Phase] = useState<DemoStep6Phase>("past")
  const mapReadyRef = useRef(false)
  const demoPhaseRef = useRef<DemoPhase>("tour")
  const activeRef = useRef(false)
  const waitingForMapRef = useRef(false)
  const stepRouteNavigationRef = useRef<{ step: DemoStep; path: string } | null>(null)

  const beginPresentation = useCallback(() => {
    activeRef.current = true
    demoPhaseRef.current = "tour"
    setDemoPhase("tour")
    setStep6Phase("past")
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
    activeRef.current = true
    waitingForMapRef.current = false
    mapReadyRef.current = false
    demoPhaseRef.current = "auth"
    stepRouteNavigationRef.current = null
    setDemoPhase("auth")
    setStep6Phase("past")
    setIsActive(true)
    setStep(null)
    setStepStartedAt(null)
    if (pathname !== "/") router.replace("/")
  }, [pathname, router])

  const completeAuthDemo = useCallback(() => {
    if (!activeRef.current) return
    if (pathname !== "/") router.replace("/")
    beginPresentation()
  }, [beginPresentation, pathname, router])

  const stopDemo = useCallback(() => {
    activeRef.current = false
    waitingForMapRef.current = false
    demoPhaseRef.current = "tour"
    setDemoPhase("tour")
    setIsActive(false)
    setStep(null)
    setStepStartedAt(null)
    setStep6Phase("past")
  }, [])

  const loopToAuth = useCallback(() => {
    activeRef.current = true
    waitingForMapRef.current = false
    mapReadyRef.current = false
    demoPhaseRef.current = "auth"
    stepRouteNavigationRef.current = null
    setDemoPhase("auth")
    setStep(null)
    setStepStartedAt(null)
    setStep6Phase("past")
    if (pathname !== "/") router.replace("/")
  }, [pathname, router])

  const setHomeMapReady = useCallback((ready: boolean) => {
    if (demoPhaseRef.current !== "tour") {
      mapReadyRef.current = false
      return
    }
    mapReadyRef.current = ready
    if (ready && activeRef.current && waitingForMapRef.current) {
      waitingForMapRef.current = false
      setStep(1)
      setStepStartedAt(Date.now())
    }
  }, [])

  useEffect(() => {
    const destination = step === 5 ? "/stations" : step === 6 ? "/trips" : step === 7 ? "/account" : null
    if (!isActive || demoPhase !== "tour" || step === null || !destination) {
      stepRouteNavigationRef.current = null
      return
    }

    const navigation = stepRouteNavigationRef.current
    if (navigation?.step === step && navigation.path === destination) return

    stepRouteNavigationRef.current = { step, path: destination }
    if (pathname !== destination) router.replace(destination)
  }, [demoPhase, isActive, pathname, router, step])

  useEffect(() => {
    if (!isActive || demoPhase !== "tour" || step === null) return

    const timer = window.setTimeout(() => {
      if (step === 7) {
        loopToAuth()
        return
      }
      setStep((step + 1) as DemoStep)
      setStepStartedAt(Date.now())
    }, STEP_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [demoPhase, isActive, loopToAuth, step])

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
    demoPhase,
    isPreparing: isActive && demoPhase === "tour" && step === null,
    step,
    stepStartedAt,
    step6Phase,
    setStep6Phase,
    startDemo,
    completeAuthDemo,
    stopDemo,
    setHomeMapReady,
  }), [isActive, demoPhase, step, stepStartedAt, step6Phase, startDemo, completeAuthDemo, stopDemo, setHomeMapReady, setStep6Phase])

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider")
  }
  return context
}
