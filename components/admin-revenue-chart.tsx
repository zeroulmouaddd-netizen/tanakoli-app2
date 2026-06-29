"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp, BarChart2 } from "lucide-react"

interface DayBucket {
  day: string
  revenue: number
  transactions: number
}

function buildLast7Days(): DayBucket[] {
  const days: DayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      day: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      revenue: 0,
      transactions: 0,
    })
  }
  return days
}

export function AdminRevenueChart() {
  const [data, setData] = useState<DayBucket[]>(buildLast7Days())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"revenue" | "volume">("revenue")

  useEffect(() => {
    const txQuery = query(
      collection(db, "transactions"),
      orderBy("timestamp", "desc"),
      limit(500)
    )

    const unsub = onSnapshot(txQuery, (snap) => {
      const buckets = buildLast7Days()
      const today = new Date()

      snap.forEach((doc) => {
        const d = doc.data()
        if (!d.timestamp) return
        try {
          const date: Date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp)
          const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000)
          if (diffDays >= 0 && diffDays <= 6) {
            const idx = 6 - diffDays
            buckets[idx].transactions += 1
            if (d.type === "fare_deduction" || d.type === "ticket_purchase" || d.type === "admin_transfer") {
              buckets[idx].revenue += d.amount || 0
            }
          }
        } catch {}
      })

      setData(buckets)
      setLoading(false)
    }, () => setLoading(false))

    return () => unsub()
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-slate-300 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.name === "Revenue" ? `${p.value.toFixed(0)} د.ج` : p.value}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Analytics — Last 7 Days</h3>
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
          {(["revenue", "volume"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === tab ? "bg-emerald-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "revenue" ? "Revenue" : "Transactions"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          {activeTab === "revenue" ? (
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                dot={{ fill: "#10B981", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="transactions" name="Transactions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
