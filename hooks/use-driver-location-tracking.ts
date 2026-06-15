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

  // Starts the continuous GPS watcher. Idempotent via watchIdRef guard.
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

  // Requests permission then starts the watcher.
  // Does NOT close over isDriverMode/isLiveTracking — the useEffect gates those.
  // Only guards against a concurrent in-flight start (isTrackingRef).
  const startTracking = useCallback(async () => {
    if (!driverPhone || isTrackingRef.current) return

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
  }, [driverPhone, startWatching]) // ← no isDriverMode/isLiveTracking: avoids needless recreation

  // Clears the watcher.
  // clearLocation=true  → null the RTDB entry (driver fully exited)
  // clearLocation=false → keep last coords in RTDB (toggle OFF — marker stays on map)
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
  }, [driverPhone, getDriverPath])

  useEffect(() => {
    if (isDriverMode && driverPhone && isLiveTracking) {
      startTracking()
    } else if (isDriverMode && driverPhone && !isLiveTracking) {
      stopTracking(false) // pause — keep last location on map
    } else {
      stopTracking(true)  // exit — remove marker
    }

    return () => {
      // Reset isTrackingRef so the next effect run can call startTracking freely.
      // watchIdRef is also cleared so startWatching can open a new watcher.
      isTrackingRef.current = false
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isDriverMode, driverPhone, isLiveTracking, startTracking, stopTracking])

  return { startTracking, stopTracking }
}
