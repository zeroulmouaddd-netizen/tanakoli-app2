"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
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
  5: {
    ar: "المحطات القريبة والنقل الحضري",
    fr: "Stations & Arrêts à Proximité",
    bodyAr: "تعرّف على المحطات القريبة وخيارات النقل الحضري لتخطط رحلتك بسهولة.",
    bodyFr: "Repérez les arrêts proches et les options de transport urbain pour organiser vos déplacements.",
  },
  6: {
    ar: "جدولة الرحلات والمواعيد",
    fr: "Planification et Horaires des Voyages",
    bodyAr: "ابحث عن مواعيد الخطوط وتابع أوقات الانطلاق والوصول لحظة بلحظة.",
    bodyFr: "Recherchez un itinéraire et consultez ses horaires en temps réel.",
  },
}

const QR_SPOTLIGHT_PADDING = 8
const QR_SPOTLIGHT_RADIUS = 26

function targetNames(step: DemoStep | null) {
  if (step === 1) return ["map-overview"]
  if (step === 2) return ["live-bus", "live-bus-fallback"]
  if (step === 3) return ["route-selector"]
  if (step === 4) return ["payment-qr"]
  if (step === 5) return ["first-route-card"]
  return []
}

function findTarget(step: DemoStep | null) {
  if (step === 3) {
    const selectorButton = document.querySelector<HTMLElement>('[data-demo-target="route-selector"]')
    return selectorButton?.closest<HTMLElement>(".route-controller-motion") ?? selectorButton
  }
  if (step === 6) {
    return document.querySelector<HTMLElement>("[data-demo-focus-target]")
      ?? document.querySelector<HTMLElement>('[data-demo-target="trip-search-card"]')
  }

  for (const name of targetNames(step)) {
    const target = document.querySelector<HTMLElement>(`[data-demo-target="${name}"]`)
    if (target) return target
  }
  return null
}

