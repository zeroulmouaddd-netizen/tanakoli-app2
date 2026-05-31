"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

// City silhouette pattern for background
function CitySilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="cityGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* City buildings silhouette */}
      <path
        d="M0 200 L0 160 L30 160 L30 140 L50 140 L50 120 L70 120 L70 160 L100 160 L100 100 L120 100 L120 80 L140 80 L140 100 L160 100 L160 140 L200 140 L200 90 L220 90 L220 70 L240 70 L240 90 L260 90 L260 120 L300 120 L300 60 L320 60 L320 40 L340 40 L340 60 L360 60 L360 100 L400 100 L400 130 L450 130 L450 80 L470 80 L470 50 L490 50 L490 30 L510 30 L510 50 L530 50 L530 80 L550 80 L550 110 L600 110 L600 70 L620 70 L620 90 L640 90 L640 130 L700 130 L700 100 L720 100 L720 60 L740 60 L740 40 L760 40 L760 60 L780 60 L780 90 L820 90 L820 140 L860 140 L860 110 L880 110 L880 80 L900 80 L900 60 L920 60 L920 80 L940 80 L940 120 L1000 120 L1000 90 L1020 90 L1020 70 L1040 70 L1040 90 L1060 90 L1060 140 L1100 140 L1100 100 L1120 100 L1120 130 L1160 130 L1160 160 L1200 160 L1200 200 Z"
        fill="url(#cityGradient)"
      />
      {/* Aurès mountains in background */}
      <path
        d="M0 200 L100 180 L200 150 L350 120 L450 140 L550 90 L650 110 L750 70 L850 100 L950 130 L1050 110 L1150 150 L1200 170 L1200 200 Z"
        fill="url(#cityGradient)"
        opacity="0.5"
      />
    </svg>
  )
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [showButton, setShowButton] = useState(false)

  // Show button after initial animations complete
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        // GPU acceleration for smooth rendering
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Static Background - no animations */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Subtle radial gradient accent - static */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-blue-900/20" />
        {/* Static gradient orbs - no animation */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        {/* City silhouette at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-48 opacity-60">
          <CitySilhouette className="h-full w-full" />
        </div>
      </div>

      {/* Content Container with GPU acceleration */}
      <div 
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
        style={{ transform: "translateZ(0)" }}
      >
        
        {/* Main Logo - single fade-in animation */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Static glow ring - no animation */}
          <div
            className="absolute -inset-8 rounded-full opacity-60"
            style={{
              background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(59,130,246,0.3) 40%, transparent 70%)"
            }}
          />
          
          {/* Logo container with image masking */}
          <div
            className="relative flex h-56 w-56 items-center justify-center overflow-hidden border border-white/20 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl flex-shrink-0"
            style={{
              borderRadius: "40px",
              boxShadow: "0 8px 32px rgba(16,185,129,0.2), 0 0 60px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
            }}
          >
            <Image
              src="/tanakoli-logo.png"
              alt="تنقلي خنشلة"
              width={224}
              height={224}
              className="w-full h-full object-cover"
              style={{ borderRadius: "40px" }}
              priority
            />
          </div>
        </motion.div>

        {/* App Name - single fade-in */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          style={{ textRendering: "optimizeLegibility" }}
        >
          <h1 className="bg-gradient-to-r from-emerald-300 via-white to-blue-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent drop-shadow-lg">
            تنقلي خنشلة
          </h1>
          <p className="text-xl font-medium tracking-wide text-white/80">
            Tanakoli Khenchela
          </p>
        </motion.div>

        {/* Tagline - single fade-in */}
        <motion.div
          className="max-w-sm space-y-1"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
          style={{ textRendering: "optimizeLegibility" }}
        >
          <p className="text-lg font-medium text-white/90">
            مدينتك، نقلك. لنبدأ الرحلة!
          </p>
          <p className="text-sm text-emerald-300/80">
            Your city, your transport. Let's begin!
          </p>
        </motion.div>

        {/* Get Started Button - Fixed size, single fade-in, no looping animations */}
        <motion.button
          onClick={onComplete}
          className="relative mt-6 flex h-14 w-52 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 text-lg font-bold text-white shadow-2xl transition-transform duration-200 hover:scale-105 active:scale-95"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: showButton ? 1 : 0, 
            y: showButton ? 0 : 20,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            // Fixed dimensions to prevent layout shift
            minWidth: "208px",
            minHeight: "56px",
            textRendering: "optimizeLegibility",
            transform: "translateZ(0)",
          }}
        >
          {/* Static glow - no animation */}
          <div
            className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-400/30 via-teal-400/30 to-blue-400/30 blur-xl"
          />
          <span 
            className="relative z-10 flex items-center gap-3 text-xl"
            style={{ textRendering: "optimizeLegibility" }}
          >
            ابدأ الآن
            <svg 
              className="h-6 w-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M13 7l5 5m0 0l-5 5m5-5H6" 
              />
            </svg>
          </span>
        </motion.button>
      </div>

      {/* Footer - single fade-in */}
      <motion.div
        className="absolute bottom-8 z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        style={{ textRendering: "optimizeLegibility" }}
      >
        <p className="text-sm text-white/50">ETUS Khenchela</p>
        <p className="mt-1 text-xs text-white/30">مؤسسة النقل الحضري</p>
      </motion.div>
    </div>
  )
}
