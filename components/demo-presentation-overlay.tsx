"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useDemoMode, type DemoStep } from "@/lib/demo-mode-context"

const STEP_COPY: Record<DemoStep, { ar: string; fr: string; bodyAr: string; bodyFr: string }> = {
  1: {
    ar: "إدارة مركزية",
    fr: "Gestion centralisée",
    bodyAr: "رؤية موحّدة لشبكة النقل الحضري من مركز تحكّم واحد.",
    bodyFr: "Une vue unifiée du réseau urbain, depuis un seul poste de contrôle.",
  },
  2: {
    ar: "تتبّع GPS مباشر",
    fr: "Suivi GPS",
    bodyAr: "متابعة حركة الحافلات ومسار خط 01 لحظة بلحظة.",
    bodyFr: "Suivez les bus et le parcours de la ligne 01 en temps réel.",
  },
  3: {
    ar: "تحسين المسارات",
    fr: "Optimisation des itinéraires",
    bodyAr: "اختر الخط لعرض المسار والمحطات ونقاط الانطلاق والوصول.",
    bodyFr: "Sélectionnez une ligne pour explorer son itinéraire et ses terminus.",
  },
  4: {
    ar: "الدفع الآمن",
    fr: "Paiement sécurisé",
    bodyAr: "دفع سريع عبر QR مع محفظة رقمية وشحن مبسّط.",
    bodyFr: "Paiement QR instantané, portefeuille numérique et recharge simplifiée.",
  },
}

function targetNames(step: DemoStep | null) {
  if (step === 1) return ["map-overview"]
  if (step === 2) return ["live-bus", "live-bus-fallback"]
  if (step === 3) return ["route-selector"]
  if (step === 4) return ["payment-qr", "payment-entry"]
  return []
}

function findTarget(step: DemoStep | null) {
  for (const name of targetNames(step)) {
    const target = document.querySelector<HTMLElement>(`[data-demo-target="${name}"]`)
    if (target) return target
  }
  return null
}

function connectorPath(card: DOMRect, target: DOMRect) {
  const targetX = target.left + target.width / 2
  const targetY = target.top + target.height / 2
  const centerX = card.left + card.width / 2
  const centerY = card.top + card.height / 2
  const dx = targetX - centerX
  const dy = targetY - centerY

  let startX: number
  let startY: number
  if (Math.abs(dx) * card.height > Math.abs(dy) * card.width) {
    startX = dx > 0 ? card.right : card.left
    startY = Math.max(card.top + 22, Math.min(card.bottom - 22, targetY))
  } else {
    startY = dy > 0 ? card.bottom : card.top
    startX = Math.max(card.left + 28, Math.min(card.right - 28, targetX))
  }

  const midX = (startX + targetX) / 2
  const midY = (startY + targetY) / 2
  const bend = Math.min(96, Math.max(30, Math.hypot(dx, dy) * 0.16))
  const side = dx >= 0 ? 1 : -1
  const wave = Math.max(-34, Math.min(34, dy * 0.12))

  return {
    d: `M ${startX} ${startY} C ${startX + side * bend} ${startY + wave}, ${midX - side * bend * 0.35} ${midY - wave}, ${midX} ${midY} S ${targetX - side * bend * 0.35} ${targetY + wave * 0.45}, ${targetX} ${targetY}`,
    x: targetX,
    y: targetY,
  }
}

