"use client"

/**
 * Tanakoli Khenchela — Cinematic Demo Mode
 *
 * An isolated, high-end automated guided tour for executive/demo presentations.
 *
 * Features:
 *  - "Demo Presentation" toggle button (Play icon, neon glow border)
 *  - 3-step cinematic flow driven by Framer Motion (60fps, transform/opacity only):
 *      Step 1 — Fullscreen map expansion + camera sweep ("Gestion Centralisée")
 *      Step 2 — Pan to live bus markers, highlight Line 01 ("Suivi GPS en Temps Réel")
 *      Step 3 — Auto-open line selector & route details ("Optimisation des Lignes de Transport")
 *  - Glassmorphism floating banners with bilingual Arabic/French labels
 *  - Exit Demo button + Esc to instantly hand back manual control
 *  - Zero impact on live app state, Firebase listeners, or API calls
 *
 * Consumed by:
 *  - AppHeader (toggle button)
 *  - MapSection / MaplibreMap (controlled fullscreen, route highlight, line selector)
 *  - app/page.tsx (DemoProvider + portal overlays)
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Bus, Maximize2, Play, Route, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ───────────────────── step catalogue (bilingual AR/FR) ───────────────────── */

export interface DemoStepConfig {
  anchor: "top-left" | "top-center" | "top-right" | "center"
  icon: React.ElementType
  titleAr: string
  titleFr: string
  descAr: string
  descFr: string
}

export const DEMO_STEPS: DemoStepConfig[] = [
  {
    anchor: "top-left",
    icon: Maximize2,
    titleAr: "التحكم المركزي",
    titleFr: "Gestion Centralisée",
    descAr: "توسيع الخريطة إلى ملء الشاشة مع تأثير كاميرا سينمائي سلس",
    descFr: "Déploiement de la carte en plein écran — caméra cinématique",
  },
  {
    anchor: "center",
    icon: Bus,
    titleAr: "تتبع GPS اللحظي",
    titleFr: "Suivi GPS en Temps Réel",
    descAr: "التنقل تلقائياً إلى ماركيرات الحافلات المباشرة مع تسليط الضوء على خط 01",
    descFr: "Vol vers les bus en temps réel — surlignage Ligne 01",
  },
  {
    anchor: "top-right",
    icon: Route,
    titleAr: "تحسين خطوط النقل",
    titleFr: "Optimisation des Lignes de Transport",
    descAr: "فتح محدد الخطوط تلقائياً وعرض تفاصيل المسار والخطوط النشطة",
    descFr: "Ouverture du sélecteur de ligne — détails de l'itinéraire",
  },
]

/* ───────────────────────── demo context & provider ───────────────────────── */

