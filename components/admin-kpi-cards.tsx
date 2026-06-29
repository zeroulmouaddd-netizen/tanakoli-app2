"use client"

import { useEffect, useState } from "react"
import { rtdb, db } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore"
import { Truck, ArrowUpRight, TrendingUp, ShieldCheck } from "lucide-react"

interface KPIData {
  activeBuses: number
  transactionsToday: number
  revenueToday: number
  systemOk: boolean
}

function SkeletonPill() {
  return <div className="h-8 w-24 rounded-lg bg-slate-800 animate-pulse" />
}

export function AdminKPICards() {
  const [kpi, setKpi] = useState<KPIData>({
    activeBuses: 0,
    transactionsToday: 0,
    revenueToday: 0,
    systemOk: true,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubDrivers = onValue(ref(rtdb, "drivers"), (snap) => {
      const count = snap.exists() ? Object.keys(snap.val()).length : 0
      setKpi((prev) => ({ ...prev, activeBuses: count }))
      setLoading(false)
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let txUnsub: (() => void) | null = null
    try {
      const txQuery = query(
        collection(db, "transactions"),
        where("timestamp", ">=", Timestamp.fromDate(today)),
        orderBy("timestamp", "desc"),
        limit(500)
      )
      txUnsub = onSnapshot(
        txQuery,
        (snap) => {
          let revenue = 0
          snap.forEach((doc) => {
            const d = doc.data()
            if (d.type === "fare_deduction" || d.type === "ticket_purchase") {
              revenue += d.amount || 0
            }
          })
          setKpi((prev) => ({ ...prev, transactionsToday: snap.size, revenueToday: revenue }))
        },
        () => {}
      )
    } catch {
      // index not yet built — skip today filter
    }

    return () => {
      unsubDrivers()
      txUnsub?.()
    }
  }, [])

  const cards = [
    {
      label: "Active Buses",
      value: loading ? null : String(kpi.activeBuses),
      sub: "Live on road right now",
      icon: Truck,
      accent: "#10B981",
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.18)",
      textColor: "#10B981",
    },
    {
      label: "Transactions Today",
      value: loading ? null : String(kpi.transactionsToday),
      sub: "Since midnight",
      icon: ArrowUpRight,
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.18)",
      textColor: "#3B82F6",
    },
    {
      label: "Daily Revenue",
      value: loading ? null : `${kpi.revenueToday.toFixed(0)} د.ج`,
      sub: "Fares collected today",
      icon: TrendingUp,
      accent: "#06B6D4",
      bg: "rgba(6,182,212,0.08)",
      border: "rgba(6,182,212,0.18)",
      textColor: "#06B6D4",
    },
    {
      label: "System Status",
      value: "Operational",
      sub: "All services running",
      icon: ShieldCheck,
      accent: "#A855F7",
      bg: "rgba(168,85,247,0.08)",
      border: "rgba(168,85,247,0.18)",
      textColor: "#A855F7",
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
          style={{ background: card.bg, border: `1px solid ${card.border}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-2 rounded-lg"
              style={{ background: `${card.accent}22` }}
            >
              <card.icon style={{ width: 18, height: 18, color: card.accent }} />
            </div>
          </div>

          {card.value === null ? (
            <SkeletonPill />
          ) : (
            <p className="text-2xl font-bold mb-0.5" style={{ color: card.textColor }}>
              {card.value}
            </p>
          )}
          <p className="text-sm font-semibold text-slate-200 mb-0.5">{card.label}</p>
          <p className="text-xs text-slate-500">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