export function DemoPresentationOverlay() {
  const { isActive, isPreparing, step, stepStartedAt, stopDemo } = useDemoMode()
  const pathRef = useRef<SVGPathElement>(null)
  const glowPathRef = useRef<SVGPathElement>(null)
  const targetHaloRef = useRef<SVGCircleElement>(null)
  const targetDotRef = useRef<SVGCircleElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isActive || !step || !stepStartedAt) {
      setProgress(0)
      return
    }

    const updateProgress = () => {
      const elapsed = Date.now() - stepStartedAt
      setProgress(Math.min(1, Math.max(0, elapsed / 5_000)))
    }

    updateProgress()
    const timer = window.setInterval(updateProgress, 120)
    return () => window.clearInterval(timer)
  }, [isActive, step, stepStartedAt])

  useEffect(() => {
    if (!isActive || !step) {
      pathRef.current?.setAttribute("opacity", "0")
      glowPathRef.current?.setAttribute("opacity", "0")
      targetHaloRef.current?.setAttribute("opacity", "0")
      targetDotRef.current?.setAttribute("opacity", "0")
      return
    }

    let frame = 0
    const drawConnector = () => {
      const card = document.getElementById("demo-callout-card")
      const target = findTarget(step)
      if (card && target) {
        const geometry = connectorPath(card.getBoundingClientRect(), target.getBoundingClientRect())
        pathRef.current?.setAttribute("d", geometry.d)
        glowPathRef.current?.setAttribute("d", geometry.d)
        targetHaloRef.current?.setAttribute("cx", String(geometry.x))
        targetHaloRef.current?.setAttribute("cy", String(geometry.y))
        targetDotRef.current?.setAttribute("cx", String(geometry.x))
        targetDotRef.current?.setAttribute("cy", String(geometry.y))
        pathRef.current?.setAttribute("opacity", "1")
        glowPathRef.current?.setAttribute("opacity", "1")
        targetHaloRef.current?.setAttribute("opacity", "1")
        targetDotRef.current?.setAttribute("opacity", "1")
      } else {
        pathRef.current?.setAttribute("opacity", "0")
        glowPathRef.current?.setAttribute("opacity", "0")
        targetHaloRef.current?.setAttribute("opacity", "0")
        targetDotRef.current?.setAttribute("opacity", "0")
      }
      frame = window.requestAnimationFrame(drawConnector)
    }

    frame = window.requestAnimationFrame(drawConnector)
    return () => window.cancelAnimationFrame(frame)
  }, [isActive, step, isPreparing])

  const copy = useMemo(() => (step ? STEP_COPY[step] : null), [step])
  const secondsLeft = Math.max(1, Math.ceil((1 - progress) * 5))

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="demo-presentation-overlay"
          className="demo-presentation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          aria-live="polite"
          aria-label="Cinematic demo presentation"
        >
          <svg className="demo-connector-svg" aria-hidden="true">
            <path ref={glowPathRef} className="demo-connector-glow" d="" opacity="0" />
            <path ref={pathRef} className="demo-connector-path" d="" opacity="0" />
            <circle ref={targetHaloRef} className="demo-connector-halo" cx="0" cy="0" r="15" opacity="0" />
            <circle ref={targetDotRef} className="demo-connector-dot" cx="0" cy="0" r="3.5" opacity="0" />
          </svg>

          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={step ?? "preparing"}
              id="demo-callout-card"
              className={`demo-callout-card${step === 3 ? " demo-callout-card--route" : ""}${step === 4 ? " demo-callout-card--payment" : ""}${isPreparing ? " demo-callout-card--preparing" : ""}`}
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              dir="rtl"
              aria-label={copy ? `${copy.ar} — ${copy.fr}` : "Préparation de la présentation"}
            >
              <div className="demo-card-topline">
                <span className="demo-card-eyebrow">
                  <span className="demo-live-orb" />
                  <span dir="ltr">TANAKOLI · PRÉSENTATION</span>
                </span>
                <button type="button" className="demo-exit-button" onClick={stopDemo} aria-label="إنهاء العرض التوضيحي — Exit demo">
                  <X aria-hidden="true" />
                  <span>خروج</span>
                  <span className="demo-exit-fr" dir="ltr">Exit</span>
                </button>
              </div>

              {copy ? (
                <>
                  <div className="demo-title-block">
                    <h2 className="demo-title-ar">{copy.ar}</h2>
                    <p className="demo-title-fr" dir="ltr" lang="fr">{copy.fr}</p>
                  </div>
                  <div className="demo-copy-block">
                    <p className="demo-copy-ar">{copy.bodyAr}</p>
                    <p className="demo-copy-fr" dir="ltr" lang="fr">{copy.bodyFr}</p>
                  </div>
                  <div className="demo-progress-meta" dir="ltr">
                    <span>ÉTAPE {String(step).padStart(2, "0")} <span className="demo-meta-divider">/</span> 04</span>
                    <span className="demo-countdown">00:0{secondsLeft}</span>
                  </div>
                  <div className="demo-progress-track" dir="ltr" aria-hidden="true">
                    <motion.div className="demo-progress-fill" style={{ scaleX: 1 - progress }} />
                  </div>
                </>
              ) : (
                <div className="demo-preparing-copy">
                  <h2 className="demo-title-ar">جارٍ تهيئة العرض</h2>
                  <p className="demo-title-fr" dir="ltr" lang="fr">Préparation de la présentation</p>
                  <p className="demo-copy-fr" dir="ltr" lang="fr">Connexion à la carte et synchronisation des données en cours…</p>
                  <div className="demo-preparing-indicator" aria-hidden="true"><span /><span /><span /></div>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