interface DemoContextValue {
  isActive: boolean
  step: number
  startDemo: () => void
  exitDemo: () => void
  /** Map expansion controlled by the demo (step 1) */
  isFullscreen: boolean
  /** Route id to focus on the map (step 2 — e.g. "line-01") */
  selectedRoute: string | null
  /** Force the route line selector open (step 3) */
  lineSelectorOpen: boolean
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) {
    throw new Error("useDemo must be used within a DemoProvider")
  }
  return ctx
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [step, setStep] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [lineSelectorOpen, setLineSelectorOpen] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }, [])

  const startDemo = useCallback(() => {
    clearTimers()
    setIsActive(true)
    setStep(0)
    setIsFullscreen(false)
    setSelectedRoute(null)
    setLineSelectorOpen(false)

    // Step 1: fullscreen map expansion + camera sweep
    setStep(1)
    setIsFullscreen(true)

    // Step 2: fly to live bus markers & highlight Line 01
    const t1 = setTimeout(() => {
      setStep(2)
      setSelectedRoute("line-01")
    }, 1500)

    // Step 3: auto-open line selector & route details
    const t2 = setTimeout(() => {
      setStep(3)
      setLineSelectorOpen(true)
    }, 4000)

    timers.current = [t1, t2]
  }, [clearTimers])

  const exitDemo = useCallback(() => {
    clearTimers()
    setIsActive(false)
    setStep(0)
    setIsFullscreen(false)
    setSelectedRoute(null)
    setLineSelectorOpen(false)
  }, [clearTimers])

  const value = useMemo(
    () => ({
      isActive,
      step,
      startDemo,
      exitDemo,
      isFullscreen,
      selectedRoute,
      lineSelectorOpen,
    }),
    [isActive, step, startDemo, exitDemo, isFullscreen, selectedRoute, lineSelectorOpen]
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

/* ───────────────────────── helpers ───────────────────────── */

function anchorPosition(anchor: DemoStepConfig["anchor"]) {
  switch (anchor) {
    case "top-left":
      return "top-4 left-4"
    case "top-center":
      return "top-4 left-[50%] -translate-x-[50%]"
    case "top-right":
      return "top-4 right-4 sm:right-6"
    case "center":
      return "top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]"
  }
}

/* ───────────────────── toggle button (header) ───────────────────── */

export function DemoToggleButton() {
  const { isActive, startDemo, exitDemo } = useDemo()
  const handleClick = () => (isActive ? exitDemo() : startDemo())

  return (
    <motion.div
      className="flex h-10 w-10 items-center justify-center rounded-full"
      animate={{
        boxShadow: ["0 0 0 0 rgba(16,185,129,0.50)", "0 0 0 18px rgba(16,185,129,0)"],
      }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      style={{ pointerEvents: "none" }}
    >
      <Button
        onClick={handleClick}
        variant="outline"
        className={cn(
          "relative z-10 h-10 w-10 rounded-full border border-emerald-400/70 bg-black/50 backdrop-blur-md text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]",
          "hover:border-emerald-400 hover:text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-all",
          isActive
            ? "bg-emerald-500 border-emerald-200 text-white shadow-[0_0_22px_rgba(16,185,129,0.75)]"
            : ""
        )}
        aria-label={
          isActive
            ? "إنهاء العرض التقديم السينمائي"
            : "بدء العرض التقديم السينمائي — Demo Presentation"
        }
      >
        <Play className="h-5 w-5" />
        <span className="ml-2 text-xs font-bold tracking-tighter">عرض توضيحي</span>
      </Button>
    </motion.div>
  )
}

/* ───────────────────── floating glass banners ───────────────────── */

export function DemoBanners() {
  const { isActive, step } = useDemo()
  if (!isActive || step === 0 || step > DEMO_STEPS.length) return null

  const cfg = DEMO_STEPS[step - 1]
  const Icon = cfg.icon

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`demo-banner-${step}`}
        initial={{ opacity: 0, y: 16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.94 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed z-[10001] pointer-events-auto gpu-accelerated",
          anchorPosition(cfg.anchor)
        )}
      >
        <div className="flex flex-col gap-2 w-80 sm:w-96 rounded-2xl border border-emerald-400/50 bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.25)] p-4 sm:p-6">
          {/* Top accent glow */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-transparent to-emerald-400 rounded-t-[20px] opacity-90" />

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] sm:text-xs tracking-widest uppercase font-bold text-emerald-400/80">
              STEP {step}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white leading-tight">{cfg.titleAr}</h3>
          <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">{cfg.titleFr}</p>
          <p className="mt-1 text-[10px] sm:text-xs text-emerald-500/70 font-medium leading-relaxed">
            {cfg.descAr}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

/* ───────────────────── exit demo control ───────────────────── */

export function DemoExitButton() {
  const { exitDemo } = useDemo()

  return createPortal(
    <motion.button
      onClick={exitDemo}
      className={cn(
        "fixed z-[10002] bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full",
        "border border-emerald-400/60 bg-black/60 backdrop-blur-md text-emerald-300",
        "shadow-[0_0_30px_rgba(16,185,129,0.40)]",
        "hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_40px_rgba(16,185,129,0.60)]",
        "transition-all press-effect"
      )}
      aria-label="إنهاء العرض التوضيحي — Esc"
      title="إنهاء العرض التوضيحي (Esc)"
    >
      <X className="h-5 w-5" />
      <span className="absolute -right-7 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        إنهاء العرض
      </span>
    </motion.button>,
    document.body
  )
}

/* ───────────────────── camera sweep + esc handling ───────────────────── */

export function DemoOverlays() {
  const { isActive, step, exitDemo } = useDemo()

  // Esc instantly hands control back to the user
  useEffect(() => {
    if (!isActive) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitDemo()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isActive, exitDemo])

  if (!isActive) return null

  // Portal to document.body so the overlays are never clipped by the
  // fullscreen map's overflow-hidden layout ancestors.
  return createPortal(
    <>
      {/* Step 1 camera sweep — GPU accelerated transform/opacity only */}
      {step === 1 && (
        <motion.div
          key="sweep-glow"
          className="fixed inset-0 z-[10000] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0] }}
          transition={{ duration: 0.8 }}
        />
      )}
      {step === 1 && (
        <motion.div
          className="fixed z-[10000] pointer-events-none"
          style={{ left: "50%", top: "42%" }}
          animate={{ scale: [0, 1.45], opacity: [0.85, 0] }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full"
            style={{
              border: "2px solid rgba(16,185,129,0.55)",
              background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
            }}
          />
        </motion.div>
      )}

      <DemoBanners />
      <DemoExitButton />
    </>,
    document.body
  )
}
