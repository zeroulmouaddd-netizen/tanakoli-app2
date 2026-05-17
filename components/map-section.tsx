"use client"

import { useEffect, useState, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { MapSkeleton } from "./skeleton-loader"
import { useTracking } from "@/lib/tracking-context"
import { Navigation, X } from "lucide-react"
import { signalMapReady } from "./app-wrapper"

const LeafletMap = dynamic(
  () => import("./leaflet-map"),
  { ssr: false }
)

export function MapSection() {
  const [isMounted, setIsMounted] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const mapId = useId()
  const { trackingState, stopTracking } = useTracking()

  useEffect(() => {
    setIsMounted(true)
    // Simulate map loading with a slight delay for smoother transition
    const timer = setTimeout(() => {
      setIsMapReady(true)
      // Signal to AppWrapper that map is ready
      signalMapReady()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (!isMounted) {
    return <MapSkeleton />
  }

  return (
    <motion.div
      className="relative h-48 w-full overflow-hidden rounded-b-3xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Map container with fade-in */}
      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: isMapReady ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <LeafletMap 
          key={mapId} 
          trackingLineId={trackingState.busLineId} 
        />
      </motion.div>
      
      {/* Loading overlay */}
      {!isMapReady && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-primary/5"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className="h-10 w-10 rounded-full border-3 border-primary/30 border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-xs text-muted-foreground">جاري تحميل الخريطة...</span>
          </div>
        </motion.div>
      )}
      
      {/* Live Tracking Indicator */}
      <AnimatePresence>
        {trackingState.isTracking && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-2 top-2 z-[1000] flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 shadow-lg"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex h-2 w-2 items-center justify-center"
            >
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            </motion.div>
            <Navigation className="h-3.5 w-3.5 text-primary-foreground" />
            <span className="text-xs font-semibold text-primary-foreground">
              {trackingState.busLineName}
            </span>
            <button
              onClick={stopTracking}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground transition-colors hover:bg-primary-foreground/30"
              aria-label="إيقاف التتبع"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Location badge with animation */}
      <motion.div
        className="absolute bottom-2 left-2 z-[1000] rounded-full bg-card/95 dark:bg-slate-800/95 border border-border/50 px-3 py-1 text-xs font-medium text-foreground shadow-md backdrop-blur-sm"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        خنشلة، الجزائر
      </motion.div>
    </motion.div>
  )
}
