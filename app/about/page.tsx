"use client"

import { useRouter } from "next/navigation"
import { motion, useAnimationFrame, useMotionValue, AnimatePresence } from "framer-motion"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { PageTransition } from "@/components/page-transition"
import { ChevronRight, ChevronLeft, Bus, MapPin, Users, Shield } from "lucide-react"
import { useState, useRef } from "react"

function TKLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="tkGradientAbout" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="40%" stopColor="#059669" />
          <stop offset="70%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="tkGradientLightAbout" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="roadGradientAbout" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glowAbout" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="shadowAbout" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.3"/>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="90" fill="white" fillOpacity="0.1" />
      <circle cx="100" cy="100" r="88" stroke="url(#tkGradientLightAbout)" strokeWidth="2" strokeOpacity="0.5" fill="none" />
      <g filter="url(#shadowAbout)">
        <rect x="35" y="45" width="130" height="22" rx="11" fill="url(#tkGradientAbout)" />
        <line x1="50" y1="56" x2="65" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="80" y1="56" x2="95" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="110" y1="56" x2="125" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="140" y1="56" x2="150" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <path d="M88 67 L112 67 L118 145 L82 145 Z" fill="url(#roadGradientAbout)" />
        <line x1="100" y1="75" x2="100" y2="90" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="100" y1="100" x2="100" y2="115" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="100" y1="125" x2="100" y2="138" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
      <g filter="url(#glowAbout)" transform="translate(72, 95)">
        <rect x="0" y="5" width="56" height="28" rx="6" fill="white" />
        <rect x="4" y="0" width="48" height="8" rx="4" fill="white" />
        <rect x="6" y="10" width="10" height="10" rx="2" fill="url(#tkGradientAbout)" opacity="0.8" />
        <rect x="19" y="10" width="10" height="10" rx="2" fill="url(#tkGradientAbout)" opacity="0.8" />
        <rect x="32" y="10" width="10" height="10" rx="2" fill="url(#tkGradientAbout)" opacity="0.8" />
        <rect x="44" y="10" width="8" height="10" rx="2" fill="url(#tkGradientAbout)" opacity="0.6" />
        <circle cx="14" cy="35" r="6" fill="#1E293B" />
        <circle cx="14" cy="35" r="3" fill="#64748B" />
        <circle cx="42" cy="35" r="6" fill="#1E293B" />
        <circle cx="42" cy="35" r="3" fill="#64748B" />
        <circle cx="50" cy="25" r="2.5" fill="#FCD34D" />
      </g>
      <g opacity="0.15">
        <path d="M145 75 L165 55" stroke="url(#tkGradientAbout)" strokeWidth="8" strokeLinecap="round" />
        <path d="M145 75 L165 95" stroke="url(#tkGradientAbout)" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function AnimatedOrb({ x, y, size, color, duration, delay }: {
  x: string; y: string; size: number; color: string; duration: number; delay: number
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: color,
        filter: `blur(${size * 0.45}px)`,
      }}
      animate={{
        x: [0, 30, -20, 15, 0],
        y: [0, -25, 20, -10, 0],
        scale: [1, 1.15, 0.9, 1.1, 1],
        opacity: [0.35, 0.55, 0.3, 0.5, 0.35],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

function LiveBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #020c14 0%, #050f1a 40%, #030e18 70%, #010a12 100%)" }}>
      <AnimatedOrb x="10%" y="8%"  size={220} color="radial-gradient(circle, rgba(16,185,129,0.55) 0%, transparent 70%)"  duration={9}  delay={0} />
      <AnimatedOrb x="65%" y="5%"  size={180} color="radial-gradient(circle, rgba(6,182,212,0.45) 0%, transparent 70%)"   duration={11} delay={1.5} />
      <AnimatedOrb x="5%"  y="55%" size={200} color="radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)"   duration={13} delay={3} />
      <AnimatedOrb x="70%" y="55%" size={240} color="radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)"  duration={10} delay={0.8} />
      <AnimatedOrb x="35%" y="35%" size={160} color="radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)"   duration={14} delay={2} />
      <AnimatedOrb x="55%" y="80%" size={190} color="radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)"  duration={12} delay={4} />

      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(16,185,129,0.04) 0%, rgba(6,182,212,0.06) 30%, rgba(59,130,246,0.04) 60%, transparent 100%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(16,185,129,0.04) 1px, transparent 0)`,
        backgroundSize: "32px 32px",
      }} />
    </div>
  )
}

function PulsingDotIcon() {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-emerald-400/60"
          animate={{ scale: [0.4, 1.8], opacity: [0.8, 0] }}
          transition={{ duration: 2, delay: i * 0.6, repeat: Infinity, ease: "easeOut" }}
          style={{ width: 48, height: 48 }}
        />
      ))}
      <motion.div
        className="w-4 h-4 rounded-full bg-emerald-400"
        animate={{ scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ boxShadow: "0 0 12px rgba(16,185,129,0.9)" }}
      />
    </div>
  )
}

function RadarIcon() {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      {[1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan-400/50"
          style={{ width: i * 20, height: i * 20 }}
          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
          transition={{ duration: 1.8, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="absolute w-7 h-0.5 origin-left rounded-full bg-gradient-to-r from-cyan-400 to-transparent"
        style={{ left: "50%", top: "50%", translateY: "-50%" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
      <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px rgba(6,182,212,0.9)" }} />
    </div>
  )
}

function RouteLineIcon() {
  return (
    <div className="relative flex items-center justify-center w-14 h-14 overflow-hidden">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <motion.path
          d="M6 40 C 14 40, 18 12, 26 12 S 38 40, 46 40"
          stroke="url(#routeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="52" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="6" cy="40" r="3" fill="#10B981"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <motion.circle
          cx="46" cy="40" r="3" fill="#3B82F6"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </svg>
    </div>
  )
}

function ShieldIcon() {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }}
      />
      <Shield className="w-7 h-7 text-indigo-400" strokeWidth={1.5} />
    </div>
  )
}

const features = [
  {
    icon: <PulsingDotIcon />,
    title: "تتبع مباشر",
    description: "متابعة الحافلات في الوقت الفعلي بدقة عالية",
    accent: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    label: "LIVE",
  },
  {
    icon: <RadarIcon />,
    title: "خرائط تفاعلية",
    description: "عرض المحطات والمسارات على خريطة ذكية",
    accent: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-500/20",
    label: "MAP",
  },
  {
    icon: <RouteLineIcon />,
    title: "خدمة المواطنين",
    description: "تسهيل التنقل الحضري لكل مواطن",
    accent: "from-blue-500/20 to-blue-500/5",
    border: "border-blue-500/20",
    label: "CITY",
  },
  {
    icon: <ShieldIcon />,
    title: "موثوقية عالية",
    description: "بيانات دقيقة ومحدثة باستمرار",
    accent: "from-indigo-500/20 to-indigo-500/5",
    border: "border-indigo-500/20",
    label: "SAFE",
  },
]

function FeatureSwiper() {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0)

  const go = (dir: number) => {
    setDirection(dir)
    setActive((prev) => (prev + dir + features.length) % features.length)
  }

  return (
    <div className="mb-6">
      <h3 className="mb-4 text-lg font-bold text-white/90 text-right">مميزات التطبيق</h3>
      <div className="relative overflow-hidden rounded-2xl" style={{ height: 220 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? 220 : -220, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? -220 : 220, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border bg-gradient-to-b p-6 ${features[active].accent} ${features[active].border}`}
            style={{ backdropFilter: "blur(16px)", background: "rgba(5,15,30,0.7)" }}
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${features[active].accent} opacity-40`} />
            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              {features[active].icon}
              <div>
                <p className="text-xs font-mono tracking-widest text-white/30 mb-1">{features[active].label}</p>
                <h4 className="text-xl font-bold text-white mb-1">{features[active].title}</h4>
                <p className="text-sm text-white/50 leading-relaxed">{features[active].description}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/60 backdrop-blur-sm active:scale-95 transition-transform"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/60 backdrop-blur-sm active:scale-95 transition-transform"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {features.map((_, i) => (
          <button key={i} onClick={() => { setDirection(i > active ? 1 : -1); setActive(i) }}>
            <motion.div
              animate={{ width: i === active ? 24 : 8, opacity: i === active ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full bg-emerald-400"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AboutPage() {
  const router = useRouter()

  return (
    <PageTransition>
      <main className="relative min-h-screen pb-40">
        <LiveBackground />

        <div className="relative z-10">
          <AppHeader />

          <div className="px-4 pt-20">
            <motion.button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-5 w-5" />
              <span>رجوع</span>
            </motion.button>

            <motion.div
              className="mb-6 flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 shadow-lg" style={{ boxShadow: "0 0 24px rgba(16,185,129,0.4)" }}>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">حول التطبيق</h1>
                <p className="text-sm text-white/40">بطاقة التعريف</p>
              </div>
            </motion.div>

            <motion.div
              className="mb-6 overflow-hidden rounded-2xl p-6 shadow-2xl border border-white/5"
              style={{ background: "rgba(5,15,30,0.75)", backdropFilter: "blur(20px)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <motion.div
                  className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", filter: "blur(20px)" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute right-1/4 bottom-1/4 h-32 w-32 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", filter: "blur(20px)" }}
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <div className="relative flex flex-col items-center text-center">
                <motion.div
                  className="relative mb-6"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <motion.div
                    className="absolute -inset-4 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)" }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-[1.5rem] border border-white/15 bg-white/5 shadow-2xl backdrop-blur-xl">
                    <TKLogo className="h-32 w-32" />
                  </div>
                </motion.div>

                <motion.h2
                  className="mb-2 bg-gradient-to-r from-emerald-300 via-white to-blue-300 bg-clip-text text-3xl font-bold text-transparent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  تنقلي خنشلة
                </motion.h2>

                <motion.p
                  className="mb-4 text-lg font-medium text-white/70"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  Tanakoli Khenchela
                </motion.p>

                <motion.p
                  className="mb-4 text-sm leading-relaxed text-white/55 text-center px-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  مشروع تحديث النقل الحضري لمدينة خنشلة. تم تطوير وتصميم هذا التطبيق بالكامل بواسطة المطور{" "}
                  <span className="font-semibold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Mouad ZR</span>
                </motion.p>

                <motion.div
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  <motion.div
                    className="h-2 w-2 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-sm font-medium text-emerald-300">الإصدار 1.0.0</span>
                  <span className="text-xs text-emerald-400/60">(Stable Demo)</span>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FeatureSwiper />
            </motion.div>

            <motion.div
              className="rounded-2xl border border-white/5 p-4 shadow-sm mb-6"
              style={{ background: "rgba(5,15,30,0.7)", backdropFilter: "blur(16px)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="mb-4 text-lg font-bold text-white/90">المؤسسة</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Bus className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white/90">ETUS Khenchela</p>
                    <p className="text-sm text-white/40">مؤسسة النقل الحضري وشبه الحضري</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/3 p-4 text-center border border-white/5">
                  <p className="text-sm text-white/40">ولاية خنشلة - الجزائر</p>
                  <p className="mt-1 text-xs text-white/25">جميع الحقوق محفوظة 2024 - 2025</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="mb-4 flex flex-col items-center gap-2 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs text-white/20 tracking-wide">سياسة الخصوصية</p>
              <motion.a
                href="mailto:dev.mouad.zr@gmail.com"
                className="text-xs text-white/30 transition-all"
                whileHover={{
                  color: "rgba(52,211,153,0.9)",
                  textShadow: "0 0 12px rgba(16,185,129,0.6)",
                }}
              >
                dev.mouad.zr@gmail.com
              </motion.a>
            </motion.div>
          </div>
        </div>

        <BottomNav />
      </main>
    </PageTransition>
  )
}
