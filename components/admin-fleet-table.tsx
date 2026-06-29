"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchAllDrivers, type DriverRecord } from "@/lib/admin-utils"
import { Search, Send, Radio, WifiOff, RefreshCw, Users } from "lucide-react"

interface AdminFleetTableProps {
  onDriverSelect: (phone: string) => void
}

function ago(ts: number | null): string {
  if (!ts) return "Never"
  const diff = Date.now() - ts
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function AdminFleetTable({ onDriverSelect }: AdminFleetTableProps) {
  const [rows, setRows] = useState<DriverRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "live" | "offline">("all")

  useEffect(() => {
    const unsub = fetchAllDrivers((drivers) => {
      setRows(drivers)
      setLoading(false)
    })
    return () => unsub()
  }, [])

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

  const filters: { id: "all" | "live" | "offline"; label: string }[] = [
    { id: "all",     label: `All (${rows.length})` },
    { id: "live",    label: `Live (${liveCount})` },
    { id: "offline", label: `Offline (${rows.length - liveCount})` },
  ]

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Driver Fleet</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${rows.length} registered · ${liveCount} live now`}
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
                Drivers are loaded from the Firestore <code className="bg-slate-800 px-1 rounded">users</code> collection
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                {["Status", "Driver", "Phone", "Balance", "Coordinates", "Last Seen", "Action"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map((row) => (
                <tr key={row.id || row.phone} className="hover:bg-slate-800/25 transition-colors">
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

                  {/* Name */}
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

                  {/* Balance */}
                  <td className="py-3 px-4">
                    <span className="text-xs font-semibold text-emerald-400">
                      {row.balance.toFixed(0)} د.ج
                    </span>
                  </td>

                  {/* Coords */}
                  <td className="py-3 px-4">
                    {row.lat !== null && row.lng !== null ? (
                      <span className="font-mono text-xs text-slate-400">
                        {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Last seen */}
                  <td className="py-3 px-4">
                    <span className="text-xs text-slate-500">{ago(row.lastSeen)}</span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onDriverSelect(row.phone)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors"
                    >
                      <Send style={{ width: 10, height: 10 }} />
                      Transfer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-800/60">
          <p className="text-xs text-slate-600">
            Showing {filtered.length} of {rows.length} drivers
            {filter !== "all" && ` · filtered by "${filter}"`}
            {search && ` · matching "${search}"`}
          </p>
        </div>
      )}
    </div>
  )
}
