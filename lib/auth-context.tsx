"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  currentUser: User | null
  isAuthLoading: boolean
  firestoreUserId: string | null
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthLoading: true,
  firestoreUserId: null,
})

export function phoneToDocId(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null
  if (phoneNumber.startsWith("+213")) return "0" + phoneNumber.slice(4)
  return phoneNumber
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    let settled = false
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      settled = true
      setCurrentUser(user)
      setIsAuthLoading(false)
    })
    const fallback = setTimeout(() => {
      if (!settled) {
        setIsAuthLoading(false)
      }
    }, 5000)
    return () => {
      unsubscribe()
      clearTimeout(fallback)
    }
  }, [])

  const firestoreUserId = phoneToDocId(currentUser?.phoneNumber)

  return (
    <AuthContext.Provider value={{ currentUser, isAuthLoading, firestoreUserId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
