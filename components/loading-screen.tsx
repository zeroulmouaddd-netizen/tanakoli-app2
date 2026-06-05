"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const DURATION = 2600

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
        setTimeout(() => router.push("/"), 120)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [router])

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
    >
      <style>{`
        @keyframes ls-bg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ls-orbit1 {
          from { transform: rotate(0deg)   translateX(56px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(56px) rotate(-360deg); }
        }
        @keyframes ls-orbit2 {
          from { transform: rotate(120deg)  translateX(80px) rotate(-120deg); }
          to   { transform: rotate(480deg)  translateX(80px) rotate(-480deg); }
        }
        @keyframes ls-orbit3 {
          from { transform: rotate(240deg)  translateX(108px) rotate(-240deg); }
          to   { transform: rotate(600deg)  translateX(108px) rotate(-600deg); }
        }
        @keyframes ls-core {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0.7;  transform: scale(1.2); }
        }
        @keyframes ls-ring {
          0%   { transform: scale(0.85); opacity: 0.5; }
          50%  { transform: scale(1.15); opacity: 0.1; }
          100% { transform: scale(0.85); opacity: 0.5; }
        }
        @keyframes ls-ring2 {
          0%   { transform: scale(1);    opacity: 0.2; }
          50%  { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1);    opacity: 0.2; }
        }
        @keyframes ls-dot {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.7); }
        }
        @keyframes ls-streak {
          0%, 100% { opacity: 0; }
          40%, 60% { opacity: 1; }
        }
        @keyframes ls-particle {
          0%, 100% { opacity: 0.08; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(-45deg, #030d1a, #051e2c, #071f2e, #040e1c, #061a28, #08202e)",
          backgroundSize: "400% 400%",
          animation: "ls-bg 10s ease infinite",
        }}
      />

      {/* Subtle background particles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        {/* Faint streaks */}
        {[
          { x1:"8%",  y1:"30%", x2:"22%", y2:"18%", delay:0.5, dur:5 },
          { x1:"75%", y1:"12%", x2:"88%", y2:"24%", delay:1.8, dur:4 },
          { x1:"60%", y1:"70%", x2:"72%", y2:"60%", delay:0.2, dur:6 },
          { x1:"15%", y1:"72%", x2:"28%", y2:"82%", delay:2.5, dur:4.5 },
          { x1:"82%", y1:"58%", x2:"92%", y2:"48%", delay:1.2, dur:5.5 },
          { x1:"42%", y1:"88%", x2:"52%", y2:"78%", delay:3.1, dur:3.8 },
        ].map((s, i) => (
          <line
            key={i}
            x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="rgba(20,210,160,0.5)"
            strokeWidth="0.8"
            strokeLinecap="round"
            style={{ animation: `ls-streak ${s.dur}s ease-in-out ${s.delay}s infinite` }}
          />
        ))}
        {/* Tiny particles */}
        {[
          { cx:"18%", cy:"22%", r:1.2, delay:0 },
          { cx:"85%", cy:"15%", r:0.9, delay:1 },
          { cx:"70%", cy:"78%", r:1.4, delay:2 },
          { cx:"10%", cy:"65%", r:1,   delay:0.7 },
          { cx:"50%", cy:"90%", r:1.2, delay:1.5 },
          { cx:"92%", cy:"42%", r:0.8, delay:2.8 },
          { cx:"35%", cy:"12%", r:1,   delay:0.3 },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.cx} cy={p.cy} r={p.r}
            fill="#10B981"
            style={{ animation: `ls-particle 4s ease-in-out ${p.delay}s infinite` }}
          />
        ))}
      </svg>

      {/* Centered orbit animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>

          {/* Breathing rings */}
          <div
            className="absolute rounded-full border border-emerald-500/30"
            style={{ width: 140, height: 140, animation: "ls-ring 3s ease-in-out infinite" }}
          />
          <div
            className="absolute rounded-full border border-teal-400/15"
            style={{ width: 180, height: 180, animation: "ls-ring2 3s ease-in-out 0.5s infinite" }}
          />

          {/* Central glow core */}
          <div
            className="absolute rounded-full"
            style={{
              width: 14,
              height: 14,
              background: "radial-gradient(circle, rgba(52,211,153,0.9) 0%, rgba(20,184,166,0.4) 60%, transparent 100%)",
              boxShadow: "0 0 20px rgba(52,211,153,0.7), 0 0 40px rgba(20,184,166,0.3)",
              animation: "ls-core 2.4s ease-in-out infinite",
            }}
          />

          {/* Orbit 1 — inner, fastest, emerald */}
          <div
            className="absolute"
            style={{ animation: "ls-orbit1 1.8s linear infinite" }}
          >
            <div
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: "#34D399",
                boxShadow: "0 0 10px rgba(52,211,153,0.9), 0 0 20px rgba(52,211,153,0.4)",
                animation: "ls-dot 1.8s ease-in-out infinite",
              }}
            />
          </div>

          {/* Orbit 2 — mid, medium, sky */}
          <div
            className="absolute"
            style={{ animation: "ls-orbit2 2.8s linear infinite" }}
          >
            <div
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#38BDF8",
                boxShadow: "0 0 10px rgba(56,189,248,0.9), 0 0 20px rgba(56,189,248,0.4)",
                animation: "ls-dot 2.8s ease-in-out 0.4s infinite",
              }}
            />
          </div>

          {/* Orbit 3 — outer, slowest, teal */}
          <div
            className="absolute"
            style={{ animation: "ls-orbit3 4s linear infinite" }}
          >
            <div
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: "#2DD4BF",
                boxShadow: "0 0 8px rgba(45,212,191,0.9), 0 0 16px rgba(45,212,191,0.4)",
                animation: "ls-dot 4s ease-in-out 0.9s infinite",
              }}
            />
          </div>

        </div>
      </div>

      {/* Glowing progress bar — bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="h-[2px] w-full" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #10B981, #38BDF8)",
              boxShadow: "0 0 10px rgba(16,185,129,0.9), 0 0 20px rgba(56,189,248,0.5)",
              borderRadius: "0 2px 2px 0",
              transition: "width 16ms linear",
            }}
          />
        </div>
      </div>
    </div>
  )
}
