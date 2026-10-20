"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { rtdb } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { Bidi } from "@/components/admin-bidi"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import { Users, Bus, MapPin } from "lucide-react"

interface DriverLocation {
  lat: number
  lng: number
  timestamp?: number
}

interface Driver {
  phone: string
  location: DriverLocation
}

interface AdminDriverListProps {
  onDriverSelect?: (driverPhone: string) => void
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Deterministic avatar gradient derived from the phone number (visual only). */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)",
]
function avatarGradient(phone: string) {
  let h = 0
  for (let i = 0; i < phone.length; i++) h = (h * 31 + phone.charCodeAt(i)) % 997
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

const FRESH_MS = 5 * 60 * 1000

export function AdminDriverMap({ onDriverSelect }: AdminDriverListProps) {
  const { t, formatTimeOfDay } = useAdminI18n()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const reduced = useReducedMotion()

  useEffect(() => {
    // Subscribe to driver locations from Firebase Realtime Database
    const driversRef = ref(rtdb, "drivers")

    const unsubscribe = onValue(
      driversRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setDrivers([])
          setIsLoading(false)
          return
        }

        const driversData = snapshot.val()
        const driversList: Driver[] = []

        // Process drivers data - read from drivers/{phone}/location
        for (const [phone, driverData] of Object.entries(driversData)) {
          const data = driverData as any
          if (data.location && typeof data.location === "object") {
            driversList.push({
              phone,
              location: data.location,
            })
          }
        }

        setDrivers(driversList)
        setIsLoading(false)
      },
      (error) => {
        console.error("[v0] Error fetching driver locations:", error)
        setIsLoading(false)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return t("common.na")
    return formatTimeOfDay(timestamp)
  }

  return (
    <div className="admin-card p-4 sm:p-5">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        <span
          className="admin-icon-badge"
          style={
            {
              "--badge-bg": "rgba(96,165,250,0.12)",
              "--badge-border": "rgba(96,165,250,0.3)",
              "--badge-color": "#60a5fa",
            } as React.CSSProperties
          }
        >
          <Users className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <h3 className="text-[15px] font-bold tracking-tight text-[var(--admin-text)] sm:text-base">
          {t("drivers.title")} (<Bidi>{drivers.length}</Bidi>)
        </h3>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3.5 rounded-[14px] border border-[var(--admin-border)] p-3.5">
              <div className="admin-skeleton h-11 w-11 flex-shrink-0 rounded-[12px]" />
              <div className="flex-1 space-y-2">
                <div className="admin-skeleton h-3.5 w-32" />
                <div className="admin-skeleton h-3 w-48 max-w-full" />
              </div>
              <div className="admin-skeleton h-8 w-20 rounded-[10px]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && drivers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--admin-border-strong)] bg-[rgba(148,163,184,0.03)] px-6 py-12 text-center">
          <span
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "rgba(96,165,250,0.1)",
              border: "1px solid rgba(96,165,250,0.25)",
            }}
          >
            <MapPin className="h-6 w-6 text-[#60a5fa]" />
          </span>
          <p className="text-sm font-medium text-[var(--admin-text-2)]">
            {t("drivers.empty")}
          </p>
        </div>
      )}

      {/* Driver cards */}
      {!isLoading && drivers.length > 0 && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {drivers.map((driver, i) => {
            const isFresh =
              !!driver.location.timestamp && Date.now() - driver.location.timestamp < FRESH_MS
            return (
              <motion.div
                key={driver.phone}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
                className="group flex items-center gap-3.5 rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3.5 transition-all duration-200 hover:-translate-y-[1px] hover:border-[rgba(16,185,129,0.4)] hover:bg-[rgba(16,185,129,0.05)] hover:shadow-[0_10px_28px_-14px_var(--admin-glow)]"
              >
                {/* Avatar */}
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/15 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                  style={{ background: avatarGradient(driver.phone) }}
                >
                  <Bus className="h-5 w-5 text-white/90" strokeWidth={2} />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Bidi className="admin-num truncate text-[14px] font-semibold tracking-wide text-[var(--admin-text)]">
                      {driver.phone}
                    </Bidi>
                    <span
                      className={`live-dot ${isFresh ? "" : "live-dot-idle"}`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="admin-num mt-1 flex items-center gap-1.5 text-[11px] text-[var(--admin-text-3)]">
                    <MapPin className="h-3 w-3 flex-shrink-0 opacity-70" />
                    <span className="truncate">
                      {t("drivers.lat")} <Bidi>{driver.location.lat.toFixed(6)}</Bidi>
                      {" · "}
                      {t("drivers.lng")} <Bidi>{driver.location.lng.toFixed(6)}</Bidi>
                    </span>
                  </p>
                  <p className="admin-num mt-0.5 text-[11px] text-[var(--admin-text-3)]">
                    {formatTime(driver.location.timestamp)}
                  </p>
                </div>

                {/* Action */}
                {onDriverSelect && (
                  <button
                    onClick={() => onDriverSelect(driver.phone)}
                    className="admin-btn-ghost rounded-[10px] px-3.5 text-[12px]"
                  >
                    {t("drivers.select")}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
