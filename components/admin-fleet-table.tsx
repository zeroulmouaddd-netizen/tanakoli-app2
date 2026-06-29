"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore"
import { fetchAllDrivers, type DriverRecord } from "@/lib/admin-utils"
import {
  Search, Send, Radio, WifiOff, RefreshCw, Users,
  ChevronDown, ChevronUp, TrendingUp, Wallet,
  Receipt, Percent, BarChart2, Clock,
} from "lucide-react"

// ─── Commission rate ──────────────────────────────────────────────────────────
const COMMISSION_RATE = 0.10   // 10 % platform fee

// ─── Types ────────────────────────────────────────────────────────────────────
interface TodayTx {
  id: string
  amount: number
  type: string
  timestamp: any
}

interface DailyStats {
  gross: number
  commission: number
  net: number
  tripCount: number
  txns: TodayTx[]
}

interface AdminFleetTableProps {
  onDriverSelect: (phone: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ago(ts: number | null): string {
  if (!ts) return "Never"
  const diff = Date.now() - ts
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function txTime(timestamp: any): string {
  if (!timestamp) return "—"
  try {
    const d: Date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  } catch { return "—" }
}

// Normalize phone to local "0XXXXXXXXX" for map key lookups
function localPhone(raw: string): string {
  if (!raw) return ""
  const s = raw.trim()
  if (s.startsWith("+213")) return "0" + s.slice(4)
  if (s.startsWith("213") && s.length === 12) return "0" + s.slice(3)
  return s
}

const FARE_TYPES = new Set(["fare_deduction", "ticket_purchase", "fare", "ride"])

// ─── Expandable detail row ────────────────────────────────────────────────────
function DriverDetailRow({
  driver,
  stats,
}: {
  driver: DriverRecord
  stats: DailyStats
}) {
  return (
    <tr>
      <td colSpan={9} className="px-0 pb-0 pt-0">
        <div className="mx-5 mb-4 rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/50 border-b border-slate-700/50">
            {[
              {
                label: "إجمالي الأجرة", sublabel: "Gross Fares",
                value: `${stats.gross.toFixed(0)} د.ج`,
                icon: BarChart2, color: "text-blue-400", bg: "bg-blue-500/10",
              },
              {
                label: "عمولة النظام", sublabel: `Commission (${(COMMISSION_RATE * 100).toFixed(0)}%)`,
                value: `-${stats.commission.toFixed(0)} د.ج`,
                icon: Percent, color: "text-amber-400", bg: "bg-amber-500/10",
              },
              {
                label: "صافي الربح", sublabel: "Net Profit",
                value: `${stats.net.toFixed(0)} د.ج`,
                icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10",
              },
              {
                label: "عدد الرحلات", sublabel: "Trips Today",
                value: String(stats.tripCount),
                icon: Receipt, color: "text-purple-400", bg: "bg-purple-500/10",
              },
            ].map((c) => (
              <div key={c.label} className={`flex items-center gap-3 px-4 py-3 ${c.bg}`}>
                <div className="flex-shrink-0">
                  <c.icon style={{ width: 15, height: 15 }} className={c.color} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{c.label}</p>
                  <p className="text-[10px] text-slate-600">{c.sublabel}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Transaction micro-list */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Today's Fare Transactions
            </p>
            {stats.txns.length === 0 ? (
              <p className="text-xs text-slate-600 py-2">No fare transactions today.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
              >
                {stats.txns.map((tx, i) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                        {i + 1}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate capitalize">
                        {tx.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        +{tx.amount.toFixed(0)} د.ج
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-600">
                        <Clock style={{ width: 9, height: 9 }} />
                        {txTime(tx.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdminFleetTable({ onDriverSelect }: AdminFleetTableProps) {
  const [rows, setRows]           = useState<DriverRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [filter, setFilter]       = useState<"all" | "live" | "offline">("all")
  const [expanded, setExpanded]   = useState<string | null>(null)

  // Today's aggregated stats per driver phone (local format key)
  const [dailyStats, setDailyStats] = useState<Map<string, DailyStats>>(new Map())
  const [statsLoading, setStatsLoading] = useState(true)

  // ── Load all drivers (Firestore + RTDB) ─────────────────────────────────
  useEffect(() => {
    const unsub = fetchAllDrivers((drivers) => {
      setRows(drivers)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // ── Load today's transactions once, aggregate by driverPhone ──────────
  useEffect(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let q
    try {
      q = query(
        collection(db, "transactions"),
        where("timestamp", ">=", Timestamp.fromDate(todayStart)),
        orderBy("timestamp", "desc")
      )
    } catch {
      // If index doesn't exist fall back to unfiltered (limited)
      q = query(collection(db, "transactions"), orderBy("timestamp", "desc"))
    }

    const unsub = onSnapshot(q, (snap) => {
      const map = new Map<string, DailyStats>()

      snap.forEach((d) => {
        const data = d.data()
        // Only include fare-type transactions
        if (!FARE_TYPES.has(data.type)) return

        const rawPhone: string = data.driverPhone || ""
        if (!rawPhone) return

        const key = localPhone(rawPhone)
        if (!key) return

        const amount: number = data.amount || 0
        if (!map.has(key)) {
          map.set(key, { gross: 0, commission: 0, net: 0, tripCount: 0, txns: [] })
        }
        const entry = map.get(key)!
        entry.gross     += amount
        entry.commission = entry.gross * COMMISSION_RATE
        entry.net        = entry.gross * (1 - COMMISSION_RATE)
        entry.tripCount += 1
        entry.txns.push({ id: d.id, amount, type: data.type, timestamp: data.timestamp })
      })

      setDailyStats(map)
      setStatsLoading(false)
    }, () => setStatsLoading(false))

    return () => unsub()
  }, [])

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = rows
    if (filter === "live")    list = list.filter((r) => r.isLive)
    if (filter === "offline") list = list.filter((r) => !r.isLive)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) => r.phone.includes(q) || r.name.toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, filter, search])

  const liveCount = rows.filter((r) => r.isLive).length

  const getStats = useCallback(
    (phone: string): DailyStats =>
      dailyStats.get(localPhone(phone)) ??
      { gross: 0, commission: 0, net: 0, tripCount: 0, txns: [] },
    [dailyStats]
  )

  const filters: { id: "all" | "live" | "offline"; label: string }[] = [
    { id: "all",     label: `All (${rows.length})` },
    { id: "live",    label: `Live (${liveCount})` },
    { id: "offline", label: `Offline (${rows.length - liveCount})` },
  ]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Driver Fleet</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading
              ? "Loading…"
              : `${rows.length} registered · ${liveCount} live now`}
          </p>
        </div>

        <div className="flex flex-1 items-center gap-2 sm:justify-end flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search driver…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
            />
          </div>

          <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === f.id
                    ? "bg-emerald-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-10 flex flex-col items-center gap-3">
            <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-500">Loading drivers from Firestore…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="h-8 w-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">
              {search || filter !== "all"
                ? "No drivers match this filter"
                : "No registered drivers found"}
            </p>
            {!search && filter === "all" && (
              <p className="text-slate-600 text-xs mt-1">
                Drivers are loaded from the Firestore{" "}
                <code className="bg-slate-800 px-1 rounded">users</code> collection
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                {[
                  "Status", "Driver", "Phone",
                  "صافي ربح اليوم", "المتبقي في المحفظة",
                  "Last Seen", "Action", "Details",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-5 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => {
                const stats   = getStats(row.phone)
                const isOpen  = expanded === row.phone
                const rowKey  = row.id || row.phone

                return (
                  <>
                    {/* Main data row */}
                    <tr
                      key={rowKey}
                      className={`border-b border-slate-800/30 transition-colors ${
                        isOpen ? "bg-slate-800/30" : "hover:bg-slate-800/20"
                      }`}
                    >
                      {/* Status */}
                      <td className="py-3 pl-5 pr-4">
                        {row.isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <Radio style={{ width: 10, height: 10 }} />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-500 border border-slate-700/50">
                            <WifiOff style={{ width: 10, height: 10 }} />
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Driver name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                            {(row.name || row.phone).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-200 font-medium text-xs truncate max-w-[130px]">
                            {row.name || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-400">{row.phone}</span>
                      </td>

                      {/* صافي ربح اليوم — Today's Net Profit */}
                      <td className="py-3 px-4">
                        {statsLoading ? (
                          <div className="h-5 w-16 rounded-md bg-slate-800 animate-pulse" />
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                            <TrendingUp style={{ width: 11, height: 11, color: "#10B981", flexShrink: 0 }} />
                            <span className="text-xs font-bold text-emerald-400 tabular-nums">
                              {stats.net.toFixed(0)}{" "}
                              <span className="font-medium text-emerald-500/70">د.ج</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* المتبقي في المحفظة — Wallet Balance */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15">
                          <Wallet style={{ width: 11, height: 11, color: "#60A5FA", flexShrink: 0 }} />
                          <span className="text-xs font-bold text-blue-400 tabular-nums">
                            {row.balance.toFixed(0)}{" "}
                            <span className="font-medium text-blue-500/70">د.ج</span>
                          </span>
                        </div>
                      </td>

                      {/* Last seen */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {ago(row.lastSeen)}
                        </span>
                      </td>

                      {/* Transfer action */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onDriverSelect(row.phone)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors"
                        >
                          <Send style={{ width: 10, height: 10 }} />
                          Transfer
                        </button>
                      </td>

                      {/* Details toggle */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() =>
                            setExpanded((prev) =>
                              prev === row.phone ? null : row.phone
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isOpen
                              ? "bg-slate-700/60 text-white border-slate-600"
                              : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-slate-200 hover:border-slate-600"
                          }`}
                          title="View daily breakdown"
                        >
                          {isOpen ? (
                            <ChevronUp style={{ width: 12, height: 12 }} />
                          ) : (
                            <ChevronDown style={{ width: 12, height: 12 }} />
                          )}
                          <span>{isOpen ? "Hide" : "Details"}</span>
                        </button>
                      </td>
                    </tr>

                    {/* Expanded breakdown row */}
                    {isOpen && (
                      <DriverDetailRow
                        key={`${rowKey}-detail`}
                        driver={row}
                        stats={stats}
                      />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            Showing {filtered.length} of {rows.length} drivers
            {filter !== "all" && ` · filtered by "${filter}"`}
            {search && ` · matching "${search}"`}
          </p>
          <p className="text-xs text-slate-700">
            Commission rate: {(COMMISSION_RATE * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  )
}
