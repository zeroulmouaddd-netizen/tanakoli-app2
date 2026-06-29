"use client"

import { useEffect, useState, useMemo } from "react"
import { rtdb, db } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { collection, getDocs } from "firebase/firestore"
import { Search, Send, Radio, WifiOff, RefreshCw } from "lucide-react"

interface DriverRow {
  phone: string
  name: string
  lat: number | null
  lng: number | null
  timestamp: number | null
  isLive: boolean
}

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
  const [rows, setRows] = useState<DriverRow[]>([])
  const [namesMap, setNamesMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "live" | "offline">("all")

  // Load names from Firestore once
  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const map: Record<string, string> = {}
        snap.forEach((doc) => {
          const d = doc.data()
          const phone: string = d.Phone || d.phone || ""
          if (phone) map[phone] = d.fullName || d.name || phone
        })
        setNamesMap(map)
      })
      .catch(() => {})
  }, [])

  // Subscribe to RTDB drivers
  useEffect(() => {
    const unsub = onValue(ref(rtdb, "drivers"), (snap) => {
      const list: DriverRow[] = []
      if (snap.exists()) {
        const data = snap.val()
        for (const [phone, val] of Object.entries(data as Record<string, any>)) {
          const loc = val?.location
          const ts: number | null = loc?.timestamp ?? null
          const isLive = ts ? Date.now() - ts < 5 * 60 * 1000 : false
          list.push({
            phone,
            name: "",
            lat: loc?.lat ?? null,
            lng: loc?.lng ?? null,
            timestamp: ts,
            isLive,
          })
        }
      }
      setRows(list)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  const enriched = useMemo(() =>
    rows.map((r) => ({
      ...r,
      name: namesMap[r.phone] || namesMap["0" + r.phone.slice(4)] || r.phone,
    })),
    [rows, namesMap]
  )

  const filtered = useMemo(() => {
    let list = enriched
    if (filter === "live") list = list.filter((r) => r.isLive)
    if (filter === "offline") list = list.filter((r) => !r.isLive)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.phone.includes(q) || r.name.toLowerCase().includes(q))
    }
    return list
  }, [enriched, filter, search])

  const filters: { id: "all" | "live" | "offline"; label: string }[] = [
    { id: "all",     label: "All Drivers" },
    { id: "live",    label: "Live" },
    { id: "offline", label: "Offline" },
  ]

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-800/60">
        <div>
          <h3 className="text-sm font-semibold text-white">Driver Fleet</h3>
          <p className="text-xs text-slate-500 mt-0.5">{enriched.length} total • {enriched.filter(r => r.isLive).length} live</p>
        </div>

        <div className="flex flex-1 items-center gap-2 sm:justify-end flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === f.id ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
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
          <div className="p-8 flex justify-center">
            <RefreshCw className="h-5 w-5 text-slate-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {search || filter !== "all" ? "No drivers match this filter" : "No drivers online"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Coordinates</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Seen</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map((row) => (
                <tr key={row.phone} className="hover:bg-slate-800/25 transition-colors">
                  <td className="py-3 px-5">
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
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                        {row.name.charAt(0).toUpperCase() || "D"}
                      </div>
                      <span className="text-slate-200 font-medium text-xs truncate max-w-[120px]">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-slate-400">{row.phone}</span>
                  </td>
                  <td className="py-3 px-4">
                    {row.lat !== null && row.lng !== null ? (
                      <span className="font-mono text-xs text-slate-400">
                        {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-slate-500">{ago(row.timestamp)}</span>
                  </td>
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
    </div>
  )
}
