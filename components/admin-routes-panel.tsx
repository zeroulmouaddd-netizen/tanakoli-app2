"use client"

import { useState } from "react"
import { Route, MapPin, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"

interface RouteStop {
  name: string
  coords: [number, number]
  isTerminal: boolean
}

interface TransitRoute {
  id: string
  lineNumber: string
  arabicName: string
  name: string
  color: string
  terminalFrom: string
  terminalTo: string
  stops: RouteStop[]
  totalWaypoints: number
}

const ROUTES: TransitRoute[] = [
  {
    id: "line-01", lineNumber: "01",
    arabicName: "خط 01 — طريق العيزار",
    name: "Ligne 01 — Route Al-Aizar",
    color: "#FF6B35",
    terminalFrom: "نقطة الانطلاق طريق العيزار",
    terminalTo: "نقطة وصول طريق العيزار",
    stops: [
      { name: "نقطة الانطلاق طريق العيزار", coords: [35.4279, 7.1431], isTerminal: true },
      { name: "نقطة وصول طريق العيزار",    coords: [35.4075, 7.1380], isTerminal: true },
    ],
    totalWaypoints: 2,
  },
  {
    id: "line-02", lineNumber: "02",
    arabicName: "خط 02 — موسى رداح",
    name: "Ligne 02 — Moussa Raddah",
    color: "#9B59B6",
    terminalFrom: "مسجد موسى رداح",
    terminalTo: "موقف الحافلات",
    stops: [
      { name: "مسجد موسى رداح",  coords: [35.450003, 7.123128], isTerminal: true },
      { name: "موقف الحافلات",    coords: [35.445878, 7.144128], isTerminal: true },
    ],
    totalWaypoints: 2,
  },
  {
    id: "line-04", lineNumber: "04",
    arabicName: "خط 04 — انسيغة",
    name: "Ligne 04 — Ansigha",
    color: "#00BCD4",
    terminalFrom: "نقطة انطلاق انسيغة",
    terminalTo: "انسيغة",
    stops: [
      { name: "نقطة انطلاق انسيغة", coords: [35.42722, 7.14421], isTerminal: true },
      { name: "انسيغة",             coords: [35.3950,  7.1420 ], isTerminal: true },
    ],
    totalWaypoints: 3,
  },
  {
    id: "line-05", lineNumber: "05",
    arabicName: "خط 05 — الحامة (طريق RN88)",
    name: "Ligne 05 — Al-Hama (RN88)",
    color: "#27AE60",
    terminalFrom: "نزل المالية",
    terminalTo: "الحامة",
    stops: [
      { name: "نزل المالية",  coords: [35.4279, 7.1431], isTerminal: true },
      { name: "الحامة",       coords: [35.4659, 7.0581], isTerminal: true },
    ],
    totalWaypoints: 3,
  },
  {
    id: "line-06", lineNumber: "06",
    arabicName: "خط 06 — المحمل",
    name: "Ligne 06 — Al-Mahmal",
    color: "#E74C3C",
    terminalFrom: "نقطة انطلاق دار الثقافة",
    terminalTo: "نقطة وصول تازوقاغت",
    stops: [
      { name: "نقطة انطلاق دار الثقافة", coords: [35.4296, 7.1499], isTerminal: true },
      { name: "نقطة وصول تازوقاغت",      coords: [35.3697, 7.2154], isTerminal: true },
    ],
    totalWaypoints: 3,
  },
  {
    id: "line-10", lineNumber: "10",
    arabicName: "خط 10 — المدينة الجديدة",
    name: "Ligne 10 — Cité Nouvelle",
    color: "#F39C12",
    terminalFrom: "المدينة الجديدة",
    terminalTo: "موقف الحافلات",
    stops: [
      { name: "المدينة الجديدة", coords: [35.424, 7.138    ], isTerminal: true },
      { name: "موقف الحافلات",   coords: [35.4459, 7.1441  ], isTerminal: true },
    ],
    totalWaypoints: 2,
  },
  {
    id: "line-11", lineNumber: "11",
    arabicName: "خط 11 — فرنقال",
    name: "Ligne 11 — Frnqal",
    color: "#2980B9",
    terminalFrom: "قرية فرنقال",
    terminalTo: "موقف الحافلات",
    stops: [
      { name: "قرية فرنقال",  coords: [35.45,    7.19    ], isTerminal: true },
      { name: "موقف الحافلات",coords: [35.4459,  7.1441  ], isTerminal: true },
    ],
    totalWaypoints: 4,
  },
]

export function AdminRoutesPanel() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Transit Routes & Lines</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ROUTES.length} urban routes configured</p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          Khenchela Urban Network
        </div>
      </div>

      {/* Route cards */}
      <div className="space-y-2">
        {ROUTES.map((route) => {
          const isOpen = expanded === route.id
          return (
            <div
              key={route.id}
              className="rounded-xl border border-slate-800/60 bg-slate-900/60 overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : route.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
              >
                {/* Line badge */}
                <div
                  className="flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: route.color + "33", border: `1.5px solid ${route.color}55`, color: route.color }}
                >
                  {route.lineNumber}
                </div>

                {/* Route info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100 truncate">{route.arabicName}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{route.name}</p>
                </div>

                {/* Meta */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <MapPin style={{ width: 11, height: 11 }} />
                    {route.stops.length} stops
                  </span>
                  <span>{route.totalWaypoints} waypoints</span>
                </div>

                {/* Expand */}
                <div className="flex-shrink-0 text-slate-600">
                  {isOpen
                    ? <ChevronUp style={{ width: 16, height: 16 }} />
                    : <ChevronDown style={{ width: 16, height: 16 }} />
                  }
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-800/60 px-5 py-4 space-y-4">
                  {/* Terminals */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Origin Terminal", value: route.terminalFrom },
                      { label: "Destination Terminal", value: route.terminalTo },
                    ].map((t) => (
                      <div key={t.label} className="rounded-lg bg-slate-800/50 p-3">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{t.label}</p>
                        <p className="text-sm font-medium text-slate-200" dir="rtl">{t.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stops list */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Stop Sequence</p>
                    <div className="space-y-1">
                      {route.stops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-1.5">
                          {/* Line connector */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div
                              className="h-3 w-3 rounded-full border-2 border-white"
                              style={{ background: stop.isTerminal ? route.color : "transparent", borderColor: route.color }}
                            />
                            {idx < route.stops.length - 1 && (
                              <div className="w-px flex-1 mt-1" style={{ background: route.color + "44", minHeight: 8 }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate" dir="rtl">{stop.name}</p>
                            <p className="text-[10px] text-slate-600 font-mono">
                              {stop.coords[0].toFixed(4)}, {stop.coords[1].toFixed(4)}
                            </p>
                          </div>

                          {stop.isTerminal && (
                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Terminal</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Open in Google Maps */}
                  <a
                    href={`https://www.google.com/maps/dir/${route.stops.map(s => s.coords.join(",")).join("/")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink style={{ width: 11, height: 11 }} />
                    Preview route in Google Maps
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
