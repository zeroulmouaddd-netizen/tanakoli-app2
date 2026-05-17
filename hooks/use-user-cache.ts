"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"

interface UserData {
  fullName: string
  email: string
  address: string
  Phone: string
  balance: number
  role?: "driver" | "passenger" | string
}

const CACHE_KEY = "tanoukli_user_cache"
const USER_DOC_ID = "0775453629"

// Get cached data instantly from localStorage
function getCachedUserData(): UserData | null {
  if (typeof window === "undefined") return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Cache valid for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data as UserData
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null
}

// Save data to cache
function setCachedUserData(data: UserData) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch {
    // Ignore cache errors
  }
}

// Clear cache on logout
export function clearUserCache() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore errors
  }
}

export function useUserCache() {
  // Initialize with cached data for instant display
  const [userData, setUserData] = useState<UserData | null>(() => getCachedUserData())
  const [isLoading, setIsLoading] = useState(!getCachedUserData())
  const [isLoggedIn, setIsLoggedIn] = useState(!!getCachedUserData())

  useEffect(() => {
    const userDocRef = doc(db, "users", USER_DOC_ID)
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserData
          setUserData(data)
          setIsLoggedIn(true)
          // Update cache with fresh data
          setCachedUserData(data)
        } else {
          setUserData(null)
          setIsLoggedIn(false)
        }
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching user data:", error)
        // Keep showing cached data on error
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const refreshCache = useCallback(() => {
    // Force refresh by clearing cache timestamp
    if (userData) {
      setCachedUserData(userData)
    }
  }, [userData])

  return {
    userData,
    isLoading,
    isLoggedIn,
    refreshCache,
    clearCache: clearUserCache
  }
}
