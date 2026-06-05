"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

const DURATION = 2800

function Particles() {
  const dots = [
    { cx: "12%",  cy: "18%", r: 1.5, delay: 0,    dur: 4 },
    { cx: "82%",  cy: "12%", r: 1,   delay: 0.8,  dur: 5 },
    { cx: "67%",  cy: "75%", r: 2,   delay: 1.4,  dur: 3.5 },
    { cx: "25%",  cy: "60%", r: 1.2, delay: 0.3,  dur: 6 },
    { cx: "90%",  cy: "45%", r: 1.8, delay: 2,    dur: 4.5 },
    { cx: "45%",  cy: "88%", r: 1,   delay: 0.6,  dur: 5.5 },
    { cx: "5%",   cy: "40%", r: 1.5, delay: 1.8,  dur: 4 },
    { cx: "73%",  cy: "30%", r: 1,   delay: 1.1,  dur: 3.8 },
    { cx: "38%",  cy: "22%", r: 2,   delay: 2.5,  dur: 5 },
    { cx: "58%",  cy: "55%", r: 1.3, delay: 0.9,  dur: 4.2 },
    { cx: "20%",  cy: "82%", r: 1,   delay: 1.6,  dur: 6.5 },
    { cx: "93%",  cy: "70%", r: 1.5, delay: 0.4,  dur: 3.5 },
  ]

  const streaks = [
    { x1: "15%", y1: "25%", x2: "25%", y2: "18%", delay: 1,   dur: 4 },
    { x1: "70%", y1: "15%", x2: "80%", y2: "8%",  delay: 2.2, dur: 5 },
    { x1: "50%", y1: "70%", x2: "62%", y2: "65%", delay: 0.5, dur: 4.5 },
    { x1: "8%",  y1: "55%", x2: "16%", y2: "48%", delay: 3,   dur: 3.8 },
    { x1: "85%", y1: "55%", x2: "93%", y2: "50%", delay: 1.5, dur: 5.2 },
  ]

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="streakGradLS" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
        </linearGradient>
        <style>{`
          @keyframes ls-twinkle {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50%       { opacity: 0.9;  transform: scale(1.4); }
          }
          @keyframes ls-streak {
            0%, 100% { opacity: 0; }
            30%, 70% { opacity: 0.6; }
          }
          @keyframes ls-bgshift {
            0%   { background: linear-gradient(135deg,#0a0f1e 0%,#0d2137 40%,#061a2e 100%); }
            33%  { background: linear-gradient(135deg,#051a2c 0%,#0a2e2a 40%,#071a3a 100%); }
            66%  { background: linear-gradient(135deg,#080e24 0%,#0b2040 40%,#0a2a28 100%); }
            100% { background: linear-gradient(135deg,#0a0f1e 0%,#0d2137 40%,#061a2e 100%); }
          }
          @keyframes ls-float {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-12px); }
          }
          @keyframes ls-ring1 {
            0%, 100% { opacity: 0.5;  transform: scale(1); }
            50%       { opacity: 0.15; transform: scale(1.15); }
          }
          @keyframes ls-ring2 {
            0%, 100% { opacity: 0.25; transform: scale(1.12); }
            50%       { opacity: 0.55; transform: scale(1); }
          }
          @keyframes ls-ring3 {
            0%, 100% { opacity: 0.1;  transform: scale(1.25); }
            50%       { opacity: 0.35; transform: scale(1.08); }
          }
          @keyframes ls-glow {
            0%, 100% { opacity: 0.5; }
            50%       { opacity: 1; }
          }
        `}</style>
      </defs>
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx} cy={d.cy} r={d.r}
          fill="#10B981"
          style={{
            animation: `ls-twinkle ${d.dur}s ease-in-out ${d.delay}s infinite`,
            transformOrigin: `${d.cx} ${d.cy}`,
          }}
        />
      ))}
      {streaks.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="url(#streakGradLS)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ animation: `ls-streak ${s.dur}s ease-in-out ${s.delay}s infinite` }}
        />
      ))}
    </svg>
  )
}

function TKLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ls-tkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#10B981" />
          <stop offset="40%"  stopColor="#059669" />
          <stop offset="70%"  stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="ls-tkGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#34D399" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="ls-roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
        </linearGradient>
        <filter id="ls-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="ls-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.3"/>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="90" fill="white" fillOpacity="0.1" />
      <circle cx="100" cy="100" r="88" stroke="url(#ls-tkGradLight)" strokeWidth="2" strokeOpacity="0.5" fill="none" />
      <g filter="url(#ls-shadow)">
        <rect x="35" y="45" width="130" height="22" rx="11" fill="url(#ls-tkGrad)" />
        <line x1="50"  y1="56" x2="65"  y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="80"  y1="56" x2="95"  y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="110" y1="56" x2="125" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="140" y1="56" x2="150" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <path d="M88 67 L112 67 L118 145 L82 145 Z" fill="url(#ls-roadGrad)" />
        <line x1="100" y1="75"  x2="100" y2="90"  stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="100" y1="100" x2="100" y2="115" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="100" y1="125" x2="100" y2="138" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
      <g filter="url(#ls-glow)" transform="translate(72, 95)">
        <rect x="0" y="5"  width="56" height="28" rx="6" fill="white" />
        <rect x="4" y="0"  width="48" height="8"  rx="4" fill="white" />
        <rect x="6"  y="10" width="10" height="10" rx="2" fill="url(#ls-tkGrad)" opacity="0.8" />
        <rect x="19" y="10" width="10" height="10" rx="2" fill="url(#ls-tkGrad)" opacity="0.8" />
        <rect x="32" y="10" width="10" height="10" rx="2" fill="url(#ls-tkGrad)" opacity="0.8" />
        <rect x="44" y="10" width="8"  height="10" rx="2" fill="url(#ls-tkGrad)" opacity="0.6" />
        <circle cx="14" cy="35" r="6" fill="#1E293B" />
        <circle cx="14" cy="35" r="3" fill="#64748B" />
        <circle cx="42" cy="35" r="6" fill="#1E293B" />
        <circle cx="42" cy="35" r="3" fill="#64748B" />
        <circle cx="50" cy="25" r="2.5" fill="#FCD34D" />
      </g>
    </svg>
  )
}

function LoadingDots() {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 500)
    return () => clearInterval(id)
  }, [])
  const dots = ["", ".", "..", "..."][frame]
  return (
    <span className="inline-block min-w-[150px] text-center">
      جاري التحميل<span className="text-emerald-400">{dots}</span>
    </span>
  )
}

export function LoadingScreen() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const pct = Math.min((now - start) / DURATION, 1)
      setProgress(pct)
      if (pct < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setTimeout(() => router.push("/"), 150)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [router])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{ animation: "ls-bgshift 8s ease-in-out infinite" }}
      />

      {/* Radial accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(16,185,129,0.08) 0%, rgba(14,165,233,0.06) 50%, transparent 100%)" }}
      />

      {/* Particle field */}
      <Particles />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">

        {/* Logo with pulsing rings + float */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Three staggered pulse rings */}
          <div className="absolute rounded-full border border-emerald-400/50 w-64 h-64"
            style={{ animation: "ls-ring1 2.4s ease-in-out infinite", transformOrigin: "center" }} />
          <div className="absolute rounded-full border border-teal-400/30 w-72 h-72"
            style={{ animation: "ls-ring2 2.4s ease-in-out infinite 0.4s", transformOrigin: "center" }} />
          <div className="absolute rounded-full border border-sky-400/20 w-80 h-80"
            style={{ animation: "ls-ring3 2.4s ease-in-out infinite 0.8s", transformOrigin: "center" }} />

          {/* Ground glow shadow */}
          <div
            className="absolute bottom-0 w-32 h-6 rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(16,185,129,0.55) 0%, transparent 70%)",
              filter: "blur(8px)",
              animation: "ls-ring1 2.4s ease-in-out infinite",
              transform: "translateY(28px)",
            }}
          />

          {/* Floating logo */}
          <div style={{ animation: "ls-float 3s ease-in-out infinite" }}>
            {/* Outer halo */}
            <div
              className="absolute -inset-6 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(14,165,233,0.2) 50%, transparent 75%)",
                animation: "ls-glow 2.4s ease-in-out infinite",
              }}
            />
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-[2rem] border border-white/15 backdrop-blur-xl"
              style={{
                background: "rgba(255,255,255,0.05)",
                boxShadow: "0 0 40px rgba(16,185,129,0.3), 0 0 80px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              <TKLogo className="h-40 w-40" />
            </div>
          </div>
        </motion.div>

        {/* App name */}
        <motion.div
          className="space-y-1"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
        >
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #34D399, #fff 45%, #38BDF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 20px rgba(16,185,129,0.4))",
            }}
          >
            تنقلي خنشلة
          </h1>
          <p className="text-base font-medium tracking-widest text-white/50 uppercase">
            Tanakoli Khenchela
          </p>
        </motion.div>

        {/* Animated loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-sm font-medium text-white/50 tracking-wide"
        >
          <LoadingDots />
        </motion.div>
      </div>

      {/* Glowing progress bar at the very bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="h-[3px] w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #10B981, #38BDF8)",
              boxShadow: "0 0 12px rgba(16,185,129,0.8), 0 0 24px rgba(56,189,248,0.4)",
              transition: "width 16ms linear",
            }}
          />
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="absolute bottom-6 z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <p className="text-xs text-white/30 tracking-wider">ETUS Khenchela · مؤسسة النقل الحضري</p>
      </motion.div>
    </div>
  )
}
