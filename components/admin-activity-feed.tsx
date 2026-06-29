"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import { ArrowDownLeft, ArrowUpRight, Send, CreditCard, Ticket, Activity } from "lucide-react"

interface FeedItem {
  id: string
  type: string
  userName?: string
  driverPhone?: string
  amount: number
  timestamp: any
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  fare_deduction:  { label: "Fare Deducted",    icon: ArrowDownLeft,  color: "#F87171", bg: "rgba(248,113,113,0.1)" },
  balance_recharge:{ label: "Balance Recharged", icon: ArrowUpRight,   color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  admin_transfer:  { label: "Admin Transfer",    icon: Send,           color: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  ticket_purchase: { label: "Ticket Purchased",  icon: Ticket,         color: "#A78BFA", bg: "rgba(167,139,250,0.1)" },
  payment:         { label: "Payment",           icon: CreditCard,     color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  topup:           { label: "Top-up",            icon: ArrowUpRight,   color: "#34D399", bg: "rgba(52,211,153,0.1)" },
}

function ago(timestamp: any): string {
  if (!timestamp) return "—"
  try {
    const d: Date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return "just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return "—"
  }
}

export function AdminActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(20))
    const unsub = onSnapshot(q, (snap) => {
      const list: FeedItem[] = snap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          type: d.type || "payment",
          userName: d.userName,
          driverPhone: d.driverPhone,
          amount: d.amount || 0,
          timestamp: d.timestamp,
        }
      })
      setItems(list)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5 flex flex-col" style={{ maxHeight: 340 }}>
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <Activity className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
        <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-8 w-8 rounded-lg bg-slate-800 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-slate-800/60 animate-pulse" />
              </div>
              <div className="h-3 w-14 rounded bg-slate-800 animate-pulse" />
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No recent activity</p>
        ) : (
          items.map((item) => {
            const cfg = typeConfig[item.type] ?? typeConfig.payment
            const Icon = cfg.icon
            const isDebit = item.type === "fare_deduction" || item.type === "ticket_purchase"
            return (
              <div key={item.id} className="flex items-center gap-3 py-1.5 rounded-lg hover:bg-slate-800/30 transition-colors px-1">
                <div className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon style={{ width: 14, height: 14, color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{cfg.label}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.userName || item.driverPhone || "Unknown"}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-semibold" style={{ color: isDebit ? "#F87171" : "#34D399" }}>
                    {isDebit ? "-" : "+"}{item.amount.toFixed(0)} د.ج
                  </p>
                  <p className="text-[10px] text-slate-600">{ago(item.timestamp)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
