"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchRecentTransactions, type Transaction } from "@/lib/admin-utils"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { CreditCard, TrendingDown, TrendingUp, Send, Ticket, Search, Download } from "lucide-react"

const TYPE_CONFIG: Record<string, { label: string; color: string; isDebit: boolean }> = {
  fare_deduction:  { label: "Fare Deduction",   color: "#F87171", isDebit: true  },
  balance_recharge:{ label: "Balance Recharge",  color: "#34D399", isDebit: false },
  admin_transfer:  { label: "Admin Transfer",    color: "#60A5FA", isDebit: false },
  ticket_purchase: { label: "Ticket Purchase",   color: "#A78BFA", isDebit: true  },
  payment:         { label: "Payment",           color: "#34D399", isDebit: false },
  topup:           { label: "Top-up",            color: "#34D399", isDebit: false },
}

const FILTERS = [
  { id: "all",              label: "All" },
  { id: "fare_deduction",   label: "Fares" },
  { id: "balance_recharge", label: "Recharges" },
  { id: "admin_transfer",   label: "Transfers" },
  { id: "ticket_purchase",  label: "Tickets" },
]

function ago(timestamp: any): string {
  if (!timestamp) return "—"
  try {
    const d: Date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return "just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch { return "—" }
}

export function AdminFinancePanel() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const unsub = fetchRecentTransactions((list) => {
      setTxns(list)
      setLoading(false)
    }, 100)
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    let list = txns
    if (filter !== "all") list = list.filter((t) => t.type === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          (t.userName || "").toLowerCase().includes(q) ||
          (t.driverPhone || "").includes(q) ||
          t.userId.toLowerCase().includes(q)
      )
    }
    return list
  }, [txns, filter, search])

  // Pie chart data
  const pieData = useMemo(() => {
    const groups: Record<string, number> = {}
    txns.forEach((t) => {
      groups[t.type] = (groups[t.type] || 0) + t.amount
    })
    return Object.entries(groups)
      .map(([type, value]) => ({
        name: TYPE_CONFIG[type]?.label ?? type,
        value: Math.round(value),
        color: TYPE_CONFIG[type]?.color ?? "#64748B",
      }))
      .filter((d) => d.value > 0)
  }, [txns])

  const totalIn  = useMemo(() => txns.filter((t) => !TYPE_CONFIG[t.type]?.isDebit).reduce((s, t) => s + t.amount, 0), [txns])
  const totalOut = useMemo(() => txns.filter((t) =>  TYPE_CONFIG[t.type]?.isDebit).reduce((s, t) => s + t.amount, 0), [txns])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const { name, value } = payload[0]
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-300 font-medium">{name}</p>
        <p className="font-bold text-white">{value.toFixed(0)} د.ج</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Volume", value: `${(totalIn + totalOut).toFixed(0)} د.ج`, icon: CreditCard, color: "#06B6D4" },
          { label: "Money In",     value: `+${totalIn.toFixed(0)} د.ج`,             icon: TrendingUp,  color: "#34D399" },
          { label: "Money Out",    value: `-${totalOut.toFixed(0)} د.ج`,            icon: TrendingDown,color: "#F87171" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon style={{ width: 15, height: 15, color: c.color }} />
              <span className="text-xs text-slate-500">{c.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Pie */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Breakdown</h3>
          {loading || pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              {loading
                ? <div className="h-6 w-6 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
                : <p className="text-slate-600 text-sm">No data yet</p>}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Transactions table */}
        <div className="xl:col-span-2 rounded-xl border border-slate-800/60 bg-slate-900/60">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-800/60">
            <h3 className="text-sm font-semibold text-white flex-shrink-0">Transactions</h3>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36"
                />
              </div>
              <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5 overflow-x-auto">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                      filter === f.id ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">No transactions found</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                  <tr className="border-b border-slate-800/60">
                    {["Type", "User", "Amount", "Status", "Time"].map((h) => (
                      <th key={h} className={`py-2.5 px-4 text-slate-500 font-semibold uppercase tracking-wide ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {filtered.map((tx) => {
                    const cfg = TYPE_CONFIG[tx.type] ?? { label: tx.type, color: "#64748B", isDebit: false }
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: cfg.color + "22", color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-[120px] truncate">
                          {tx.userName || tx.userId.slice(0, 10) + "…"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold" style={{ color: cfg.isDebit ? "#F87171" : "#34D399" }}>
                          {cfg.isDebit ? "-" : "+"}{tx.amount.toFixed(0)} د.ج
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            tx.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{ago(tx.timestamp)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && (
            <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">{filtered.length} transactions shown</span>
              <span className="text-xs text-slate-600">Last 100 records</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