function connectorPath(card: DOMRect, target: DOMRect, step: DemoStep) {
  if (step === 3) {
    // Stay outside the opened route selector, then approach its upper-left edge
    // from above so the route details remain unobstructed.
    const startX = card.left + Math.min(28, card.width * 0.12)
    const startY = card.top
    const targetX = target.left + Math.min(24, target.width * 0.12)
    const targetY = target.top
    const laneX = target.left - 16
    const laneY = targetY + Math.max(0, startY - targetY) * 0.55
    const approachY = Math.max(0, targetY - 18)
    const rise = Math.max(0, laneY - approachY)
    const laneBend = Math.min(96, rise * 0.35)

    return {
      d: `M ${startX} ${startY} C ${startX} ${startY - 28}, ${laneX} ${laneY + 42}, ${laneX} ${laneY} C ${laneX} ${laneY - laneBend}, ${laneX} ${approachY + laneBend * 0.4}, ${laneX} ${approachY} C ${laneX} ${targetY - 6}, ${targetX} ${targetY - 6}, ${targetX} ${targetY}`,
      x: targetX,
      y: targetY,
    }
  }

  if (step === 4) {
    // Reach the QR spotlight's rounded top-right corner without crossing its interior.
    const cornerOffset = QR_SPOTLIGHT_RADIUS * (1 - 1 / Math.SQRT2)
    const targetX = target.right + QR_SPOTLIGHT_PADDING - cornerOffset
    const targetY = target.top - QR_SPOTLIGHT_PADDING + cornerOffset
    const targetIsBelowCallout = targetY >= card.bottom
    const startX = targetIsBelowCallout ? card.right - Math.min(28, card.width * 0.08) : card.right
    const startY = targetIsBelowCallout ? card.bottom : targetY
    const dx = targetX - startX
    const gap = Math.max(0, targetY - startY)
    const bendX = Math.min(54, Math.max(18, Math.abs(dx) * 0.35))
    const direction = dx >= 0 ? 1 : -1

    return {
      d: `M ${startX} ${startY} C ${startX + direction * bendX} ${startY + gap * 0.55}, ${targetX - direction * bendX} ${targetY - Math.min(18, gap * 0.2)}, ${targetX} ${targetY}`,
      x: targetX,
      y: targetY,
    }
  }

  if (step === 5) {
    // Join the first route card's upper-right edge from the banner.
    const targetX = target.right - Math.min(24, target.width * 0.08)
    const targetY = target.top
    const startX = Math.max(card.left + 24, Math.min(card.right - 24, targetX))
    const startY = targetY < card.top ? card.top : card.bottom
    const dx = targetX - startX
    const dy = targetY - startY
    const bend = Math.min(96, Math.max(24, Math.hypot(dx, dy) * 0.16))
    const mostlyHorizontal = Math.abs(dx) > Math.abs(dy)
    const directionX = dx >= 0 ? 1 : -1
    const directionY = dy >= 0 ? 1 : -1
    const control1X = startX + (mostlyHorizontal ? directionX * bend : dx * 0.18)
    const control1Y = startY + (mostlyHorizontal ? dy * 0.18 : directionY * bend)
    const control2X = targetX - (mostlyHorizontal ? directionX * bend : dx * 0.18)
    const control2Y = targetY - (mostlyHorizontal ? dy * 0.18 : directionY * bend)

    return {
      d: `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${targetX} ${targetY}`,
      x: targetX,
      y: targetY,
    }
  }

  if (step === 6) {
    // Follow Step 06's active target via the page gutter, then approach above its label.
    const targetX = target.left + Math.min(24, target.width * 0.08)
    const targetY = target.top
    const startX = card.left + Math.min(20, card.width * 0.08)
    const startY = targetY < card.top ? card.top : card.bottom
    const laneX = Math.max(22, card.left - 20)
    const exitY = startY + 28
    const approachY = Math.max(exitY, targetY - 30)
    const dx = targetX - laneX

    return {
      d: `M ${startX} ${startY} C ${startX} ${startY + 16}, ${laneX} ${startY + 16}, ${laneX} ${exitY} L ${laneX} ${approachY} C ${laneX + dx * 0.35} ${approachY}, ${targetX} ${approachY + 10}, ${targetX} ${targetY}`,
      x: targetX,
      y: targetY,
    }
  }

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
  const { isActive, isPreparing, step, stepStartedAt, step6Phase, stopDemo } = useDemoMode()
  const pathname = usePathname()
  const pathRef = useRef<SVGPathElement>(null)
  const glowPathRef = useRef<SVGPathElement>(null)
  const qrDimPathRef = useRef<SVGPathElement>(null)
  const qrFrameRef = useRef<SVGRectElement>(null)
  const targetHaloRef = useRef<SVGCircleElement>(null)
  const targetDotRef = useRef<SVGCircleElement>(null)
  const [secondsLeft, setSecondsLeft] = useState(5)
  const syncProgressFill = useCallback((element: HTMLDivElement | null) => {
    if (!element || stepStartedAt === null) return
    const elapsed = Math.min(5_000, Math.max(0, Date.now() - stepStartedAt))
    element.style.animationDelay = `-${elapsed}ms`
  }, [stepStartedAt])

  useEffect(() => {
    if (!isActive || !step || !stepStartedAt) {
      setSecondsLeft(5)
      return
    }

    const updateCountdown = () => {
      const remaining = Math.max(1, Math.ceil((5_000 - (Date.now() - stepStartedAt)) / 1_000))
      setSecondsLeft(remaining)
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1_000)
    return () => window.clearInterval(timer)
  }, [isActive, step, stepStartedAt])

  useEffect(() => {
    const hideConnector = () => {
      pathRef.current?.setAttribute("opacity", "0")
      glowPathRef.current?.setAttribute("opacity", "0")
      qrDimPathRef.current?.setAttribute("opacity", "0")
      qrFrameRef.current?.setAttribute("opacity", "0")
      targetHaloRef.current?.setAttribute("opacity", "0")
      targetDotRef.current?.setAttribute("opacity", "0")
    }

    if (!isActive || !step) {
      hideConnector()
      return
    }

    let frame = 0
    let refreshFrame = 0
    let sampleAt = 0
    let qrTargetSeenAt: number | null = null
    let routeTargetSeenAt: number | null = null
    let step6FollowUntil = 0
    let startStep6Follow = () => {}
    const entranceEndsAt = performance.now() + 380
    let observedTarget: Element | null = null

    const drawConnector = (): Element | null => {
      const card = document.getElementById("demo-callout-card")
      const target = findTarget(step)
      if (!card || !target) {
        hideConnector()
        observedTarget = null
        return null
      }

      const cardBounds = card.getBoundingClientRect()
      const targetBounds = target.getBoundingClientRect()
      const geometry = connectorPath(cardBounds, targetBounds, step)

      if (step === 4) {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth
        const viewportHeight = window.innerHeight
        const frameX = targetBounds.left - QR_SPOTLIGHT_PADDING
        const frameY = targetBounds.top - QR_SPOTLIGHT_PADDING
        const frameWidth = targetBounds.width + QR_SPOTLIGHT_PADDING * 2
        const frameHeight = targetBounds.height + QR_SPOTLIGHT_PADDING * 2

        qrDimPathRef.current?.setAttribute(
          "d",
          `M 0 0 H ${viewportWidth} V ${viewportHeight} H 0 Z M ${frameX} ${frameY} H ${frameX + frameWidth} V ${frameY + frameHeight} H ${frameX} Z`
        )
        qrFrameRef.current?.setAttribute("x", String(frameX))
        qrFrameRef.current?.setAttribute("y", String(frameY))
        qrFrameRef.current?.setAttribute("width", String(frameWidth))
        qrFrameRef.current?.setAttribute("height", String(frameHeight))
        qrFrameRef.current?.setAttribute("rx", String(QR_SPOTLIGHT_RADIUS))
        qrDimPathRef.current?.setAttribute("opacity", "1")
        qrFrameRef.current?.setAttribute("opacity", "1")
      } else {
        qrDimPathRef.current?.setAttribute("opacity", "0")
        qrFrameRef.current?.setAttribute("opacity", "0")
      }

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
      observedTarget = target
      return target
    }

    const scheduleRefresh = () => {
      if (refreshFrame) return
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = 0
        drawConnector()
      })
    }

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleRefresh)
    const observeElements = () => {
      const card = document.getElementById("demo-callout-card")
      const target = findTarget(step)
      if (card) observer?.observe(card)
      if (target && target !== observedTarget) {
        if (observedTarget) observer?.unobserve(observedTarget)
        observer?.observe(target)
        observedTarget = target
      }
    }
    const mutationObserver = new MutationObserver((mutations) => {
      const previousTarget = observedTarget
      observeElements()
      const focusTargetChanged = mutations.some(
        (mutation) => mutation.type === "attributes" && mutation.attributeName === "data-demo-focus-target",
      )
      const targetChanged = findTarget(step) !== previousTarget

      if (step === 6 && (focusTargetChanged || targetChanged)) {
        startStep6Follow()
      } else {
        scheduleRefresh()
      }
    })
    observeElements()
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-demo-focus-target"],
    })
    window.addEventListener("resize", scheduleRefresh)
    window.addEventListener("scroll", scheduleRefresh, true)

    const animateConnector = (now: number) => {
      if (step === 2) {
        // Bus markers move continuously; sample at 30 FPS instead of forcing
        // layout reads and SVG writes on every display refresh.
        if (now - sampleAt >= 33) {
          drawConnector()
          sampleAt = now
        }
        frame = window.requestAnimationFrame(animateConnector)
        return
      }

      if (step === 4) {
        // The QR modal opens after the step begins. Follow its entrance motion
        // briefly, then rely on resize/scroll observers for the static target.
        if (now - sampleAt >= 33) {
          const target = drawConnector()
          sampleAt = now
          if (target) {
            if (qrTargetSeenAt === null) qrTargetSeenAt = now
          } else {
            qrTargetSeenAt = null
          }
        }
        if (qrTargetSeenAt === null || now - qrTargetSeenAt < 380) {
          frame = window.requestAnimationFrame(animateConnector)
        } else {
          drawConnector()
          frame = 0
        }
        return
      }

      if (step === 6) {
        // Re-sample the transformed departure pill every display frame while it zooms.
        drawConnector()
        if (now < step6FollowUntil) {
          frame = window.requestAnimationFrame(animateConnector)
        } else {
          frame = 0
        }
        return
      }

      if (step === 5) {
        // Follow Step 05's cross-route target through its entrance and scroll transition.
        if (now - sampleAt >= 33) {
          const target = drawConnector()
          sampleAt = now
          if (target) {
            if (routeTargetSeenAt === null) routeTargetSeenAt = now
          } else {
            routeTargetSeenAt = null
          }
        }
        if (routeTargetSeenAt === null || now - routeTargetSeenAt < 650) {
          frame = window.requestAnimationFrame(animateConnector)
        } else {
          drawConnector()
          frame = 0
        }
        return
      }

      // Follow the banner's entrance transform, then let resize/scroll/mutation
      // observers request one-off updates for the remaining static steps.
      if (now <= entranceEndsAt) {
        drawConnector()
        frame = window.requestAnimationFrame(animateConnector)
      } else {
        drawConnector()
        frame = 0
      }
    }

    startStep6Follow = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        scheduleRefresh()
        return
      }
      step6FollowUntil = performance.now() + 900
      if (frame === 0) frame = window.requestAnimationFrame(animateConnector)
    }

    frame = window.requestAnimationFrame(animateConnector)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (refreshFrame) window.cancelAnimationFrame(refreshFrame)
      observer?.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener("resize", scheduleRefresh)
      window.removeEventListener("scroll", scheduleRefresh, true)
    }
  }, [isActive, step, isPreparing])

  useEffect(() => {
    const destination = step === 5 ? "/stations" : step === 6 ? "/trips" : null
    const targetName = step === 5 ? "first-route-card" : step === 6 ? "trip-search-card" : null
    if (!isActive || !destination || !targetName || pathname !== destination) return

    let didScroll = false
    let scrollFrame = 0
    const scrollToDemoTarget = () => {
      if (didScroll) return
      const target = document.querySelector<HTMLElement>(`[data-demo-target="${targetName}"]`)
      if (!target) return

      didScroll = true
      scrollFrame = window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "nearest" })
      })
    }

    const observer = new MutationObserver(scrollToDemoTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    scrollToDemoTarget()

    return () => {
      observer.disconnect()
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
    }
  }, [isActive, pathname, step])

  const copy = useMemo(() => {
    if (!step) return null
    if (step !== 6) return STEP_COPY[step]

    return {
      ...STEP_COPY[6],
      ar: step6Phase === "past" ? "تتبع الحافلات والمواعيد المنقضية" : "المواعيد القادمة بدقة",
      fr: step6Phase === "past"
        ? "Suivi en Temps Réel & Horaires Passés"
        : "Prochains Départs Optimisés",
    }
  }, [step, step6Phase])

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
            <path ref={qrDimPathRef} className="demo-qr-spotlight-dim" d="" opacity="0" />
            <rect ref={qrFrameRef} className="demo-qr-spotlight-frame" x="0" y="0" width="0" height="0" rx="26" opacity="0" />
            <path ref={glowPathRef} className="demo-connector-glow" d="" opacity="0" />
            <path ref={pathRef} className="demo-connector-path" d="" opacity="0" />
            <circle ref={targetHaloRef} className="demo-connector-halo" cx="0" cy="0" r="15" opacity="0" />
            <circle ref={targetDotRef} className="demo-connector-dot" cx="0" cy="0" r="3.5" opacity="0" />
          </svg>

          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={step ?? "preparing"}
              id="demo-callout-card"
              className={`demo-callout-card${step === 3 ? " demo-callout-card--route" : ""}${step === 4 ? " demo-callout-card--payment" : ""}${step === 5 ? " demo-callout-card--stations" : ""}${step === 6 ? " demo-callout-card--trips" : ""}${isPreparing ? " demo-callout-card--preparing" : ""}`}
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              transformTemplate={({ y = 0, scale = 1 }) => `translate3d(0, ${y}px, 0) scale(${scale})`}
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
                    <span>ÉTAPE {String(step).padStart(2, "0")} <span className="demo-meta-divider">/</span> 06</span>
                    <span className="demo-countdown">00:0{secondsLeft}</span>
                  </div>
                  <div className="demo-progress-track" dir="ltr" aria-hidden="true">
                    <div key={step} ref={syncProgressFill} className="demo-progress-fill" />
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
