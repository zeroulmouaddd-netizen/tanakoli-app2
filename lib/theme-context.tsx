"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"

type Theme = "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  // Initialize theme - always dark
  useEffect(() => {
    setMounted(true)
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add("dark")
  }, [])

  // No-op functions since theme is locked to dark
  const toggleTheme = useCallback(() => {
    // Theme toggle is disabled
  }, [])

  const setTheme = useCallback(() => {
    // Theme setting is disabled
  }, [])

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "dark", toggleTheme: () => {}, setTheme: () => {}, isDark: true }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
