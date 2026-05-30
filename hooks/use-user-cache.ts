"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"

interface UserData {
  fullName: string
  email: string
  address: string
  Phone: string
  balance: number
  role?: "driver" | "passenger" | string
}

const CACHE_KEY = "tanoukli_user_cache"

function getCachedUserData(): UserData | null {
  if (typeof window === "undefined") return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data as UserData
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null
}

function setCachedUserData(data: UserData) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Ignore cache errors
  }
}

export function clearUserCache() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem("tanoukli_trips_cache")
    localStorage.removeItem("tanoukli_transactions_cache")
    localStorage.removeItem("tanoukli_driver_mode")
  } catch {
    // Ignore errors
  }
}

export function useUserCache() {
  const { currentUser, firestoreUserId, isAuthLoading } = useAuth()

  const [userData, setUserData] = useState<UserData | null>(() =>
    firestoreUserId ? getCachedUserData() : null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (isAuthLoading) return

    if (!firestoreUserId) {
      setUserData(null)
      setIsLoggedIn(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const userDocRef = doc(db, "users", firestoreUserId)

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserData
          setUserData(data)
          setCachedUserData(data)
        } else {
          setUserData(null)
        }
        setIsLoggedIn(true)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching user data:", error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [firestoreUserId, isAuthLoading])

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      setUserData(null)
      setIsLoggedIn(false)
    }
  }, [currentUser, isAuthLoading])

  const refreshCache = useCallback(() => {
    if (userData) setCachedUserData(userData)
  }, [userData])

  return {
    userData,
    isLoading: isAuthLoading || isLoading,
    isLoggedIn,
    refreshCache,
    clearCache: clearUserCache,
  }
}
