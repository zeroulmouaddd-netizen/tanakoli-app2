"use client"

/**
 * Admin Dashboard — "Active Drivers" section.
 *
 * Renders the dynamic real-time drivers feed from Firebase via
 * `subscribeActiveDrivers`, which merges:
 *   · Firestore `drivers` collection (`onSnapshot`)
 *   · Firestore `users` collection (`onSnapshot`)
 *   · Realtime Database `drivers/*` (`onValue` + `onDisconnect`)
 *
 * When a driver logs in or sends GPS updates, their status badge immediately
 * transitions from Idle to Active / Online (with a glowing green indicator)
 * and displays their live coordinates or active route in real-time without
 * requiring a page refresh.
 */

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  subscribeActiveDrivers,
  type DriversPanelSnapshot,
} from "@/lib/admin-utils"
import { Bidi } from "@/components/admin-bidi"
import { AdminAddDriverModal } from "@/components/admin-add-driver-modal"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import { Users, Bus, MapPin, Plus, Clock, Navigation } from "lucide-react"

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

export function AdminDriverMap({ onDriverSelect }: AdminDriverListProps) {
  const { t, formatTimeOfDay } = useAdminI18n()
  const [panel, setPanel] = useState<DriversPanelSnapshot>({
    rows: [],
    activeCount: 0,
    mode: "empty",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    // Dynamic real-time listener: Firestore `drivers` + `users` onSnapshot + RTDB `drivers`
    const unsubscribe = subscribeActiveDrivers((snapshot) => {
      setPanel(snapshot)
      setIsLoading(false)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) return t("common.na")
    if (Date.now() - timestamp < 60_000) {
      return `${t("time.justNow")} · ${formatTimeOfDay(timestamp)}`
    }
    return formatTimeOfDay(timestamp)
  }

  return (
    <div className="admin-card p-4 sm:p-5">
      {/* Section header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
          {t("drivers.title")} (<Bidi>{panel.rows.length}</Bidi>)
        </h3>

        {panel.activeCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-[rgba(16,185,129,0.14)] px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.22)]">
            <span className="live-dot" aria-hidden="true" />
            {t("drivers.onlineCount", { n: panel.activeCount })}
          </span>
        )}

        {/* Add Driver / إضافة سائق */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="admin-btn-primary ms-auto"
          style={{ minHeight: 38, fontSize: 12.5, paddingInline: 14, gap: 6 }}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t("drivers.addDriver")}
        </button>
      </div>

      {/* Fallback note — no live drivers, showing registered ones */}
      {!isLoading && panel.mode === "fallback" && panel.rows.length > 0 && (
        <p className="mb-3 flex items-center gap-1.5 rounded-[10px] border border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.06)] px-3 py-2 text-[11.5px] text-amber-300">
          <Clock className="h-3 w-3 flex-shrink-0" />
          {t("drivers.fallbackNote")}
        </p>
      )}

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
      {!isLoading && panel.rows.length === 0 && (
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
      {!isLoading && panel.rows.length > 0 && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {panel.rows.map((driver, i) => {
            const activeRouteLabel = driver.activeRoute || driver.line || ""
            return (
              <motion.div
                key={driver.key}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
                className={`group flex items-center gap-3.5 rounded-[14px] border p-3.5 transition-all duration-200 hover:-translate-y-[1px] hover:border-[rgba(16,185,129,0.45)] hover:bg-[rgba(16,185,129,0.055)] hover:shadow-[0_10px_28px_-14px_var(--admin-glow)] ${
                  driver.isActive
                    ? "border-[rgba(16,185,129,0.38)] bg-[rgba(16,185,129,0.045)] shadow-[0_8px_24px_-14px_rgba(16,185,129,0.28)]"
                    : "border-[var(--admin-border)] bg-[var(--admin-surface-2)]"
                }`}
              >
                {/* Avatar with glowing green online indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/15 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                    style={{ background: avatarGradient(driver.phone) }}
                  >
                    <Bus className="h-5 w-5 text-white/90" strokeWidth={2} />
                  </div>
                  <span
                    className={` -bottom-0.5 -end-0.5 absolute flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-[#0c1424] ${
                      driver.isActive
                        ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]"
                        : "bg-slate-500"
                    }`}
                    aria-hidden="true"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Bidi className="admin-num truncate text-[14px] font-semibold tracking-wide text-[var(--admin-text)]">
                      {driver.phone}
                    </Bidi>

                    {/* Status badge with glowing green indicator */}
                    <span
                      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition-all duration-200 ${
                        driver.isActive
                          ? "border border-emerald-500/40 bg-[rgba(16,185,129,0.16)] text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.28)]"
                          : "border border-transparent bg-[rgba(148,163,184,0.12)] text-[var(--admin-text-3)]"
                      }`}
                    >
                      <span
                        className={`live-dot ${driver.isActive ? "" : "live-dot-idle"}`}
                        aria-hidden="true"
                      />
                      {driver.isActive ? t("drivers.status.active") : t("drivers.status.idle")}
                    </span>

                    {driver.isMock && (
                      <span className="flex-shrink-0 rounded-full bg-[rgba(167,139,250,0.12)] px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                        {t("drivers.registered")}
                      </span>
                    )}
                  </div>

                  {/* Name / bus line */}
                  {(driver.name || driver.line) && (
                    <p className="mt-1 truncate text-[11.5px] text-[var(--admin-text-2)]">
                      {driver.name && <span className="font-medium">{driver.name}</span>}
                      {driver.name && driver.line ? " · " : ""}
                      {driver.line}
                    </p>
                  )}

                  {/* Active route pill when driver has an active route */}
                  {driver.activeRoute && driver.activeRoute !== driver.line && (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/90">
                      <Navigation className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                      <span className="truncate">
                        {t("drivers.activeRoute")} <Bidi>{driver.activeRoute}</Bidi>
                      </span>
                    </p>
                  )}

                  {/* Live coordinates or active route / fallback note */}
                  {driver.location ? (
                    <p
                      className={`admin-num mt-1 flex items-center gap-1.5 text-[11px] ${
                        driver.isActive ? "font-medium text-emerald-300/95" : "text-[var(--admin-text-3)]"
                      }`}
                    >
                      <MapPin
                        className={`h-3 w-3 flex-shrink-0 ${
                          driver.isActive ? "text-emerald-400" : "opacity-70"
                        }`}
                      />
                      <span className="truncate">
                        {t("drivers.lat")} <Bidi>{driver.location.lat.toFixed(6)}</Bidi>
                        {" · "}
                        {t("drivers.lng")} <Bidi>{driver.location.lng.toFixed(6)}</Bidi>
                      </span>
                    </p>
                  ) : driver.isActive && activeRouteLabel ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/90">
                      <Navigation className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                      <span className="truncate">
                        {t("drivers.activeRoute")} <Bidi>{activeRouteLabel}</Bidi>
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--admin-text-3)]">
                      <MapPin className="h-3 w-3 flex-shrink-0 opacity-70" />
                      <span className="truncate">{t("drivers.noLocation")}</span>
                    </p>
                  )}

                  <p className="admin-num mt-0.5 text-[11px] text-[var(--admin-text-3)]">
                    {formatTime(driver.lastSeen)}
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

      {/* Add Driver modal */}
      <AdminAddDriverModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
