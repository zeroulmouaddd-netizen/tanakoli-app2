"use client"

import { AppHeader } from "@/components/app-header"
import { MapSection } from "@/components/map-section"
import { StationsList } from "@/components/stations-list"
import { BottomNav } from "@/components/bottom-nav"
import { AppWrapper } from "@/components/app-wrapper"
import { PageTransition } from "@/components/page-transition"
import { DriverDashboard } from "@/components/driver-dashboard"
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
      <main className={`${isMapFullscreen ? "h-screen overflow-hidden" : "min-h-screen pb-safe"} bg-background`}>
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
