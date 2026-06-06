"use client"

import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { PageTransition } from "@/components/page-transition"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { useState } from "react"

/* ─────────────────────────────────────────
   SVG icons — one per feature
───────────────────────────────────────── */
function IconLiveTracking() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <defs>
        <radialGradient id="gLive1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
        <filter id="fLive">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* glow halo */}
      <circle cx="28" cy="28" r="26" fill="url(#gLive1)" />
      {/* radiating arcs */}
      <path d="M14 28 a14 14 0 0 1 28 0" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35" />
      <path d="M18 28 a10 10 0 0 1 20 0" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M22 28 a6 6 0 0 1 12 0"   stroke="#34d399" strokeWidth="2"   strokeLinecap="round" fill="none" opacity="0.9" />
      {/* pole */}
      <line x1="28" y1="28" x2="28" y2="40" stroke="#34d399" strokeWidth="2" strokeLinecap="round" filter="url(#fLive)" />
      <line x1="22" y1="40" x2="34" y2="40" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* pulse dot */}
      <circle cx="28" cy="28" r="3.5" fill="#34d399" filter="url(#fLive)" />
      <circle cx="28" cy="28" r="2" fill="white" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <defs>
        <radialGradient id="gMap1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <filter id="fMap">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="28" cy="28" r="26" fill="url(#gMap1)" />
      {/* compass circle */}
      <circle cx="28" cy="28" r="13" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.45" />
      <circle cx="28" cy="28" r="9"  stroke="#38bdf8" strokeWidth="1"   fill="none" opacity="0.25" />
      {/* cardinal marks */}
      <line x1="28" y1="13" x2="28" y2="17" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="39" x2="28" y2="43" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <line x1="13" y1="28" x2="17" y2="28" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <line x1="39" y1="28" x2="43" y2="28" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {/* needle north */}
      <path d="M28 20 L30.5 28 L28 26.5 L25.5 28 Z" fill="#38bdf8" filter="url(#fMap)" />
      {/* needle south */}
      <path d="M28 36 L30.5 28 L28 29.5 L25.5 28 Z" fill="#38bdf8" opacity="0.35" />
      <circle cx="28" cy="28" r="2" fill="white" />
    </svg>
  )
}

function IconStation() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <defs>
        <radialGradient id="gSta1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
        <filter id="fSta">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="28" cy="28" r="26" fill="url(#gSta1)" />
      {/* location pin */}
      <path
        d="M28 14 C22.477 14 18 18.477 18 24 C18 30.5 28 42 28 42 C28 42 38 30.5 38 24 C38 18.477 33.523 14 28 14 Z"
        stroke="#a78bfa" strokeWidth="2" fill="rgba(167,139,250,0.12)" filter="url(#fSta)"
      />
      <circle cx="28" cy="24" r="4" fill="#a78bfa" filter="url(#fSta)" />
      <circle cx="28" cy="24" r="2.2" fill="white" />
      {/* ripple rings beneath pin */}
      <ellipse cx="28" cy="43" rx="7"  ry="2"   stroke="#a78bfa" strokeWidth="1"   fill="none" opacity="0.35" />
      <ellipse cx="28" cy="43" rx="11" ry="3"   stroke="#a78bfa" strokeWidth="0.8" fill="none" opacity="0.18" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <defs>
        <radialGradient id="gHis1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        <filter id="fHis">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="28" cy="28" r="26" fill="url(#gHis1)" />
      {/* clock face */}
      <circle cx="28" cy="28" r="13" stroke="#fb923c" strokeWidth="1.8" fill="rgba(251,146,60,0.08)" opacity="0.8" filter="url(#fHis)" />
      {/* tick marks */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const r = Math.PI * deg / 180
        const major = i % 3 === 0
        const x1 = 28 + 10 * Math.cos(r - Math.PI/2)
        const y1 = 28 + 10 * Math.sin(r - Math.PI/2)
        const x2 = 28 + (major ? 7.5 : 8.5) * Math.cos(r - Math.PI/2)
        const y2 = 28 + (major ? 7.5 : 8.5) * Math.sin(r - Math.PI/2)
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fb923c" strokeWidth={major ? 1.8 : 1} strokeLinecap="round" opacity={major ? 0.8 : 0.35} />
      })}
      {/* hands */}
      <line x1="28" y1="28" x2="28" y2="19" stroke="#fb923c" strokeWidth="2.2" strokeLinecap="round" filter="url(#fHis)" />
      <line x1="28" y1="28" x2="34" y2="31" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" filter="url(#fHis)" />
      <circle cx="28" cy="28" r="2" fill="#fb923c" filter="url(#fHis)" />
      <circle cx="28" cy="28" r="1" fill="white" />
    </svg>
  )
}

