"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface IntroOnboardingProps {
  onDone: () => void
}

const slides = [
  {
    id: 0,
    title: "مرحباً بك في تنقلي خنشلة",
    subtitle: "رفيقك الذكي للنقل الحضري",
    illustration: <BusIllustration />,
  },
  {
    id: 1,
    title: "تتبع خطوطك بسهولة",
    subtitle: "اعرف مواعيد الحافلات وأقرب المحطات إليك",
    illustration: <MapIllustration />,
  },
  {
    id: 2,
    title: "ادفع بأمان وسرعة",
    subtitle: "ادفع أجرتك إلكترونياً دون نقود",
    illustration: <WalletIllustration />,
  },
]

export function IntroOnboarding({ onDone }: IntroOnboardingProps) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const dragStartX = useRef<number | null>(null)

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1)
      setCurrent(index)
    },
    [current]
  )

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      goTo(current + 1)
    } else {
      onDone()
    }
  }, [current, goTo, onDone])

  const skip = useCallback(() => {
    onDone()
  }, [onDone])

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = "touches" in e ? e.touches[0].clientX : e.clientX
    dragStartX.current = x
  }

  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX.current === null) return
    const x = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX
    const diff = dragStartX.current - x
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < slides.length - 1) goTo(current + 1)
      else if (diff < 0 && current > 0) goTo(current - 1)
    }
    dragStartX.current = null
  }

  const isLast = current === slides.length - 1

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none"
      style={{ background: "linear-gradient(160deg, #060D1F 0%, #0A1628 40%, #071220 100%)" }}
      onTouchStart={handleDragStart}
      onTouchEnd={handleDragEnd}
      onMouseDown={handleDragStart}
      onMouseUp={handleDragEnd}
    >
      {/* Animated background grid */}
      <BackgroundGrid />

      {/* Skip button */}
      {!isLast && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={skip}
          className="absolute top-14 left-5 z-20 px-4 py-1.5 rounded-full text-sm font-medium text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 transition-all duration-200"
        >
          تخطي
        </motion.button>
      )}

      {/* Slide content */}
      <div className="absolute inset-0 flex flex-col items-center justify-between px-6 pt-20 pb-10">

        {/* Illustration area */}
        <div className="flex-1 flex items-center justify-center w-full max-w-xs">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex items-center justify-center"
            >
              {slides[current].illustration}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${current}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-center mb-8 px-4"
          >
            <h1 className="text-2xl font-bold text-white leading-snug mb-3">
              {slides[current].title}
            </h1>
            <p className="text-base text-white/55 leading-relaxed">
              {slides[current].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex items-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}>
              <motion.div
                animate={{
                  width: i === current ? 28 : 8,
                  opacity: i === current ? 1 : 0.35,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-2 rounded-full"
                style={{
                  background:
                    i === current
                      ? "linear-gradient(90deg, #22C55E, #14B8A6)"
                      : "#fff",
                }}
              />
            </button>
          ))}
        </div>

        {/* Action button */}
        <motion.button
          onClick={next}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm rounded-2xl py-4 font-bold text-white text-lg shadow-lg relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)",
            boxShadow: "0 8px 32px rgba(34,197,94,0.35)",
          }}
        >
          <motion.span
            key={isLast ? "start" : "next"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {isLast ? "ابدأ الآن" : "التالي"}
          </motion.span>

          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </motion.button>
      </div>
    </div>
  )
}

/* ─── Slide transition variants ─── */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.3, ease: "easeIn" },
  }),
}

/* ─── Background ─── */
function BackgroundGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ob-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.04" />
        </linearGradient>
        <style>{`
          @keyframes ob-glow {
            0%,100% { stroke-opacity: 0.18; }
            50% { stroke-opacity: 0.45; }
          }
          @keyframes ob-float {
            0%,100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          .ob-r1 { animation: ob-glow 4s ease-in-out infinite; }
          .ob-r2 { animation: ob-glow 4s ease-in-out 1.3s infinite; }
          .ob-r3 { animation: ob-glow 4s ease-in-out 2.6s infinite; }
        `}</style>
      </defs>

      {[0, 65, 130, 195, 260, 325, 390].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="844" stroke="#10B981" strokeWidth="0.8" opacity="0.12" />
      ))}
      {[0, 105, 210, 315, 420, 525, 630, 735, 844].map((y) => (
        <line key={y} x1="0" y1={y} x2="390" y2={y} stroke="#3B82F6" strokeWidth="0.8" opacity="0.1" />
      ))}

      <path d="M 20 80 Q 90 160 180 220 T 370 400" className="ob-r1" stroke="#22C55E" strokeWidth="1.5" fill="none" />
      <path d="M 60 30 L 160 130 Q 220 190 290 280" className="ob-r2" stroke="#14B8A6" strokeWidth="1.2" fill="none" strokeDasharray="14 6" />
      <path d="M 250 60 Q 310 140 340 250 L 380 380" className="ob-r3" stroke="#22C55E" strokeWidth="1.5" fill="none" />

      <rect x="0" y="0" width="390" height="844" fill="url(#ob-grad)" />
    </svg>
  )
}

