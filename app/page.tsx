"use client"

import { AppHeader } from "@/components/app-header"
import { MapSection } from "@/components/map-section"
import { StationsList } from "@/components/stations-list"
import { BottomNav } from "@/components/bottom-nav"
import { AppWrapper } from "@/components/app-wrapper"
import { PageTransition } from "@/components/page-transition"
import { DriverDashboard } from "@/components/driver-dashboard"
import { HomeBackground } from "@/components/home-background"
import { useDriverMode } from "@/lib/driver-mode-context"
import { useState, useEffect } from "react"

function HomeContent() {
  const { isDriverMode } = useDriverMode()
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

  // Listen for fullscreen state changes from MapSection
  useEffect(() => {
    const handleFullscreenChange = (e: any) => {
      setIsMapFullscreen(e.detail?.isFullscreen || false)
    }
    window.addEventListener("mapFullscreenChange", handleFullscreenChange)
    return () => window.removeEventListener("mapFullscreenChange", handleFullscreenChange)
  }, [])

  if (isDriverMode) {
    return <DriverDashboard />
  }

  return (
    <PageTransition>
      <main className={`relative ${isMapFullscreen ? "h-screen overflow-hidden" : "min-h-screen pb-safe"} bg-background`}>
        {/* Animated Background */}
        {!isMapFullscreen && <HomeBackground />}
        
        {/* Content */}
        <div className="relative z-10">
          {!isMapFullscreen && <AppHeader />}

          <div className={isMapFullscreen ? "h-screen w-full" : "w-full pt-16 sm:pt-20"}>
            <MapSection />
          </div>

          {!isMapFullscreen && (
            <>
              <StationsList />
              <BottomNav />
            </>
          )}
        </div>
      </main>
    </PageTransition>
  )
}

export default function Home() {
  return (
    <AppWrapper>
      <HomeContent />
    </AppWrapper>
  )
}