/* ─────────────────────────────────────────
   Feature data
───────────────────────────────────────── */
const features = [
  {
    id: 0,
    icon: <IconLiveTracking />,
    title: "تتبع مباشر",
    desc: "تابع موقع الحافلات لحظة بلحظة على الخريطة في الوقت الفعلي",
    bg: "linear-gradient(145deg, rgba(6,40,30,0.95) 0%, rgba(5,50,35,0.9) 60%, rgba(4,30,25,0.95) 100%)",
    shimmer: "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.05) 50%, rgba(52,211,153,0.08) 100%)",
    border: "rgba(52,211,153,0.28)",
    shadow: "0 0 48px rgba(16,185,129,0.18), inset 0 1px 0 rgba(52,211,153,0.15)",
    accent: "#34d399",
  },
  {
    id: 1,
    icon: <IconMap />,
    title: "خريطة تفاعلية",
    desc: "استكشف مسارات النقل ومحطات التوقف بخريطة ذكية وسهلة الاستخدام",
    bg: "linear-gradient(145deg, rgba(4,30,55,0.95) 0%, rgba(5,40,70,0.9) 60%, rgba(4,25,50,0.95) 100%)",
    shimmer: "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(14,165,233,0.05) 50%, rgba(56,189,248,0.08) 100%)",
    border: "rgba(56,189,248,0.28)",
    shadow: "0 0 48px rgba(14,165,233,0.18), inset 0 1px 0 rgba(56,189,248,0.15)",
    accent: "#38bdf8",
  },
  {
    id: 2,
    icon: <IconStation />,
    title: "المحطات القريبة",
    desc: "اكتشف أقرب محطة إليك فورًا واعرف مواعيد الحافلات القادمة",
    bg: "linear-gradient(145deg, rgba(20,14,50,0.95) 0%, rgba(30,20,70,0.9) 60%, rgba(16,12,45,0.95) 100%)",
    shimmer: "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(139,92,246,0.05) 50%, rgba(167,139,250,0.08) 100%)",
    border: "rgba(167,139,250,0.28)",
    shadow: "0 0 48px rgba(99,102,241,0.18), inset 0 1px 0 rgba(167,139,250,0.15)",
    accent: "#a78bfa",
  },
  {
    id: 3,
    icon: <IconHistory />,
    title: "سجل الرحلات",
    desc: "استعرض رحلاتك السابقة وتتبع إنفاقك على وسائل النقل بسهولة",
    bg: "linear-gradient(145deg, rgba(40,15,5,0.95) 0%, rgba(60,20,8,0.9) 60%, rgba(35,12,4,0.95) 100%)",
    shimmer: "linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(249,115,22,0.05) 50%, rgba(251,146,60,0.08) 100%)",
    border: "rgba(251,146,60,0.28)",
    shadow: "0 0 48px rgba(249,115,22,0.18), inset 0 1px 0 rgba(251,146,60,0.15)",
    accent: "#fb923c",
  },
]