/* ─── Slide 1: Bus illustration ─── */
function BusIllustration() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-[280px]" style={{ filter: "drop-shadow(0 20px 60px rgba(34,197,94,0.2))" }}>
      <defs>
        <linearGradient id="bus-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="100%" stopColor="#0F2744" />
        </linearGradient>
        <linearGradient id="bus-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
        <linearGradient id="bus-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a2744" stopOpacity="0" />
          <stop offset="30%" stopColor="#1a2744" stopOpacity="1" />
          <stop offset="70%" stopColor="#1a2744" stopOpacity="1" />
          <stop offset="100%" stopColor="#1a2744" stopOpacity="0" />
        </linearGradient>
        <style>{`
          @keyframes bus-drive {
            0%,100% { transform: translateY(0px); }
            25% { transform: translateY(-3px); }
            75% { transform: translateY(2px); }
          }
          @keyframes wheel-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes window-glow {
            0%,100% { fill-opacity: 0.55; }
            50% { fill-opacity: 0.85; }
          }
          @keyframes road-dash {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -40; }
          }
          @keyframes signal-pulse {
            0%,100% { opacity: 0.3; r: 4; }
            50% { opacity: 1; r: 6; }
          }
          .bus-body { animation: bus-drive 2.4s ease-in-out infinite; }
          .bus-win { animation: window-glow 2s ease-in-out infinite; }
          .bus-win-2 { animation: window-glow 2s ease-in-out 0.5s infinite; }
          .bus-win-3 { animation: window-glow 2s ease-in-out 1s infinite; }
          .road-line { animation: road-dash 0.6s linear infinite; }
          .signal { animation: signal-pulse 1.5s ease-in-out infinite; }
        `}</style>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Road */}
      <rect x="10" y="168" width="260" height="30" rx="4" fill="url(#road)" />
      <line x1="10" y1="183" x2="270" y2="183" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="20 12" className="road-line" opacity="0.25" />

      {/* Bus group with floating animation */}
      <g className="bus-body">
        {/* Shadow */}
        <ellipse cx="140" cy="174" rx="70" ry="6" fill="#000" opacity="0.25" />

        {/* Body */}
        <rect x="55" y="95" width="170" height="72" rx="10" fill="url(#bus-body)" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Roof stripe */}
        <rect x="55" y="95" width="170" height="16" rx="10" fill="url(#bus-roof)" />
        <rect x="55" y="103" width="170" height="8" fill="url(#bus-roof)" />

        {/* Windows */}
        <rect x="68" y="120" width="32" height="22" rx="5" fill="url(#bus-window)" className="bus-win" />
        <rect x="112" y="120" width="32" height="22" rx="5" fill="url(#bus-window)" className="bus-win-2" />
        <rect x="156" y="120" width="32" height="22" rx="5" fill="url(#bus-window)" className="bus-win-3" />

        {/* Door */}
        <rect x="196" y="118" width="22" height="30" rx="3" fill="#0F172A" stroke="#22C55E" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="207" y1="118" x2="207" y2="148" stroke="#22C55E" strokeWidth="1" opacity="0.4" />

        {/* Headlights */}
        <rect x="220" y="120" width="5" height="14" rx="2" fill="#FCD34D" opacity="0.9" />
        <ellipse cx="222" cy="127" rx="8" ry="6" fill="#FCD34D" opacity="0.15" filter="url(#glow)" />
        <rect x="56" y="120" width="5" height="14" rx="2" fill="#F87171" opacity="0.8" />

        {/* Number plate */}
        <rect x="85" y="150" width="50" height="14" rx="3" fill="#1E3A5F" stroke="#22C55E" strokeWidth="1" strokeOpacity="0.6" />
        <text x="110" y="161" textAnchor="middle" fontSize="7" fill="#22C55E" fontFamily="monospace" opacity="0.9">خنشلة ٠١</text>

        {/* Wheels */}
        <g style={{ transformOrigin: "88px 168px" }}>
          <circle cx="88" cy="168" r="14" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
          <circle cx="88" cy="168" r="8" fill="#1E293B" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="88" cy="168" r="2.5" fill="#22C55E" opacity="0.8" />
        </g>
        <g style={{ transformOrigin: "188px 168px" }}>
          <circle cx="188" cy="168" r="14" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
          <circle cx="188" cy="168" r="8" fill="#1E293B" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="188" cy="168" r="2.5" fill="#22C55E" opacity="0.8" />
        </g>

        {/* Route sign on roof */}
        <rect x="95" y="84" width="90" height="16" rx="4" fill="#0F172A" stroke="#22C55E" strokeWidth="1" strokeOpacity="0.7" />
        <text x="140" y="96" textAnchor="middle" fontSize="8" fill="#22C55E" fontFamily="sans-serif">خط ٣ - وسط المدينة</text>
      </g>

      {/* Signal dots above bus */}
      <circle cx="200" cy="58" r="4" fill="#22C55E" className="signal" />
      <circle cx="216" cy="52" r="4" fill="#22C55E" className="signal" style={{ animationDelay: "0.3s" }} />
      <circle cx="232" cy="46" r="4" fill="#22C55E" className="signal" style={{ animationDelay: "0.6s" }} />

      {/* Small buildings silhouette */}
      <rect x="10" y="110" width="20" height="58" rx="2" fill="#0d1f38" opacity="0.7" />
      <rect x="14" y="102" width="12" height="8" rx="1" fill="#0d1f38" opacity="0.7" />
      <rect x="245" y="120" width="25" height="48" rx="2" fill="#0d1f38" opacity="0.7" />
      <rect x="249" y="112" width="17" height="8" rx="1" fill="#0d1f38" opacity="0.7" />
    </svg>
  )
}

