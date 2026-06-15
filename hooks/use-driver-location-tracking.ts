"use client"

import { useEffect, useRef, useCallback } from "react"
import { rtdb } from "@/lib/firebase"
import { ref, set } from "firebase/database"

interface DriverLocation {
  lat: number
  lng: number
}

export function useDriverLocationTracking(
  driverPhone: string | null,
  isDriverMode: boolean,
  isLiveTracking: boolean
) {
  const watchIdRef = useRef<number | null>(null)
  const isTrackingRef = useRef(false)
  const lastLocationRef = useRef<DriverLocation | null>(null)

  const getDriverPath = useCallback((phone: string) => {
    if (phone.startsWith("+213")) {
      return "0" + phone.slice(4)
    }
    return phone
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const newLocation: DriverLocation = { lat: latitude, lng: longitude }

        if (
          !lastLocationRef.current ||
          Math.abs(lastLocationRef.current.lat - latitude) > 0.00001 ||
          Math.abs(lastLocationRef.current.lng - longitude) > 0.00001
        ) {
          lastLocationRef.current = newLocation
          try {
            const driverPath = getDriverPath(driverPhone!)
            const locationRef = ref(rtdb, `drivers/${driverPath}/location`)
            await set(locationRef, newLocation)
          } catch (error) {
            console.error("[tracking] Failed to update location:", error)
          }
        }
      },
      (error) => {
        console.error("[tracking] Watch position error:", error.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [driverPhone, getDriverPath])

  const startTracking = useCallback(async () => {
    if (!driverPhone || !isDriverMode || !isLiveTracking || isTrackingRef.current) return

    isTrackingRef.current = true

    if (!navigator.geolocation) {
      console.error("[tracking] Geolocation not supported")
      isTrackingRef.current = false
      return
    }

    navigator.geolocation.getCurrentPosition(
      () => { startWatching() },
      (error) => {
        console.error("[tracking] Permission denied:", error.message)
        isTrackingRef.current = false
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [driverPhone, isDriverMode, isLiveTracking, startWatching])

  // Stop the GPS watcher.
  // clearLocation=true  → also null out the RTDB entry (driver exited mode entirely)
  // clearLocation=false → keep last location in RTDB (driver toggled off, but still in driver mode)
  const stopTracking = useCallback(async (clearLocation = true) => {
    isTrackingRef.current = false

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (clearLocation && driverPhone) {
      try {
        const driverPath = getDriverPath(driverPhone)
        const locationRef = ref(rtdb, `drivers/${driverPath}/location`)
        await set(locationRef, null)
      } catch (error) {
        console.error("[tracking] Failed to clear location:", error)
      }
      lastLocationRef.current = null
    }
    // When clearLocation=false: last known coords stay in RTDB → marker stays on map
  }, [driverPhone, getDriverPath])

  useEffect(() => {
    if (isDriverMode && driverPhone && isLiveTracking) {
      startTracking()
    } else if (isDriverMode && driverPhone && !isLiveTracking) {
      // Driver is still in driver mode but toggled tracking off — keep last location
      stopTracking(false)
    } else {
      // Driver exited mode entirely — clear the marker
      stopTracking(true)
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isDriverMode, driverPhone, isLiveTracking, startTracking, stopTracking])

  return { startTracking, stopTracking }
}