/* ─────────────────────────────────────────
   Bus illustration
───────────────────────────────────────── */
function BusIllustration() {
  return (
    <div className="about-float flex justify-center">
      <svg width="180" height="110" viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="busBody" x1="0" y1="0" x2="180" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="0.5" stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="roadLine" x1="0" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" stopOpacity="0" />
            <stop offset="0.3" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="0.7" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <filter id="busShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.35"/>
          </filter>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="0" y="96" width="180" height="2" rx="1" fill="url(#roadLine)" />
        {[20, 55, 90, 125, 160].map((x) => (
          <rect key={x} x={x} y="98.5" width="14" height="1.5" rx="0.75" fill="white" fillOpacity="0.15" />
        ))}
        <g filter="url(#busShadow)">
          <rect x="18" y="28" width="144" height="62" rx="10" fill="url(#busBody)" />
          <rect x="26" y="22" width="128" height="14" rx="7" fill="url(#busBody)" opacity="0.85" />
          {[32, 62, 92, 122].map((x) => (
            <rect key={x} x={x} y="38" width="24" height="18" rx="4" fill="white" fillOpacity="0.18" />
          ))}
          <rect x="148" y="34" width="8" height="22" rx="3" fill="white" fillOpacity="0.22" />
          <rect x="26" y="52" width="16" height="24" rx="3" fill="white" fillOpacity="0.1" />
          <line x1="34" y1="52" x2="34" y2="76" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />
          <circle cx="161" cy="72" r="5" fill="#fef08a" opacity="0.9" filter="url(#glowFilter)" />
          <circle cx="161" cy="72" r="3" fill="white" />
          <rect x="19" y="68" width="5" height="10" rx="2" fill="#f87171" opacity="0.9" />
        </g>
        <circle cx="48" cy="94" r="12" fill="#1e293b" />
        <circle cx="48" cy="94" r="7"  fill="#334155" />
        <circle cx="48" cy="94" r="3"  fill="#64748b" />
        <circle cx="132" cy="94" r="12" fill="#1e293b" />
        <circle cx="132" cy="94" r="7"  fill="#334155" />
        <circle cx="132" cy="94" r="3"  fill="#64748b" />
        {[30, 70, 110, 150].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="13" r={i === 1 ? 5 : 3.5} fill={i === 1 ? "#10b981" : "white"} fillOpacity={i === 1 ? 1 : 0.35} />
            {i < 3 && <line x1={x + (i === 1 ? 5 : 3.5)} y1="13" x2={x + 37} y2="13" stroke="white" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 3" />}
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function AboutPage() {
  const router = useRouter()
  const [active, setActive] = useState(0)
  const [dir, setDir] = useState(1)

  const go = (d: number) => {
    setDir(d)
    setActive((p) => (p + d + features.length) % features.length)
  }

  const f = features[active]

  return (
    <PageTransition>
      <style>{`
        @keyframes orbDrift1 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(28px, -22px) scale(1.08); }
          66%  { transform: translate(-18px, 16px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orbDrift2 {
          0%   { transform: translate(0px, 0px) scale(1); }
          40%  { transform: translate(-24px, 20px) scale(1.06); }
          80%  { transform: translate(18px, -14px) scale(0.97); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orbDrift3 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(20px, 18px) scale(1.04); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes aboutFloat {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .about-float { animation: aboutFloat 4.5s ease-in-out infinite; }
        .orb1 { animation: orbDrift1 18s ease-in-out infinite; }
        .orb2 { animation: orbDrift2 22s ease-in-out infinite; }
        .orb3 { animation: orbDrift3 16s ease-in-out infinite; }
        .orb4 { animation: orbDrift1 26s ease-in-out infinite reverse; }
        .orb5 { animation: orbDrift2 20s ease-in-out infinite 4s; }
      `}</style>

      <main className="relative min-h-screen pb-36" style={{ background: "#030d18" }}>
        {/* Background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 1px 1px, rgba(16,185,129,0.04) 1px, transparent 0)", backgroundSize:"36px 36px" }} />
          <div className="orb1" style={{ position:"absolute", left:"8%",   top:"6%",    width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.32) 0%, transparent 70%)", filter:"blur(48px)" }} />
          <div className="orb2" style={{ position:"absolute", right:"6%",  top:"15%",   width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(6,182,212,0.28) 0%, transparent 70%)",  filter:"blur(44px)" }} />
          <div className="orb3" style={{ position:"absolute", left:"20%",  top:"45%",   width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(59,130,246,0.24) 0%, transparent 70%)",  filter:"blur(40px)" }} />
          <div className="orb4" style={{ position:"absolute", right:"15%", bottom:"25%",width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",  filter:"blur(50px)" }} />
          <div className="orb5" style={{ position:"absolute", left:"50%",  bottom:"10%",width:180, height:180, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)", filter:"blur(38px)" }} />
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center, transparent 40%, rgba(3,13,24,0.7) 100%)" }} />
        </div>

        <div className="relative z-10">
          <AppHeader />

          <div className="px-4 pt-20 max-w-md mx-auto">

            {/* Back */}
            <motion.button
              onClick={() => router.back()}
              initial={{ opacity:0, x:-8 }}
              animate={{ opacity:1, x:0 }}
              transition={{ duration:0.25 }}
              className="mb-6 flex items-center gap-1 text-sm"
              style={{ color:"rgba(255,255,255,0.38)" }}
            >
              <ChevronRight className="h-4 w-4" />
              رجوع
            </motion.button>

            {/* Identity */}
            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.45 }}
              className="mb-8 rounded-3xl border p-6 text-center"
              style={{ background:"rgba(255,255,255,0.03)", borderColor:"rgba(255,255,255,0.07)", backdropFilter:"blur(12px)" }}
            >
              <div className="mb-5">
                <BusIllustration />
              </div>
              <h1
                className="mb-1 text-3xl font-extrabold tracking-tight"
                style={{ background:"linear-gradient(90deg,#34d399,#22d3ee,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}
              >
                تنقلي خنشلة
              </h1>
              <p className="mb-4 text-sm font-light" style={{ color:"rgba(255,255,255,0.35)" }}>Tanakoli Khenchela</p>
              <p className="text-sm leading-7" style={{ color:"rgba(255,255,255,0.5)" }}>
                تطبيق ذكي لتحديث النقل الحضري في مدينة خنشلة، يتيح تتبع الحافلات ومعرفة المواعيد بكل سهولة.{" "}
                تم تطوير وتصميم هذا التطبيق بالكامل بواسطة المطور{" "}
                <span className="font-semibold" style={{ background:"linear-gradient(90deg,#34d399,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  Mouad ZR
                </span>
              </p>
            </motion.div>

            {/* Feature swiper */}
            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.45, delay:0.12 }}
              className="mb-8"
            >
              <p className="mb-3 text-right text-base font-bold" style={{ color:"rgba(255,255,255,0.75)" }}>
                مميزات التطبيق
              </p>

              <div className="relative overflow-hidden rounded-2xl" style={{ height:210 }}>
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={active}
                    custom={dir}
                    variants={{
                      enter:  (d:number) => ({ x: d > 0 ? 280 : -280, opacity:0 }),
                      center: { x:0, opacity:1 },
                      exit:   (d:number) => ({ x: d > 0 ? -280 : 280, opacity:0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration:0.34, ease:"easeInOut" }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl p-6 text-center overflow-hidden"
                    style={{
                      background: f.bg,
                      border: `1px solid ${f.border}`,
                      boxShadow: f.shadow,
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    {/* shimmer overlay */}
                    <div className="absolute inset-0 rounded-2xl" style={{ background: f.shimmer }} />
                    {/* top-edge highlight */}
                    <div className="absolute top-0 left-6 right-6 h-px" style={{ background:`linear-gradient(90deg, transparent, ${f.accent}55, transparent)` }} />

                    <div className="relative z-10 flex flex-col items-center gap-3">
                      {/* Icon with glow ring */}
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full" style={{ background:`radial-gradient(circle, ${f.accent}22 0%, transparent 70%)`, width:70, height:70, top:-7, left:-7 }} />
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl"
                          style={{
                            background:`rgba(0,0,0,0.3)`,
                            border:`1px solid ${f.border}`,
                            boxShadow:`0 0 20px ${f.accent}30, inset 0 1px 0 ${f.accent}20`,
                          }}
                        >
                          {f.icon}
                        </div>
                      </div>

                      {/* Text */}
                      <div>
                        <h3
                          className="mb-1.5 text-xl font-bold tracking-wide"
                          style={{ color:"rgba(255,255,255,0.95)", textShadow:`0 0 20px ${f.accent}40` }}
                        >
                          {f.title}
                        </h3>
                        <p className="text-sm leading-6" style={{ color:"rgba(255,255,255,0.5)", letterSpacing:"0.01em" }}>
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Arrows */}
                <button
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background:"rgba(0,0,0,0.45)", border:"1px solid rgba(255,255,255,0.1)" }}
                >
                  <ChevronLeft className="h-4 w-4 text-white/55" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background:"rgba(0,0,0,0.45)", border:"1px solid rgba(255,255,255,0.1)" }}
                >
                  <ChevronRight className="h-4 w-4 text-white/55" />
                </button>
              </div>

              {/* Dots */}
              <div className="mt-3 flex justify-center gap-2">
                {features.map((ft, i) => (
                  <button
                    key={i}
                    onClick={() => { setDir(i > active ? 1 : -1); setActive(i) }}
                    style={{
                      height: 6,
                      width: i === active ? 22 : 6,
                      borderRadius: 3,
                      background: i === active ? ft.accent : "rgba(255,255,255,0.2)",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Organisation */}
            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.45, delay:0.22 }}
              className="mb-8 rounded-2xl border p-4"
              style={{ background:"rgba(255,255,255,0.025)", borderColor:"rgba(255,255,255,0.06)", backdropFilter:"blur(10px)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.2)" }}
                >
                  🚌
                </div>
                <div>
                  <p className="font-semibold text-white/80 text-sm">ETUS Khenchela</p>
                  <p className="text-xs" style={{ color:"rgba(255,255,255,0.35)" }}>مؤسسة النقل الحضري وشبه الحضري — ولاية خنشلة</p>
                </div>
              </div>
            </motion.div>

            {/* Footer — Fix 1: سياسة الخصوصية is plain non-clickable text only */}
            <motion.div
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              transition={{ duration:0.5, delay:0.3 }}
              className="mb-4 flex flex-col items-center gap-1 py-2"
            >
              <span
                className="select-none text-xs"
                style={{ color:"rgba(255,255,255,0.18)", cursor:"default", userSelect:"none" }}
              >
                سياسة الخصوصية
              </span>
              <a
                href="mailto:dev.mouad.zr@gmail.com"
                className="text-xs transition-all duration-300"
                style={{ color:"rgba(255,255,255,0.28)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "rgba(52,211,153,0.85)"
                  ;(e.currentTarget as HTMLElement).style.textShadow = "0 0 10px rgba(16,185,129,0.5)"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"
                  ;(e.currentTarget as HTMLElement).style.textShadow = "none"
                }}
              >
                dev.mouad.zr@gmail.com
              </a>
            </motion.div>

          </div>
        </div>

        <BottomNav />
      </main>
    </PageTransition>
  )
}
