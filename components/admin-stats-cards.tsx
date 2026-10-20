"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { rtdb } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { fetchRecentTransactions } from "@/lib/admin-utils"
import { Amount } from "@/components/admin-bidi"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import { Users, TrendingUp, Grid3x3, type LucideIcon } from "lucide-react"

// ─── Animated count-up (purely presentational) ──────────────────────────────
function useCountUp(target: number | null, duration = 900) {
  const [display, setDisplay] = useState<number | null>(null)
  const reduced = useReducedMotion()
  const fromRef = useRef(0)

  useEffect(() => {
    if (target === null) {
      setDisplay(null)
      return
    }
    if (reduced) {
      fromRef.current = target
      setDisplay(target)
      return
    }
    const from = fromRef.current
    if (from === target) {
      setDisplay(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])

  return display
}

// ─── Decorative sparkline (static, purely visual) ───────────────────────────
function Sparkline({ id, color, d }: { id: string; color: string; d: string }) {
  return (
    <svg
      width="64"
      height="22"
      viewBox="0 0 64 22"
      fill="none"
      aria-hidden="true"
      className="opacity-70"
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={d} stroke={`url(#spark-${id})`} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// ─── Single stat card ────────────────────────────────────────────────────────
interface StatCardProps {
  id: string
  label: string
  value: number | null
  expired: boolean
  icon: LucideIcon
  color: string
  tint: string
  border: string
  spark: string
  format: (n: number) => string
  currency?: string
  index: number
}

function StatCard({ id, label, value, expired, icon: Icon, color, tint, border, spark, format, currency, index }: StatCardProps) {
  const animated = useCountUp(value)
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="admin-card admin-card-hover p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="admin-icon-badge"
          style={
            {
              "--badge-bg": tint,
              "--badge-border": border,
              "--badge-color": color,
            } as React.CSSProperties
          }
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <Sparkline id={id} color={color} d={spark} />
      </div>

      <p className="admin-overline mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)]">
        {label}
      </p>

      {value === null ? (
        expired ? (
          <p className="admin-num mt-1.5 text-[30px] font-bold leading-none text-[var(--admin-text-3)]">—</p>
        ) : (
          <div className="admin-skeleton mt-2.5 h-[30px] w-28" />
        )
      ) : (
        <p
          className="admin-num mt-1.5 text-[30px] font-bold leading-none tracking-tight"
          style={{ color }}
        >
          {/* empty string keeps the currency slot off for plain counts */}
          <Amount value={format(animated ?? 0)} currency={currency ?? ""} />
        </p>
      )}
    </motion.div>
  )
}

// ─── Stats grid ──────────────────────────────────────────────────────────────
// Read-only subscriptions mirroring the data already displayed on this page
// (RTDB `drivers` node + Firestore `transactions` feed, last 50).
export function AdminStatsCards() {
  const { t } = useAdminI18n()
  const [activeDrivers, setActiveDrivers] = useState<number | null>(null)
  const [todayVolume, setTodayVolume] = useState<number | null>(null)
  const [totalTx, setTotalTx] = useState<number | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const unsubDrivers = onValue(
      ref(rtdb, "drivers"),
      (snapshot) => {
        setActiveDrivers(snapshot.exists() ? Object.keys(snapshot.val() as object).length : 0)
      },
      () => setExpired(true)
    )

    const unsubTx = fetchRecentTransactions((txns) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let volume = 0
      for (const tx of txns) {
        try {
          const date = tx.timestamp?.toDate?.() ?? new Date(tx.timestamp)
          if (date.getTime() >= today.getTime()) volume += tx.amount
        } catch {
          // ignore malformed timestamps
        }
      }
      setTodayVolume(volume)
      setTotalTx(txns.length)
    })

    const timer = setTimeout(() => setExpired(true), 8000)

    return () => {
      unsubDrivers()
      unsubTx()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-3 sm:gap-5">
      <StatCard
        index={0}
        id="activeDrivers"
        label={t("stats.activeDrivers")}
        value={activeDrivers}
        expired={expired}
        icon={Users}
        color="#60a5fa"
        tint="rgba(96,165,250,0.12)"
        border="rgba(96,165,250,0.3)"
        spark="M1 16 C8 16, 12 9, 19 10 S 32 18, 39 12 S 54 4, 63 7"
        format={(n) => Math.round(n).toLocaleString("en-US")}
      />
      <StatCard
        index={1}
        id="todayVolume"
        label={t("stats.todayVolume")}
        value={todayVolume}
        expired={expired}
        icon={TrendingUp}
        color="#34d399"
        tint="rgba(52,211,153,0.12)"
        border="rgba(52,211,153,0.3)"
        spark="M1 17 C7 15, 11 17, 18 13 S 30 6, 38 9 S 52 12, 63 5"
        format={(n) => Math.round(n).toLocaleString("en-US")}
        currency="د.ج"
      />
      <StatCard
        index={2}
        id="totalTransactions"
        label={t("stats.totalTransactions")}
        value={totalTx}
        expired={expired}
        icon={Grid3x3}
        color="#22d3ee"
        tint="rgba(34,211,238,0.12)"
        border="rgba(34,211,238,0.3)"
        spark="M1 12 C9 14, 15 7, 23 10 S 36 16, 44 10 S 56 8, 63 11"
        format={(n) => Math.round(n).toLocaleString("en-US")}
      />
    </div>
  )
}
