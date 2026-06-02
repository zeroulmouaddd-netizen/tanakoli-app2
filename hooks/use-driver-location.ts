'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getDatabase, ref, set, onDisconnect } from 'firebase/database'
import { useAuth } from '@/lib/auth-context'
import { useDriverMode } from '@/lib/driver-mode-context'
import { AUTHORIZED_DRIVER_PHONES } from '@/lib/driver-config'

interface DriverLocation {
  lat: number
  lng: number
  timestamp?: number
}

export function useDriverLocation() {
  const { currentUser } = useAuth()
  const { isDriverMode } = useDriverMode()
  const watchIdRef = useRef<number | null>(null)
  const geoPermissionRef = useRef<boolean>(false)
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastLocationRef = useRef<DriverLocation | null>(null)

  const stopTracking = useCallback(() => {
    console.log('[v0] Stopping location tracking')
    
    // Clear watch position
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    // Clear send interval
    if (sendIntervalRef.current !== null) {
      clearInterval(sendIntervalRef.current)
      sendIntervalRef.current = null
    }

    geoPermissionRef.current = false
  }, [])

  const startTracking = useCallback(async () => {
    if (!currentUser?.phoneNumber) {
      console.log('[v0] No current user')
      return
    }

    // Verify this is an authorized driver phone
    if (!AUTHORIZED_DRIVER_PHONES.has(currentUser.phoneNumber)) {
      console.log('[v0] User is not an authorized driver')
      return
    }

    if (!navigator.geolocation) {
      console.error('[v0] Geolocation not supported')
      return
    }

    if (watchIdRef.current !== null) {
      console.log('[v0] Location tracking already active')
      return
    }

    console.log('[v0] Starting location tracking for driver:', currentUser.phoneNumber)

    try {
      // Request permission and start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          lastLocationRef.current = {
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
          }
          console.log('[v0] Location updated:', { lat: latitude, lng: longitude })
        },
        (error) => {
          console.error('[v0] Geolocation error:', error.message)
          if (error.code === error.PERMISSION_DENIED) {
            console.log('[v0] Geolocation permission denied')
            geoPermissionRef.current = false
            stopTracking()
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )

      geoPermissionRef.current = true

      // Send location to Firebase every 5 seconds
      if (sendIntervalRef.current === null) {
        sendIntervalRef.current = setInterval(async () => {
          if (!lastLocationRef.current) return

          try {
            const database = getDatabase()
            // Convert phone number to doc ID format (0775453629 from +213775453629)
            const driverId = currentUser.phoneNumber.startsWith('+213')
              ? '0' + currentUser.phoneNumber.slice(4)
              : currentUser.phoneNumber

            const locationRef = ref(database, `drivers/${driverId}/location`)
            await set(locationRef, {
              lat: lastLocationRef.current.lat,
              lng: lastLocationRef.current.lng,
              timestamp: lastLocationRef.current.timestamp,
            })
            console.log('[v0] Location sent to Firebase')
          } catch (error) {
            console.error('[v0] Error sending location to Firebase:', error)
          }
        }, 5000)
      }
    } catch (error) {
      console.error('[v0] Error starting location tracking:', error)
    }
  }, [currentUser, stopTracking])

  // Handle mode changes and user changes
  useEffect(() => {
    if (isDriverMode && currentUser?.phoneNumber) {
      startTracking()
    } else {
      stopTracking()
    }

    return () => {
      // Cleanup on unmount
      stopTracking()
    }
  }, [isDriverMode, currentUser, startTracking, stopTracking])

  // Stop tracking on app/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopTracking()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stopTracking])

  return {
    isTracking: geoPermissionRef.current && watchIdRef.current !== null,
    lastLocation: lastLocationRef.current,
  }
}
