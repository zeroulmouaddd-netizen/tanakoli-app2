"use client"

import { useEffect, useRef, useCallback } from "react"
import { rtdb } from "@/lib/firebase"
import { ref, set } from "firebase/database"

interface DriverLocation {
  lat: number
  lng: number
}

export function useDriverLocationTracking(driverPhone: string | null, isDriverMode: boolean) {
  const watchIdRef = useRef<number | null>(null)
  const isTrackingRef = useRef(false)
  const lastLocationRef = useRef<DriverLocation | null>(null)
  const locationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Convert phone number to doc ID format for Firebase path
  const getDriverPath = useCallback((phone: string) => {
    // Phone format: +213XXXXXXXXX -> convert to 0XXXXXXXXX for Firebase path
    if (phone.startsWith("+213")) {
      return "0" + phone.slice(4)
    }
    return phone
  }, [])

  // Start location tracking
  const startTracking = useCallback(async () => {
    if (!driverPhone || !isDriverMode || isTrackingRef.current) return

    console.log("[v0] Starting driver location tracking")
    isTrackingRef.current = true

    try {
      // Check geolocation support
      if (!navigator.geolocation) {
        console.error("[v0] Geolocation not supported")
        return
      }

      // First, request permission explicitly with getCurrentPosition
      console.log("[v0] Requesting geolocation permission from user")
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("[v0] Initial position obtained, now starting continuous tracking")
          // Initial position obtained, now start watching
          startWatching()
        },
        (error) => {
          console.error("[v0] Permission denied or geolocation error:", error.message)
          isTrackingRef.current = false
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    } catch (error) {
      console.error("[v0] Error starting location tracking:", error)
      isTrackingRef.current = false
    }
  }, [driverPhone, isDriverMode, getDriverPath])

  // Watch position for continuous tracking
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        const newLocation: DriverLocation = {
          lat: latitude,
          lng: longitude,
        }

        // Only update if location changed significantly (>~10m)
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
            console.log("[v0] Location updated:", newLocation)
          } catch (error) {
            console.error("[v0] Failed to update location in Firebase:", error)
          }
        }
      },
      (error) => {
        console.error("[v0] Watch position error:", error.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )

    console.log("[v0] Geolocation watch started, watch ID:", watchIdRef.current)
  }, [driverPhone, getDriverPath])

  // Stop location tracking
  const stopTracking = useCallback(async () => {
    console.log("[v0] Stopping driver location tracking")
    isTrackingRef.current = false

    // Clear watch position
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      console.log("[v0] Watch position cleared")
    }

    // Clear last known location from Firebase
    if (driverPhone) {
      try {
        const driverPath = getDriverPath(driverPhone)
        const locationRef = ref(rtdb, `drivers/${driverPath}/location`)
        await set(locationRef, null)
        console.log("[v0] Location cleared from Firebase")
      } catch (error) {
        console.error("[v0] Failed to clear location from Firebase:", error)
      }
    }

    lastLocationRef.current = null
  }, [driverPhone, getDriverPath])

  // Setup/teardown tracking based on driver mode
  useEffect(() => {
    if (isDriverMode && driverPhone) {
      startTracking()
    } else {
      stopTracking()
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [isDriverMode, driverPhone, startTracking, stopTracking])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (locationCheckIntervalRef.current) {
        clearInterval(locationCheckIntervalRef.current)
      }
    }
  }, [])

  return { startTracking, stopTracking }
}
