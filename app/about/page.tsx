"use client"

import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { PageTransition } from "@/components/page-transition"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { useState } from "react"

const features = [
  {
    id: 0,
    emoji: "📡",
    title: "تتبع مباشر",
    desc: "تابع موقع الحافلات لحظة بلحظة على الخريطة في الوقت الفعلي",
    from: "#064e3b",
    to: "#065f46",
    border: "rgba(52,211,153,0.25)",
    glow: "rgba(16,185,129,0.15)",
  },
  {
    id: 1,
    emoji: "🗺️",
    title: "خريطة تفاعلية",
    desc: "استكشف مسارات النقل ومحطات التوقف بخريطة ذكية وسهلة الاستخدام",
    from: "#0c4a6e",
    to: "#075985",
    border: "rgba(56,189,248,0.25)",
    glow: "rgba(14,165,233,0.15)",
  },
  {
    id: 2,
    emoji: "📍",
    title: "المحطات القريبة",
    desc: "اكتشف أقرب محطة إليك فورًا واعرف مواعيد الحافلات القادمة",
    from: "#1e1b4b",
    to: "#312e81",
    border: "rgba(165,180,252,0.25)",
    glow: "rgba(99,102,241,0.15)",
  },
  {
    id: 3,
    emoji: "🕓",
    title: "سجل الرحلات",
    desc: "استعرض رحلاتك السابقة وتتبع إنفاقك على وسائل النقل بسهولة",
    from: "#431407",
    to: "#7c2d12",
    border: "rgba(251,146,60,0.25)",
    glow: "rgba(249,115,22,0.15)",
  },
]

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

        {/* Road / route line */}
        <rect x="0" y="96" width="180" height="2" rx="1" fill="url(#roadLine)" />

        {/* Dashes on road */}
        {[20, 55, 90, 125, 160].map((x) => (
          <rect key={x} x={x} y="98.5" width="14" height="1.5" rx="0.75" fill="white" fillOpacity="0.15" />
        ))}

        {/* Bus body */}
        <g filter="url(#busShadow)">
          <rect x="18" y="28" width="144" height="62" rx="10" fill="url(#busBody)" />
          {/* Roof accent */}
          <rect x="26" y="22" width="128" height="14" rx="7" fill="url(#busBody)" opacity="0.85" />
          {/* Windows row */}
          {[32, 62, 92, 122].map((x) => (
            <rect key={x} x={x} y="38" width="24" height="18" rx="4" fill="white" fillOpacity="0.18" />
          ))}
          {/* Front window */}
          <rect x="148" y="34" width="8" height="22" rx="3" fill="white" fillOpacity="0.22" />
          {/* Door */}
          <rect x="26" y="52" width="16" height="24" rx="3" fill="white" fillOpacity="0.1" />
          <line x1="34" y1="52" x2="34" y2="76" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />
          {/* Headlights */}
          <circle cx="161" cy="72" r="5" fill="#fef08a" opacity="0.9" filter="url(#glowFilter)" />
          <circle cx="161" cy="72" r="3" fill="white" />
          {/* Tail light */}
          <rect x="19" y="68" width="5" height="10" rx="2" fill="#f87171" opacity="0.9" />
        </g>

        {/* Wheels */}
        <circle cx="48" cy="94" r="12" fill="#1e293b" />
        <circle cx="48" cy="94" r="7" fill="#334155" />
        <circle cx="48" cy="94" r="3" fill="#64748b" />
        <circle cx="132" cy="94" r="12" fill="#1e293b" />
        <circle cx="132" cy="94" r="7" fill="#334155" />
        <circle cx="132" cy="94" r="3" fill="#64748b" />

        {/* Route dots above */}
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

