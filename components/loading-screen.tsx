"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Bus } from "lucide-react"

// Steam particle component
function SteamParticle({ delay, index }: { delay: number; index: number }) {
  return (
    <motion.div
      key={index}
      className="absolute w-2 h-2 rounded-full bg-emerald-400/60"
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        x: (Math.random() - 0.5) * 60,
        y: -80,
        opacity: 0,
        scale: 0,
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 0.5,
      }}
    />
  )
}

export function LoadingScreen() {
  const router = useRouter()

  // Auto-redirect after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/")
    }, 2500)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Static Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Subtle radial gradient accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-blue-900/20" />
        {/* Static gradient orbs */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Content Container */}
      <div 
        className="relative z-10 flex flex-col items-center gap-12"
        style={{ transform: "translateZ(0)" }}
      >
        
        {/* Animated Bus with Steam Particles */}
        <motion.div
          className="relative h-32 w-32"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Spinning bus icon */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Bus className="h-16 w-16 text-emerald-400" strokeWidth={1.5} />
          </motion.div>

          {/* Steam particles container */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-24">
            <SteamParticle delay={0} index={0} />
            <SteamParticle delay={0.2} index={1} />
            <SteamParticle delay={0.4} index={2} />
            <SteamParticle delay={0.6} index={3} />
            <SteamParticle delay={0.8} index={4} />
          </div>

          {/* Animated glow around bus */}
          <motion.div
            className="absolute -inset-6 rounded-full"
            animate={{
              boxShadow: [
                "0 0 15px rgba(16,185,129,0.2), 0 0 30px rgba(59,130,246,0.1)",
                "0 0 25px rgba(16,185,129,0.4), 0 0 50px rgba(59,130,246,0.2)",
                "0 0 15px rgba(16,185,129,0.2), 0 0 30px rgba(59,130,246,0.1)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ pointerEvents: "none" }}
          />
        </motion.div>

        {/* Loading Text with fade in animation */}
        <motion.p
          className="text-lg font-medium text-emerald-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          جاري التحميل...
        </motion.p>
      </div>
    </div>
  )
}
