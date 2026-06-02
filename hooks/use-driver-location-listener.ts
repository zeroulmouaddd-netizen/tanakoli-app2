'use client'

import { useEffect, useState } from 'react'
import { getDatabase, ref, onValue, off } from 'firebase/database'

interface DriverLocationData {
  lat: number
  lng: number
  timestamp?: number
}

export function useDriverLocationListener(driverId: string) {
  const [location, setLocation] = useState<DriverLocationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!driverId) {
      setLocation(null)
      setIsLoading(false)
      return
    }

    try {
      const database = getDatabase()
      const locationRef = ref(database, `drivers/${driverId}/location`)

      // Start listening for location updates
      const unsubscribe = onValue(
        locationRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val() as DriverLocationData
            setLocation(data)
            console.log('[v0] Driver location received:', data)
          } else {
            setLocation(null)
          }
          setIsLoading(false)
          setError(null)
        },
        (error) => {
          console.error('[v0] Error listening to driver location:', error)
          setError(error.message)
          setIsLoading(false)
        }
      )

      return () => {
        off(locationRef)
        unsubscribe()
      }
    } catch (err) {
      console.error('[v0] Error setting up location listener:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsLoading(false)
    }
  }, [driverId])

  return { location, isLoading, error }
}
