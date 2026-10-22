"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { useDriverMode } from "@/lib/driver-mode-context"
import { syncDriverOnlinePresence } from "@/hooks/use-driver-location-tracking"

interface TrackingState {
  isTracking: boolean
  busLineId: string | null
  busLineName: string | null
}

interface TrackingContextType {
  trackingState: TrackingState
  startTracking: (lineId: string, lineName: string) => void
  stopTracking: () => void
}

const TrackingContext = createContext<TrackingContextType | null>(null)

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { driverPhone, isAuthorizedDriver, isDriverMode, triggerLocationUpdate } = useDriverMode()
  const [trackingState, setTrackingState] = useState<TrackingState>({
    isTracking: false,
    busLineId: null,
    busLineName: null,
  })

  // Hydrate persisted tracking state on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = sessionStorage.getItem("trackingState")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.isTracking) {
          setTrackingState({
            isTracking: true,
            busLineId: parsed.busLineId || null,
            busLineName: parsed.busLineName || null,
          })
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const startTracking = useCallback((lineId: string, lineName: string) => {
    setTrackingState({
      isTracking: true,
      busLineId: lineId,
      busLineName: lineName,
    })
    // Store in sessionStorage for persistence across page navigations
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("trackingState", JSON.stringify({
          isTracking: true,
          busLineId: lineId,
          busLineName: lineName,
        }))
      } catch {}
    }

    // If the user is an authenticated driver, immediately sync activeRoute and GPS location
    if (driverPhone && (isAuthorizedDriver || isDriverMode)) {
      void syncDriverOnlinePresence(driverPhone, {
        activeRoute: lineName || lineId,
      })
      triggerLocationUpdate()
    }
  }, [driverPhone, isAuthorizedDriver, isDriverMode, triggerLocationUpdate])

  const stopTracking = useCallback(() => {
    setTrackingState({
      isTracking: false,
      busLineId: null,
      busLineName: null,
    })
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("trackingState")
      } catch {}
    }

    if (driverPhone && (isAuthorizedDriver || isDriverMode)) {
      void syncDriverOnlinePresence(driverPhone, {
        activeRoute: null,
      })
    }
  }, [driverPhone, isAuthorizedDriver, isDriverMode])

  return (
    <TrackingContext.Provider value={{ trackingState, startTracking, stopTracking }}>
      {children}
    </TrackingContext.Provider>
  )
}

export function useTracking() {
  const context = useContext(TrackingContext)
  if (!context) {
    throw new Error("useTracking must be used within a TrackingProvider")
  }
  return context
}