/* ─── Slide 2: Map / location illustration ─── */
function MapIllustration() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-[280px]" style={{ filter: "drop-shadow(0 20px 60px rgba(56,189,248,0.2))" }}>
      <defs>
        <linearGradient id="map-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0F2744" />
          <stop offset="100%" stopColor="#0A1628" />
        </linearGradient>
        <linearGradient id="pin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <style>{`
          @keyframes pin-bounce {
            0%,100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-6px); }
          }
          @keyframes ripple-out {
            0% { r: 10; opacity: 0.7; }
            100% { r: 40; opacity: 0; }
          }
          @keyframes route-draw {
            from { stroke-dashoffset: 300; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes dot-pulse {
            0%,100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.4); }
          }
          .pin { animation: pin-bounce 2s ease-in-out infinite; transform-origin: 140px 115px; }
          .ripple1 { animation: ripple-out 2s ease-out infinite; }
          .ripple2 { animation: ripple-out 2s ease-out 0.7s infinite; }
          .map-route { stroke-dasharray: 300; animation: route-draw 2.5s ease-out forwards; }
          .stop-dot { animation: dot-pulse 2s ease-in-out infinite; }
          .stop-dot-2 { animation: dot-pulse 2s ease-in-out 0.5s infinite; }
          .stop-dot-3 { animation: dot-pulse 2s ease-in-out 1s infinite; }
        `}</style>
      </defs>

      {/* Map base card */}
      <rect x="20" y="20" width="240" height="180" rx="20" fill="url(#map-bg)" stroke="#1E3A5F" strokeWidth="1.5" />

      {/* Map grid lines */}
      {[60, 100, 140, 180].map((y) => (
        <line key={y} x1="20" y1={y} x2="260" y2={y} stroke="#1E3A5F" strokeWidth="1" />
      ))}
      {[60, 100, 140, 180, 220].map((x) => (
        <line key={x} x1={x} y1="20" x2={x} y2="200" stroke="#1E3A5F" strokeWidth="1" />
      ))}

      {/* Streets */}
      <line x1="20" y1="110" x2="260" y2="110" stroke="#1a3060" strokeWidth="8" />
      <line x1="140" y1="20" x2="140" y2="200" stroke="#1a3060" strokeWidth="8" />
      <line x1="20" y1="150" x2="200" y2="150" stroke="#1a3060" strokeWidth="5" />
      <line x1="90" y1="20" x2="90" y2="200" stroke="#1a3060" strokeWidth="5" />

      {/* Route path */}
      <path
        d="M 55 170 Q 55 110 90 110 L 140 110 Q 190 110 190 75"
        stroke="#22C55E"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className="map-route"
        opacity="0.9"
      />

      {/* Bus stop dots along route */}
      <circle cx="55" cy="170" r="6" fill="#14B8A6" className="stop-dot" />
      <circle cx="90" cy="110" r="6" fill="#14B8A6" className="stop-dot-2" />
      <circle cx="140" cy="110" r="6" fill="#14B8A6" className="stop-dot-3" />

      {/* Ripples under pin */}
      <circle cx="190" cy="75" r="10" fill="none" stroke="#22C55E" strokeWidth="2" className="ripple1" />
      <circle cx="190" cy="75" r="10" fill="none" stroke="#22C55E" strokeWidth="1.5" className="ripple2" />

      {/* Location pin */}
      <g className="pin">
        <path
          d="M 190 40 C 178 40 168 50 168 62 C 168 78 190 98 190 98 C 190 98 212 78 212 62 C 212 50 202 40 190 40 Z"
          fill="url(#pin-grad)"
          filter="drop-shadow(0 4px 12px rgba(34,197,94,0.5))"
        />
        <circle cx="190" cy="62" r="9" fill="#fff" opacity="0.9" />
        <circle cx="190" cy="62" r="5" fill="#22C55E" />
      </g>

      {/* Bus icon on route */}
      <rect x="103" y="102" width="24" height="16" rx="4" fill="#22C55E" />
      <rect x="107" y="105" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.8)" />
      <rect x="116" y="105" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.8)" />
      <circle cx="108" cy="119" r="3" fill="#0F172A" stroke="#22C55E" strokeWidth="1" />
      <circle cx="122" cy="119" r="3" fill="#0F172A" stroke="#22C55E" strokeWidth="1" />

      {/* Labels */}
      <rect x="28" y="158" width="48" height="16" rx="4" fill="#0d1f38" stroke="#14B8A6" strokeWidth="1" />
      <text x="52" y="170" textAnchor="middle" fontSize="7" fill="#14B8A6" fontFamily="sans-serif">المحطة الرئيسية</text>

      <rect x="148" y="62" width="46" height="16" rx="4" fill="#0d1f38" stroke="#22C55E" strokeWidth="1" />
      <text x="171" y="74" textAnchor="middle" fontSize="7" fill="#22C55E" fontFamily="sans-serif">موقعك الآن</text>
    </svg>
  )
}

/* ─── Slide 3: Wallet / payment illustration ─── */
function WalletIllustration() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-[280px]" style={{ filter: "drop-shadow(0 20px 60px rgba(20,184,166,0.2))" }}>
      <defs>
        <linearGradient id="wallet-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E3A5F" />
          <stop offset="100%" stopColor="#0F2744" />
        </linearGradient>
        <linearGradient id="card-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="card2-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <style>{`
          @keyframes wallet-float {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes card-slide {
            0%,100% { transform: translateY(0) rotate(-6deg); }
            50% { transform: translateY(-6px) rotate(-6deg); }
          }
          @keyframes coin-rise {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-30px); opacity: 0; }
          }
          @keyframes check-draw {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes shield-pulse {
            0%,100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
          @keyframes amount-tick {
            0%,90%,100% { opacity: 1; }
            95% { opacity: 0; }
          }
          .wallet-main { animation: wallet-float 3s ease-in-out infinite; }
          .card-back { animation: card-slide 3s ease-in-out 0.3s infinite; }
          .check { stroke-dasharray: 40; animation: check-draw 0.8s ease-out 1s forwards; }
          .shield-glow { animation: shield-pulse 2s ease-in-out infinite; }
          .coin1 { animation: coin-rise 2s ease-out 0.5s infinite; }
          .coin2 { animation: coin-rise 2s ease-out 1.1s infinite; }
          .coin3 { animation: coin-rise 2s ease-out 1.7s infinite; }
          .amount { animation: amount-tick 3s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Card peeking behind */}
      <g className="card-back">
        <rect x="60" y="82" width="160" height="100" rx="14" fill="url(#card2-grad)" opacity="0.8" transform="rotate(-6, 140, 132)" />
        <rect x="60" y="82" width="160" height="20" rx="14 14 0 0" fill="rgba(255,255,255,0.12)" transform="rotate(-6, 140, 132)" />
      </g>

      {/* Main wallet group */}
      <g className="wallet-main">
        {/* Wallet body */}
        <rect x="55" y="88" width="170" height="110" rx="16" fill="url(#wallet-body)" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Card inside */}
        <rect x="68" y="100" width="144" height="88" rx="12" fill="url(#card-grad)" />
        <rect x="68" y="100" width="144" height="30" rx="12 12 0 0" fill="rgba(255,255,255,0.15)" />

        {/* Chip */}
        <rect x="82" y="110" width="28" height="20" rx="4" fill="rgba(255,255,255,0.3)" />
        <line x1="82" y1="120" x2="110" y2="120" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="96" y1="110" x2="96" y2="130" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

        {/* Balance */}
        <text x="140" y="145" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)" fontFamily="sans-serif">الرصيد المتاح</text>
        <text x="140" y="168" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#fff" fontFamily="monospace" className="amount">١٥٠٠ دج</text>

        {/* NFC icon */}
        <path d="M 178 108 Q 184 114 184 120 Q 184 126 178 132" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 183 105 Q 192 113 192 120 Q 192 127 183 135" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Wallet flap */}
        <rect x="55" y="88" width="170" height="22" rx="16 16 0 0" fill="#1E3A5F" />
        <circle cx="175" cy="99" r="8" fill="#0F172A" stroke="#22C55E" strokeWidth="1.5" />
        <circle cx="175" cy="99" r="4" fill="#22C55E" opacity="0.8" />

        {/* Lock icon on flap */}
        <path d="M 78 96 Q 78 90 87 90 Q 96 90 96 96 L 96 100 L 78 100 Z" fill="rgba(255,255,255,0.1)" />
        <rect x="76" y="99" width="22" height="16" rx="3" fill="rgba(255,255,255,0.15)" />
        <circle cx="87" cy="107" r="3" fill="rgba(255,255,255,0.5)" />
        <line x1="87" y1="107" x2="87" y2="112" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      </g>

      {/* Coins floating up */}
      <g className="coin1">
        <circle cx="105" cy="80" r="10" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1.5" opacity="0.9" />
        <text x="105" y="84" textAnchor="middle" fontSize="8" fill="#92400E" fontFamily="sans-serif">دج</text>
      </g>
      <g className="coin2">
        <circle cx="140" cy="72" r="8" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1.5" opacity="0.9" />
        <text x="140" y="76" textAnchor="middle" fontSize="6" fill="#92400E" fontFamily="sans-serif">دج</text>
      </g>
      <g className="coin3">
        <circle cx="174" cy="78" r="10" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1.5" opacity="0.9" />
        <text x="174" y="82" textAnchor="middle" fontSize="8" fill="#92400E" fontFamily="sans-serif">دج</text>
      </g>

      {/* Shield check badge */}
      <g transform="translate(208, 40)">
        <circle cx="0" cy="0" r="20" fill="#0F172A" stroke="#22C55E" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="28" fill="none" stroke="#22C55E" strokeWidth="1" className="shield-glow" />
        <path d="M -8 0 L -3 6 L 10 -6" stroke="#22C55E" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="check" />
      </g>

      {/* QR hint at bottom */}
      <g transform="translate(20, 165)">
        <rect x="0" y="0" width="30" height="30" rx="4" fill="#0F172A" stroke="#14B8A6" strokeWidth="1" />
        {/* Mini QR pattern */}
        {[0,1,2].map(r => [0,1,2].map(c => (
          (r===0||r===2||c===0||c===2||(r===1&&c===1)) &&
          <rect key={`${r}-${c}`} x={5+c*7} y={5+r*7} width="5" height="5" rx="1" fill="#14B8A6" opacity="0.8" />
        )))}
        <text x="38" y="14" fontSize="8" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">ادفع بالمسح</text>
        <text x="38" y="26" fontSize="8" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">بدون نقود</text>
      </g>
    </svg>
  )
}
