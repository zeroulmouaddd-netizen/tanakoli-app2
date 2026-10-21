"use client"

import { useCallback, useEffect, useState, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { MapSkeleton } from "./skeleton-loader"
import { useTracking } from "@/lib/tracking-context"
import { useDemoMode } from "@/lib/demo-mode-context"
import { Navigation, X, Maximize2, Minimize2 } from "lucide-react"
import { signalMapReady } from "./app-wrapper"

const LeafletMap = dynamic(
  () => import("./maplibre-map"),
  { ssr: false }
)

export function MapSection() {
  const [isMounted, setIsMounted] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapId = useId()
  const { trackingState, stopTracking } = useTracking()
  const { isActive: isDemoActive, step: demoStep, setHomeMapReady } = useDemoMode()

  const handleMapReady = useCallback(() => {
    setIsMapReady(true)
    signalMapReady()
    setHomeMapReady(true)
  }, [setHomeMapReady])

  useEffect(() => {
    setIsMounted(true)
    setHomeMapReady(false)
    return () => setHomeMapReady(false)
  }, [setHomeMapReady])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mapFullscreenChange", { detail: { isFullscreen } }))
  }, [isFullscreen])

  useEffect(() => {
    if (!isDemoActive || demoStep === null) {
      if (!isDemoActive) setIsFullscreen(false)
      return
    }
    setIsFullscreen(demoStep < 4)
  }, [isDemoActive, demoStep])

  const handleFullscreen = () => {
    setIsFullscreen((current) => !current)
  }

  if (!isMounted) {
    return <MapSkeleton />
  }

  return (
    <>
      <motion.div
        className={`map-section-motion relative w-full overflow-hidden ${
          isFullscreen 
            ? "fixed inset-0 z-[9998] rounded-none" 
            : "rounded-b-2xl sm:rounded-b-3xl"
        }`}
        style={isFullscreen ? { height: "100dvh" } : { height: "clamp(192px, 30vw, 384px)" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        transformTemplate={({ y = 0 }) => `translate3d(0, ${y}px, 0)`}
      >
        {/* Map container — always rendered so Leaflet/MapLibre can measure dimensions */}
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <LeafletMap 
            key={mapId} 
            trackingLineId={trackingState.busLineId}
            isFullscreen={isFullscreen}
            demoStep={isDemoActive ? demoStep : null}
            onReady={handleMapReady}
          />
        </div>

        {isDemoActive && demoStep === 1 && (
          <motion.div
            className="demo-map-anchor"
            data-demo-target="map-overview"
            style={{ left: "54%", top: "52%" }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transformTemplate={({ scale = 1 }) => `translate3d(0, 0, 0) scale(${scale})`}
            aria-hidden="true"
          />
        )}
        {isDemoActive && demoStep === 2 && (
          <motion.div
            className="demo-map-anchor demo-map-anchor--live"
            data-demo-target="live-bus-fallback"
            style={{ left: "52%", top: "54%" }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transformTemplate={({ scale = 1 }) => `translate3d(0, 0, 0) scale(${scale})`}
            aria-hidden="true"
          />
        )}

        {/* Loading overlay — sits above the map, fades out when ready */}
        <AnimatePresence>
          {!isMapReady && (
            <motion.div
              key="loading"
              className="map-overlay-motion absolute inset-0 flex items-center justify-center"
              style={{ background: "hsl(var(--background))", zIndex: 10 }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className="map-overlay-motion h-10 w-10 rounded-full border-3 border-primary/30 border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  transformTemplate={({ rotate = 0 }) => `translate3d(0, 0, 0) rotate(${rotate}deg)`}
                />
                <span className="text-xs text-muted-foreground">جاري تحميل الخريطة...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Fullscreen Toggle Button */}
        <motion.button
          onClick={handleFullscreen}
          disabled={isDemoActive}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          transformTemplate={({ scale = 1 }) => `translate3d(0, 0, 0) scale(${scale})`}
          className={`map-overlay-motion absolute top-3 sm:top-4 left-3 sm:left-4 z-[1001] flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg bg-card/80 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card${isDemoActive ? "" : " transition-colors"} disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={isFullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 sm:h-5 w-4 sm:w-5 text-foreground" />
          ) : (
            <Maximize2 className="h-4 sm:h-5 w-4 sm:w-5 text-foreground" />
          )}
        </motion.button>
        
        {/* Live Tracking Indicator */}
        <AnimatePresence>
          {trackingState.isTracking && !isDemoActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transformTemplate={({ y = 0 }) => `translate3d(0, ${y}px, 0)`}
              className="map-overlay-motion absolute right-3 sm:right-4 top-3 sm:top-4 z-[1000] flex items-center gap-2 rounded-full bg-primary px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg text-xs sm:text-sm"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                transformTemplate={({ scale = 1 }) => `translate3d(0, 0, 0) scale(${scale})`}
                className="map-overlay-motion flex h-2 w-2 items-center justify-center"
              >
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              </motion.div>
              <Navigation className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary-foreground" />
              <span className="text-xs sm:text-xs font-semibold text-primary-foreground truncate max-w-[120px] sm:max-w-none">
                {trackingState.busLineName}
              </span>
              <button
                onClick={stopTracking}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground transition-colors hover:bg-primary-foreground/30 flex-shrink-0"
                aria-label="إيقاف التتبع"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Location badge with animation */}
        <motion.div
          className="map-overlay-motion absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-[1000] rounded-full bg-card/95 border border-border/50 px-2 sm:px-3 py-1 text-xs font-medium text-foreground shadow-md backdrop-blur-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          transformTemplate={({ x = 0 }) => `translate3d(${x}px, 0, 0)`}
        >
          خنشلة، الجزائر
        </motion.div>
      </motion.div>

      {/* Fullscreen overlay backdrop */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            className="map-overlay-motion fixed inset-0 z-[9997] bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFullscreen(false)}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
