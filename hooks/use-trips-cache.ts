"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, limit, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"

export interface Trip {
  id: string
  ticketId: string
  amount: number
  timestamp: { seconds: number; nanoseconds: number } | null
  createdAt: string
  userId: string
}

const CACHE_KEY = "tanoukli_trips_cache"
const TRIPS_LIMIT = 20

function getCachedTrips(): Trip[] {
  if (typeof window === "undefined") return []
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < 2 * 60 * 1000) {
        return data as Trip[]
      }
    }
  } catch {
    // Ignore cache errors
  }
  return []
}

function setCachedTrips(trips: Trip[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: trips, timestamp: Date.now() }))
  } catch {
    // Ignore cache errors
  }
}

export function useTripsCache() {
  const { firestoreUserId, isAuthLoading } = useAuth()

  const [trips, setTrips] = useState<Trip[]>(() =>
    firestoreUserId ? getCachedTrips() : []
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthLoading) return

    if (!firestoreUserId) {
      setTrips([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const tripsCollectionRef = collection(db, "trips")
    const tripsQuery = query(
      tripsCollectionRef,
      where("userId", "==", firestoreUserId),
      limit(TRIPS_LIMIT * 2)
    )

    const unsubscribe = onSnapshot(
      tripsQuery,
      (snapshot) => {
        const tripsData: Trip[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ticketId: doc.data().ticketId,
          amount: doc.data().amount,
          timestamp: doc.data().timestamp,
          createdAt: doc.data().createdAt,
          userId: doc.data().userId,
        }))

        const sortedTrips = tripsData
          .sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0
            const timeB = b.timestamp?.seconds || 0
            return timeB - timeA
          })
          .slice(0, TRIPS_LIMIT)

        setTrips(sortedTrips)
        setCachedTrips(sortedTrips)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching trips:", error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [firestoreUserId, isAuthLoading])

  return { trips, isLoading }
}
