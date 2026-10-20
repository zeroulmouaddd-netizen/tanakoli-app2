"use client"

/**
 * Lightweight i18n layer for the Admin Dashboard (display only).
 *
 * - Default language: Arabic, persisted in localStorage.
 * - Sets <html lang/dir> while the admin area is mounted.
 * - Exposes `t()` for display strings and locale-aware date helpers.
 *
 * It never touches data, API values or business logic — internal values
 * (transaction types, statuses, notes, phone numbers, names) are rendered
 * as-is, only their *labels* come from the dictionary.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  ADMIN_LANG_STORAGE_KEY,
  ADMIN_LOCALES,
  DEFAULT_ADMIN_LANG,
  adminDictionaries,
  type AdminLang,
} from "./admin-dictionary"

// Layout effect on the client (applies the stored language before first paint),
// plain effect during SSR to avoid React's useLayoutEffect warning.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

export type AdminTranslationVars = Record<string, string | number | undefined>

/** Resolve a display string without React (used by the provider and helpers). */
export function translateAdmin(
  lang: AdminLang,
  key: string,
  vars?: AdminTranslationVars,
  fallback?: string
): string {
  const raw = adminDictionaries[lang]?.[key] ?? adminDictionaries.en[key] ?? fallback ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name])
  )
}

/** Normalise Firestore Timestamp / Date / number / ISO string into a Date. */
export function toDisplayDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date }
    if (typeof maybe.toDate !== "function") return null
    date = maybe.toDate()
  } else if (typeof value === "number" || typeof value === "string") {
    date = new Date(value)
  } else {
    return null
  }
  return Number.isNaN(date.getTime()) ? null : date
}

export interface AdminI18nContextValue {
  lang: AdminLang
  dir: "rtl" | "ltr"
  isRTL: boolean
  locale: string
  setLang: (lang: AdminLang) => void
  /** Display string lookup with optional {placeholders}. */
  t: (key: string, vars?: AdminTranslationVars, fallback?: string) => string
  /** Locale-aware date formatting (display only). */
  formatDateTime: (value: unknown, options: Intl.DateTimeFormatOptions, fallback?: string) => string
  /** Locale-aware time-of-day formatting (display only). */
  formatTimeOfDay: (value: unknown, fallback?: string) => string
  /** "Just now" / "5m ago" / "قبل 5 دقائق" (display only). */
  formatRelative: (value: unknown) => string
}

const AdminI18nContext = createContext<AdminI18nContextValue | undefined>(undefined)

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  // Same value on server and client for the first render (avoids hydration
  // mismatches); the stored preference is applied right after hydration.
  const [lang, setLangState] = useState<AdminLang>(DEFAULT_ADMIN_LANG)

  useIsomorphicLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_LANG_STORAGE_KEY)
      if (stored === "ar" || stored === "en") setLangState(stored)
    } catch {
      // localStorage unavailable — keep the default
    }
  }, [])

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(ADMIN_LANG_STORAGE_KEY, next)
    } catch {
      // ignore write failures
    }
  }, [])

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr"
  const locale = ADMIN_LOCALES[lang]

  // Reflect the language on <html> and in the tab title (document-level display
  // only — no app state, routing or data involved).
  useEffect(() => {
    const root = document.documentElement
    const previous = { lang: root.lang, dir: root.dir, title: document.title }
    root.lang = lang
    root.dir = dir
    document.title = translateAdmin(lang, "meta.title")
    return () => {
      root.lang = previous.lang
      root.dir = previous.dir
      document.title = previous.title
    }
  }, [lang, dir])

  const t = useCallback(
    (key: string, vars?: AdminTranslationVars, fallback?: string) =>
      translateAdmin(lang, key, vars, fallback),
    [lang]
  )

  const formatDateTime = useCallback(
    (value: unknown, options: Intl.DateTimeFormatOptions, fallback?: string) => {
      const date = toDisplayDate(value)
      if (!date) return fallback ?? translateAdmin(lang, "common.na")
      return new Intl.DateTimeFormat(locale, options).format(date)
    },
    [lang, locale]
  )

  const formatTimeOfDay = useCallback(
    (value: unknown, fallback?: string) => {
      const date = toDisplayDate(value)
      if (!date) return fallback ?? translateAdmin(lang, "common.na")
      return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date)
    },
    [lang, locale]
  )

  const formatRelative = useCallback(
    (value: unknown) => {
      const date = toDisplayDate(value)
      if (!date) return translateAdmin(lang, "common.na")
      const diff = Date.now() - date.getTime()

      if (diff < 60_000) return translateAdmin(lang, "time.justNow")
      if (diff < 3_600_000) {
        const minutes = Math.floor(diff / 60_000)
        return lang === "ar"
          ? new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-minutes, "minute")
          : `${minutes}m ago`
      }
      if (diff < 86_400_000) {
        const hours = Math.floor(diff / 3_600_000)
        return lang === "ar"
          ? new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-hours, "hour")
          : `${hours}h ago`
      }
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    },
    [lang, locale]
  )

  const value = useMemo<AdminI18nContextValue>(
    () => ({
      lang,
      dir,
      isRTL: dir === "rtl",
      locale,
      setLang,
      t,
      formatDateTime,
      formatTimeOfDay,
      formatRelative,
    }),
    [lang, dir, locale, setLang, t, formatDateTime, formatTimeOfDay, formatRelative]
  )

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>
}

export function useAdminI18n(): AdminI18nContextValue {
  const context = useContext(AdminI18nContext)
  if (!context) {
    throw new Error("useAdminI18n must be used within an AdminI18nProvider")
  }
  return context
}
