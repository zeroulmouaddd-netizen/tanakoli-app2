"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export function LoadingScreen() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  // Auto-redirect after 2-3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/")
    }, 2500)
    return () => clearTimeout(timer)
  }, [router])

  // Progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev
        return prev + Math.random() * 40
      })
    }, 300)
    return () => clearInterval(interval)
  }, [])

  // Complete progress bar when redirect happens
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100)
    }, 2300)
    return () => clearTimeout(timer)
  }, [])

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
        className="relative z-10 flex flex-col items-center gap-8"
        style={{ transform: "translateZ(0)" }}
      >
        
        {/* Logo with pulsing glow animation */}
        <motion.div
          className="relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute -inset-8 rounded-full"
            animate={{
              boxShadow: [
                "0 0 20px rgba(16,185,129,0.3), 0 0 40px rgba(59,130,246,0.2)",
                "0 0 30px rgba(16,185,129,0.5), 0 0 60px rgba(59,130,246,0.3)",
                "0 0 20px rgba(16,185,129,0.3), 0 0 40px rgba(59,130,246,0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ pointerEvents: "none" }}
          />
          
          {/* Logo container */}
          <div
            className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
            style={{
              boxShadow: "0 8px 32px rgba(16,185,129,0.2), 0 0 60px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
            }}
          >
            <img src="/logo.png" alt="Tanakoli Khenchela" className="h-36 w-36" />
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          className="w-64 h-1 bg-white/10 rounded-full overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </motion.div>

        {/* Loading Text */}
        <motion.p
          className="text-sm font-medium text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          جاري التحضير...
        </motion.p>
      </div>
    </div>
  )
}
