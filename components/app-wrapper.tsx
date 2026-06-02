"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { motion, AnimatePresence } from "framer-motion"

type AppState = "app"

// Context to allow logout from anywhere in the app
interface AppContextType {
  logout: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    return {
      logout: () => {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("splashShown")
          } catch {
            // Ignore
          }
          window.location.href = "/"
        }
      }
    }
  }
  return context
}

// Event to signal map is ready
const MAP_READY_EVENT = "mapReady"

export function signalMapReady() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MAP_READY_EVENT))
  }
}

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [appState] = useState<AppState>("app")

  // Logout function - clears session and returns to home
  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("splashShown")
      } catch {
        // Ignore storage errors
      }
      window.location.href = "/"
    }
  }, [])

  return (
    <AppContext.Provider value={{ logout: handleLogout }}>
      {children}
    </AppContext.Provider>
  )
}