export default function AboutPage() {
  const router = useRouter()
  const [active, setActive] = useState(0)
  const [dir, setDir] = useState(1)

  const go = (d: number) => {
    setDir(d)
    setActive((p) => (p + d + features.length) % features.length)
  }

  return (
    <PageTransition>
      {/* ── CSS keyframe animations ── */}
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
        {/* ── Static dark background ── */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
          {/* grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(16,185,129,0.04) 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }} />
          {/* orbs */}
          <div className="orb1" style={{ position:"absolute", left:"8%",  top:"6%",  width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.32) 0%, transparent 70%)", filter:"blur(48px)" }} />
          <div className="orb2" style={{ position:"absolute", right:"6%", top:"15%", width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(6,182,212,0.28) 0%, transparent 70%)",  filter:"blur(44px)" }} />
          <div className="orb3" style={{ position:"absolute", left:"20%", top:"45%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(59,130,246,0.24) 0%, transparent 70%)",  filter:"blur(40px)" }} />
          <div className="orb4" style={{ position:"absolute", right:"15%",bottom:"25%",width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",  filter:"blur(50px)" }} />
          <div className="orb5" style={{ position:"absolute", left:"50%", bottom:"10%",width:180, height:180, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)", filter:"blur(38px)" }} />
          {/* vignette */}
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center, transparent 40%, rgba(3,13,24,0.7) 100%)" }} />
        </div>

        {/* ── Page content ── */}
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

            {/* ── Identity section ── */}
            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.45 }}
              className="mb-8 rounded-3xl border p-6 text-center"
              style={{
                background:"rgba(255,255,255,0.03)",
                borderColor:"rgba(255,255,255,0.07)",
                backdropFilter:"blur(12px)",
              }}
            >
              {/* Bus illustration */}
              <div className="mb-5">
                <BusIllustration />
              </div>

              {/* App name */}
              <h1
                className="mb-1 text-3xl font-extrabold tracking-tight"
                style={{
                  background:"linear-gradient(90deg,#34d399,#22d3ee,#818cf8)",
                  WebkitBackgroundClip:"text",
                  WebkitTextFillColor:"transparent",
                }}
              >
                تنقلي خنشلة
              </h1>
              <p className="mb-4 text-sm font-light" style={{ color:"rgba(255,255,255,0.35)" }}>
                Tanakoli Khenchela
              </p>

              {/* Description */}
              <p className="text-sm leading-7" style={{ color:"rgba(255,255,255,0.5)" }}>
                تطبيق ذكي لتحديث النقل الحضري في مدينة خنشلة، يتيح تتبع الحافلات ومعرفة المواعيد بكل سهولة.{" "}
                تم تطوير وتصميم هذا التطبيق بالكامل بواسطة المطور{" "}
                <span
                  className="font-semibold"
                  style={{
                    background:"linear-gradient(90deg,#34d399,#22d3ee)",
                    WebkitBackgroundClip:"text",
                    WebkitTextFillColor:"transparent",
                  }}
                >
                  Mouad ZR
                </span>
              </p>
            </motion.div>

            {/* ── Feature swiper ── */}
            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.45, delay:0.12 }}
              className="mb-8"
            >
              <p className="mb-3 text-right text-base font-bold" style={{ color:"rgba(255,255,255,0.75)" }}>
                مميزات التطبيق
              </p>

              {/* Card */}
              <div className="relative overflow-hidden rounded-2xl" style={{ height:190 }}>
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={active}
                    custom={dir}
                    variants={{
                      enter:  (d:number) => ({ x: d > 0 ? 260 : -260, opacity:0 }),
                      center: { x:0, opacity:1 },
                      exit:   (d:number) => ({ x: d > 0 ? -260 : 260, opacity:0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration:0.32, ease:"easeInOut" }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center"
                    style={{
                      background:`linear-gradient(135deg, ${features[active].from}, ${features[active].to})`,
                      borderColor: features[active].border,
                      boxShadow: `0 0 40px ${features[active].glow}`,
                    }}
                  >
                    <span style={{ fontSize:42, lineHeight:1 }}>{features[active].emoji}</span>
                    <div>
                      <h3 className="mb-1 text-lg font-bold text-white">{features[active].title}</h3>
                      <p className="text-xs leading-6" style={{ color:"rgba(255,255,255,0.55)" }}>
                        {features[active].desc}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Arrows */}
                <button
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.1)" }}
                >
                  <ChevronLeft className="h-4 w-4 text-white/60" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.1)" }}
                >
                  <ChevronRight className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Dots */}
              <div className="mt-3 flex justify-center gap-2">
                {features.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDir(i > active ? 1 : -1); setActive(i) }}
                    className="transition-all duration-300"
                    style={{
                      height:6,
                      width: i === active ? 22 : 6,
                      borderRadius:3,
                      background: i === active ? "#34d399" : "rgba(255,255,255,0.2)",
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* ── Organisation ── */}
            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.45, delay:0.22 }}
              className="mb-8 rounded-2xl border p-4"
              style={{
                background:"rgba(255,255,255,0.025)",
                borderColor:"rgba(255,255,255,0.06)",
                backdropFilter:"blur(10px)",
              }}
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

            {/* ── Footer ── */}
            <motion.div
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              transition={{ duration:0.5, delay:0.3 }}
              className="mb-4 flex flex-col items-center gap-1 py-2"
            >
              <span className="text-xs" style={{ color:"rgba(255,255,255,0.18)" }}>سياسة الخصوصية</span>
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
