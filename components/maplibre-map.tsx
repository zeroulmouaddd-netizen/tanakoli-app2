"use client"

/**
 * MapLibre map component with CartoDB Voyager (natural/light) tiles.
 * 
 * Architecture:
 *   - If WebGL is available  → MapLibre GL (production, real browsers)
 *   - If WebGL is unavailable (Replit preview sandbox) → Leaflet + CartoDB Voyager tiles
 *
 * Live driver tracking (0775453629) is present in BOTH renderers.
 */

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "maplibre-gl/dist/maplibre-gl.css"
import { rtdb } from "@/lib/firebase"
import { ref as rtdbRef, onValue } from "firebase/database"
import { motion, AnimatePresence } from "framer-motion"
import { Layers, ChevronDown, ChevronUp, MapPin, LocateFixed } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import {
  fringalOutboundCoords,
  fringalReturnCoords,
  fringalOutboundWaypoints,
  fringalReturnWaypoints,
} from "@/lib/data/fringal-gpx-data"

// ── Shared constants ──────────────────────────────────────────────────────────
const KHENCHELA_CENTER: [number, number] = [35.43, 7.14]   // [lat, lng]
const KHENCHELA_LNG_LAT: [number, number] = [7.14, 35.43]  // [lng, lat] for MapLibre
const DEFAULT_ZOOM = 13
const CARTO_VOYAGER_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

// ── Route / station data ──────────────────────────────────────────────────────
const urbanStations: {
  position: [number, number]; name: string; nameEn: string; lines: string[]; isMain: boolean
}[] = [
  { position: [35.445878, 7.144128], name: "موقف الحافلات",      nameEn: "Gare Routière",         lines: ["line-02","line-06","line-10","line-11"], isMain: true  },
  { position: [35.4075,   7.1380  ], name: "ث. معمرية طاهر",    nameEn: "Lycée Muamria Taher",   lines: ["line-01"],                              isMain: true  },
  { position: [35.4279,   7.1431  ], name: "نزل المالية",        nameEn: "Hôtel des Finances",    lines: ["line-01","line-04","line-05"],          isMain: true  },
  { position: [35.450003, 7.123128], name: "مسجد موسى رداح",     nameEn: "Mosquée Moussa Raddah", lines: ["line-02"],                              isMain: true  },
  { position: [35.3950,   7.1420  ], name: "انسيغة",             nameEn: "Ansigha",               lines: ["line-04"],                              isMain: true  },
  { position: [35.4659,   7.0581  ], name: "الحامة",             nameEn: "Al-Hama",               lines: ["line-05"],                              isMain: true  },
  { position: [35.5,      7.25    ], name: "المحمل",             nameEn: "El Mahmal",             lines: ["line-06"],                              isMain: true  },
  { position: [35.4382,   7.1468  ], name: "دار الثقافة",        nameEn: "Maison de la Culture",  lines: ["line-06"],                              isMain: false },
  { position: [35.424,    7.138   ], name: "المدينة الجديدة",    nameEn: "Cité Nouvelle",         lines: ["line-10"],                              isMain: true  },
  { position: [35.45,     7.19    ], name: "قرية فرنقال",        nameEn: "Village Frnqal",        lines: ["line-11"],                              isMain: true  },
  { position: [35.396003, 7.100503], name: "عمارات طريق فرنقال", nameEn: "Résid. Route Frnqal",   lines: ["line-11"],                              isMain: false },
  { position: [35.426753, 7.135503], name: "نزل المدينة",        nameEn: "Hôtel 1er Novembre",    lines: ["line-11"],                              isMain: false },
]

const urbanRoutePolylines: {
  id: string; lineNumber: string; waypoints: [number, number][]; color: string;
  arabicName: string
}[] = [
  { id: "line-01", lineNumber: "01", color: "#FF6B35", arabicName: "خط 01 — طريق العيزار",
    waypoints: [[35.4075,7.1380],[35.4279,7.1431]] },
  { id: "line-02", lineNumber: "02", color: "#9B59B6", arabicName: "خط 02 — موسى رداح",
    waypoints: [[35.450003,7.123128],[35.445878,7.144128]] },
  { id: "line-04", lineNumber: "04", color: "#00BCD4", arabicName: "خط 04 — انسيغة",
    waypoints: [[35.3950,7.1420],[35.4150,7.1425],[35.4279,7.1431]] },
  { id: "line-05", lineNumber: "05", color: "#27AE60", arabicName: "خط 05 — الحامة",
    waypoints: [[35.4279,7.1431],[35.4380,7.0950],[35.4659,7.0581]] },
  { id: "line-06", lineNumber: "06", color: "#E74C3C", arabicName: "خط 06 — المحمل",
    waypoints: [[35.5,7.25],[35.4750,7.2000],[35.445878,7.144128],[35.4382,7.1468]] },
  { id: "line-10", lineNumber: "10", color: "#F39C12", arabicName: "خط 10 — المدينة الجديدة",
    waypoints: [[35.424,7.138],[35.445878,7.144128]] },
  { id: "line-11", lineNumber: "11", color: "#2980B9", arabicName: "خط 11 — فرنقال",
    waypoints: [[35.45,7.19],[35.396003,7.100503],[35.426753,7.135503],[35.445878,7.144128]] },
]

// ── WebGL probe ───────────────────────────────────────────────────────────────
function detectWebGL(): boolean {
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false })
    if (!gl) return false
    // Attempt a dummy draw call — catches broken/sandboxed WebGL
    const buf = (gl as WebGLRenderingContext).createBuffer()
    return buf !== null
  } catch {
    return false
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface DriverLocation { lat: number; lng: number }
type SelectedRoute = string | null

interface MapProps {
  trackingLineId?: string | null
  isFullscreen?: boolean
}

// ── Shared CSS injector ───────────────────────────────────────────────────────
function injectMapStyles() {
  if (typeof document === "undefined") return
  const id = "tk-map-styles-v3"
  if (document.getElementById(id)) return
  const s = document.createElement("style")
  s.id = id
  s.textContent = `
    @keyframes tk-driver-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(236,72,153,0.6),0 2px 10px rgba(0,0,0,0.4); }
      50%      { box-shadow:0 0 0 9px rgba(236,72,153,0),0 2px 12px rgba(0,0,0,0.5); }
    }
    @keyframes tk-terminal-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(255,255,255,0.35),0 4px 16px rgba(0,0,0,0.5); }
      50%      { box-shadow:0 0 0 6px rgba(255,255,255,0),0 4px 20px rgba(0,0,0,0.6); }
    }
    @keyframes tk-sim-glow {
      0%,100% { filter:drop-shadow(0 0 4px currentColor); }
      50%      { filter:drop-shadow(0 0 9px currentColor); }
    }
    .tk-sim-bus { animation:tk-sim-glow 2s ease-in-out infinite; will-change:transform; }
    /* Leaflet fallback popup */
    .tk-popup .leaflet-popup-content-wrapper {
      background:rgba(15,23,42,0.97) !important;
      border:1px solid rgba(71,85,105,0.55) !important;
      border-radius:10px !important;
      color:#F8FAFC !important;
      box-shadow:0 8px 28px rgba(0,0,0,0.55) !important;
    }
    .tk-popup .leaflet-popup-tip { background:rgba(15,23,42,0.97) !important; }
    .tk-popup .leaflet-popup-content { margin:10px 13px !important; font-size:13px !important; }
    .tk-pname { font-weight:700; font-size:13px; margin-bottom:3px; }
    .tk-psub  { font-size:11px; color:#94A3B8; margin-bottom:5px; }
    .tk-pbadge {
      display:inline-flex;align-items:center;gap:4px;padding:2px 8px;
      border-radius:4px;font-size:11px;font-weight:600;color:white;
    }
    /* MapLibre popups */
    .maplibregl-popup-content {
      background:rgba(15,23,42,0.97) !important;
      border:1px solid rgba(71,85,105,0.55) !important;
      border-radius:10px !important;color:#F8FAFC !important;
      padding:10px 13px !important;font-family:system-ui,sans-serif !important;
      box-shadow:0 8px 28px rgba(0,0,0,0.55) !important;
    }
    .maplibregl-popup-tip { border-top-color:rgba(15,23,42,0.97) !important; }
    .maplibregl-ctrl-attrib,
    .maplibregl-ctrl-bottom-right,
    .leaflet-control-attribution { display:none !important; }
  `
  document.head.appendChild(s)
}

// ── Sim-bus interpolation ─────────────────────────────────────────────────────
function getSimPos(coords: [number, number][], progress: number) {
  if (!coords || coords.length < 2) return { lat: coords?.[0]?.[0] ?? 35.44, lng: coords?.[0]?.[1] ?? 7.14, heading: 0 }
  const clamped = Math.max(0, Math.min(0.9999, progress))
  const lens: number[] = []; let totalLen = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const d = Math.hypot(coords[i+1][0]-coords[i][0], coords[i+1][1]-coords[i][1])
    lens.push(d); totalLen += d
  }
  if (totalLen === 0) return { lat: coords[0][0], lng: coords[0][1], heading: 0 }
  const target = clamped * totalLen; let acc = 0
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target) {
      const t = lens[i] > 0 ? (target - acc) / lens[i] : 0
      return {
        lat: coords[i][0] + t * (coords[i+1][0]-coords[i][0]),
        lng: coords[i][1] + t * (coords[i+1][1]-coords[i][1]),
        heading: Math.atan2(coords[i+1][1]-coords[i][1], coords[i+1][0]-coords[i][0]) * 180 / Math.PI,
      }
    }
    acc += lens[i]
  }
  return { lat: coords.at(-1)![0], lng: coords.at(-1)![1], heading: 0 }
}

// ── RouteController (shared React UI) ────────────────────────────────────────
function RouteController({
  selectedRoute, onRouteSelect, isDark,
}: { selectedRoute: SelectedRoute; onRouteSelect: (id: SelectedRoute) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  const bg     = isDark ? "rgba(15,23,42,0.95)"  : "rgba(255,255,255,0.95)"
  const txt    = isDark ? "#F8FAFC" : "#1a1a1a"
  const muted  = isDark ? "#94A3B8" : "#64748b"
  const border = isDark ? "rgba(71,85,105,0.5)"  : "rgba(226,232,240,1)"
  const hover  = isDark ? "rgba(51,65,85,0.8)"   : "rgba(241,245,249,0.8)"
  const active = isDark ? "rgba(34,197,94,0.2)"  : "rgba(34,197,94,0.1)"
  const label  = selectedRoute ? (urbanRoutePolylines.find(r => r.id === selectedRoute)?.arabicName ?? selectedRoute) : "كل الخطوط"

  return (
    <div className="absolute right-4 top-4 z-[500]" style={{ direction: "rtl" }}>
      <motion.div layout className="overflow-hidden rounded-xl shadow-lg backdrop-blur-sm"
        style={{ background: bg, border: `1px solid ${border}` }}>
        <button onClick={() => setOpen(v => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
          style={{ background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = hover)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" style={{ color: "#22C55E" }} />
            <span className="text-sm font-semibold" style={{ color: txt }}>{label}</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4" style={{ color: muted }} /> : <ChevronDown className="h-4 w-4" style={{ color: muted }} />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ borderTop: `1px solid ${border}` }}>
              <div className="max-h-64 overflow-y-auto p-2">
                <button onClick={() => { onRouteSelect(null); setOpen(false) }}
                  className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: !selectedRoute ? active : "transparent", color: !selectedRoute ? "#22C55E" : txt }}
                  onMouseEnter={e => { if (selectedRoute) e.currentTarget.style.background = hover }}
                  onMouseLeave={e => { if (selectedRoute) e.currentTarget.style.background = "transparent" }}>
                  <MapPin className="h-4 w-4" style={{ color: !selectedRoute ? "#22C55E" : muted }} />
                  <span className="font-medium">عرض كل الخطوط</span>
                </button>
                <div className="mb-1 px-2 text-[11px] font-semibold" style={{ color: muted }}>خطوط النقل</div>
                {urbanRoutePolylines.map(r => (
                  <button key={r.id} onClick={() => { onRouteSelect(selectedRoute === r.id ? null : r.id); setOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{ background: selectedRoute === r.id ? active : "transparent", color: selectedRoute === r.id ? r.color : txt }}
                    onMouseEnter={e => { if (selectedRoute !== r.id) e.currentTarget.style.background = hover }}
                    onMouseLeave={e => { if (selectedRoute !== r.id) e.currentTarget.style.background = "transparent" }}>
                    <div className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ background: r.color, border: selectedRoute === r.id ? `2px solid ${r.color}` : "1px solid rgba(0,0,0,0.2)" }} />
                    <span className={selectedRoute === r.id ? "font-bold" : "font-medium"}>{r.arabicName}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// RENDERER A: MapLibre GL (WebGL available — production / real browsers)
// ════════════════════════════════════════════════════════════════════════════════
function MapLibreRenderer({ trackingLineId }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import("maplibre-gl").Map | null>(null)
  const initRef      = useRef(false)
  const { isDark }   = useTheme()

  const stationEls   = useRef<Array<{ el: HTMLElement; lines: string[] }>>([])
  const fringalEls   = useRef<HTMLElement[]>([])
  const simBuses     = useRef<Array<{ marker: import("maplibre-gl").Marker; routeId: string; offset: number }>>([])
  const driverRef    = useRef<import("maplibre-gl").Marker | null>(null)
  const userRef      = useRef<import("maplibre-gl").Marker | null>(null)
  const rafRef       = useRef<number | null>(null)

  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  const routeCoords = new Map<string, [number, number][]>()
  urbanRoutePolylines.forEach(r => {
    routeCoords.set(r.id, r.id === "line-11" ? fringalOutboundCoords : r.waypoints)
  })

  // Focus mode
  const applyFocus = (routeId: SelectedRoute) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const isFringal = (key: string) => key === "line-11-outbound" || key === "line-11-return"

    urbanRoutePolylines.forEach(r => {
      const keys = r.id === "line-11" ? ["line-11-outbound", "line-11-return"] : [r.id]
      keys.forEach(key => {
        if (!map.getLayer(`route-${key}`)) return
        const active = routeId === null || r.id === routeId
        map.setPaintProperty(`route-${key}`, "line-opacity", active ? (routeId ? 1 : 0.85) : 0.05)
        map.setPaintProperty(`route-${key}`, "line-width",   active ? (routeId ? 6 : 4) : 2)
        map.setPaintProperty(`glow-${key}`,  "line-opacity", active ? (routeId ? 0.32 : 0.18) : 0.02)
      })
    })

    stationEls.current.forEach(({ el, lines }) => {
      el.style.opacity = routeId === null || lines.includes(routeId) ? "1" : "0.1"
    })
    fringalEls.current.forEach(el => {
      el.style.opacity = routeId === null || routeId === "line-11" ? "1" : "0.1"
    })
    simBuses.current.forEach(({ marker, routeId: br }) => {
      marker.getElement().style.opacity = routeId === null || br === routeId ? "1" : "0"
    })
  }

  useEffect(() => {
    if (initRef.current || !containerRef.current) return
    initRef.current = true
    injectMapStyles()

    const initMap = async () => {
      const maplibregl = (await import("maplibre-gl")).default

      const CARTO_STYLE: import("maplibre-gl").StyleSpecification = {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
          },
        },
        layers: [{ id: "carto", type: "raster", source: "carto" }],
      }

      if (!containerRef.current) return
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: CARTO_STYLE,
        center: KHENCHELA_LNG_LAT,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      })
      mapRef.current = map

      map.on("load", async () => {
        const addRoute = (key: string, color: string, geoCoords: [number, number][]) => {
          map.addSource(`src-${key}`, {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: geoCoords }, properties: {} },
          })
          map.addLayer({ id: `glow-${key}`, type: "line", source: `src-${key}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": color, "line-width": 16, "line-opacity": 0.18, "line-blur": 6 } })
          map.addLayer({ id: `route-${key}`, type: "line", source: `src-${key}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": color, "line-width": 4, "line-opacity": 0.85, "line-dasharray": [2, 3] } })
        }

        // Urban routes (OSRM optional)
        for (const route of urbanRoutePolylines) {
          if (route.id === "line-11") continue
          let coords: [number, number][] = route.waypoints.map(([lat, lng]) => [lng, lat])
          try {
            const seg = route.waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";")
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${seg}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(4000) })
            if (res.ok) {
              const d = await res.json()
              if (d.routes?.[0]?.geometry?.coordinates) coords = d.routes[0].geometry.coordinates
            }
          } catch { /* use waypoints */ }
          addRoute(route.id, route.color, coords)

          // Stop markers
          route.waypoints.forEach((wp, i) => {
            const el = document.createElement("div")
            el.style.cssText = `width:14px;height:14px;background:${route.color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;`
            const m = new maplibregl.Marker({ element: el }).setLngLat([wp[1], wp[0]]).addTo(map)
            stationEls.current.push({ el, lines: [route.id] })
          })
        }

        // Fringal routes
        const fringalColor = "#2980B9"
        const addFringal = (coords: [number, number][], wps: typeof fringalOutboundWaypoints, key: "line-11-outbound" | "line-11-return") => {
          const geoCoords = coords.map(([lat, lng]) => [lng, lat] as [number, number])
          addRoute(key, fringalColor, geoCoords)
          wps.forEach(wp => {
            const el = document.createElement("div")
            if (wp.isTerminal) {
              el.innerHTML = `<div style="width:30px;height:30px;background:linear-gradient(135deg,#5DADE2,#1F618D);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;animation:tk-terminal-pulse 1.8s ease-in-out infinite;">${wp.isStart ? `<svg width="11" height="13" fill="white"><polygon points="1,0 11,6.5 1,13"/></svg>` : `<svg width="10" height="10" fill="white"><rect x="1" y="1" width="8" height="8" rx="1.5"/></svg>`}</div>`
            } else {
              el.innerHTML = `<div style="width:12px;height:12px;background:white;border:3px solid ${fringalColor};border-radius:50%;"></div>`
            }
            const m = new maplibregl.Marker({ element: el }).setLngLat([wp.coords[1], wp.coords[0]]).addTo(map)
            fringalEls.current.push(el)
          })
        }
        addFringal(fringalOutboundCoords, fringalOutboundWaypoints, "line-11-outbound")
        addFringal(fringalReturnCoords,   fringalReturnWaypoints,   "line-11-return")

        // Sim buses
        urbanRoutePolylines.forEach((route, idx) => {
          const coords = routeCoords.get(route.id) ?? route.waypoints
          const el = document.createElement("div")
          el.className = "tk-sim-bus"
          el.style.color = route.color
          el.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="3" fill="${route.color}" stroke="white" stroke-width="1.5"/><rect x="4" y="6" width="5" height="4" rx="1" fill="rgba(255,255,255,0.8)"/><rect x="13" y="6" width="5" height="4" rx="1" fill="rgba(255,255,255,0.8)"/><circle cx="6" cy="16" r="1.5" fill="white"/><circle cx="16" cy="16" r="1.5" fill="white"/></svg>`
          const offset = idx / urbanRoutePolylines.length
          const { lat, lng } = getSimPos(coords, offset)
          const marker = new maplibregl.Marker({ element: el, rotationAlignment: "map" }).setLngLat([lng, lat]).addTo(map)
          simBuses.current.push({ marker, routeId: route.id, offset })
        })

        // rAF loop
        const tick = () => {
          simBuses.current.forEach(b => {
            b.offset = (b.offset + 0.000035) % 1
            const coords = routeCoords.get(b.routeId) ?? []
            const { lat, lng, heading } = getSimPos(coords, b.offset)
            b.marker.setLngLat([lng, lat]); b.marker.setRotation(heading)
          })
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)

        setReady(true)
      })

      // ── Live driver tracking ── 0775453629 ──────────────────────────────────
      const driverDbRef = rtdbRef(rtdb, "drivers/0775453629/location")
      const unsubDriver = onValue(driverDbRef, snap => {
        const data = snap.val() as DriverLocation | null
        if (!data?.lat || !data?.lng) return
        if (!driverRef.current) {
          const el = document.createElement("div")
          el.style.cssText = `width:28px;height:28px;border-radius:50%;border:3px solid white;background:linear-gradient(135deg,#ec4899,#db2777);display:flex;align-items:center;justify-content:center;animation:tk-driver-pulse 2s ease-in-out infinite;cursor:pointer;`
          el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 4h8l2 6H6L8 4zM4 10v8h1v1a1 1 0 002 0v-1h10v1a1 1 0 002 0v-1h1v-8z"/></svg>`
          driverRef.current = new maplibregl.Marker({ element: el }).setLngLat([data.lng, data.lat]).addTo(map)
        } else {
          driverRef.current.setLngLat([data.lng, data.lat])
        }
      })

      return unsubDriver
    }

    let cleanup: (() => void) | undefined
    initMap().then(unsub => { cleanup = unsub })

    return () => {
      cleanup?.()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      driverRef.current?.remove()
      userRef.current?.remove()
      stationEls.current = []; fringalEls.current = []
      simBuses.current.forEach(b => b.marker.remove()); simBuses.current = []
      mapRef.current?.remove(); mapRef.current = null; initRef.current = false
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => applyFocus(selectedRoute), 80)
    return () => clearTimeout(t)
  }, [selectedRoute])

  const locateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      setLocating(false)
      const maplibregl = (await import("maplibre-gl")).default
      mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 })
      if (!userRef.current) {
        const el = document.createElement("div")
        el.style.cssText = `width:18px;height:18px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(59,130,246,0.3);`
        userRef.current = new maplibregl.Marker({ element: el }).setLngLat([pos.coords.longitude, pos.coords.latitude]).addTo(mapRef.current!)
      } else { userRef.current.setLngLat([pos.coords.longitude, pos.coords.latitude]) }
    }, () => setLocating(false))
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {ready && <RouteController selectedRoute={selectedRoute} onRouteSelect={setSelectedRoute} isDark={isDark} />}
      {ready && (
        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          onClick={locateMe}
          className="absolute bottom-10 right-4 z-[500] flex h-10 w-10 items-center justify-center rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-card transition-colors"
          aria-label="حدد موقعي">
          <LocateFixed className={`h-5 w-5 ${locating ? "animate-pulse text-primary" : "text-foreground"}`} />
        </motion.button>
      )}
      <AnimatePresence>
        {!ready && (
          <motion.div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0f172a" }}
            exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex flex-col items-center gap-3">
              <motion.div className="h-10 w-10 rounded-full border-[3px] border-primary/30 border-t-primary"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              <span className="text-sm text-slate-400">جاري تحميل الخريطة...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// RENDERER B: Leaflet + CartoDB Voyager (no WebGL — Replit preview / fallback)
// ════════════════════════════════════════════════════════════════════════════════
function LeafletDarkRenderer({ trackingLineId }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const initRef      = useRef(false)
  const driverRef    = useRef<L.Marker | null>(null)
  const simBusRef    = useRef<Array<{ marker: L.Marker; routeId: string; offset: number }>>([])
  const rafRef       = useRef<number | null>(null)
  const { isDark }   = useTheme()

  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  const routeLayers = useRef<Map<string, L.Polyline>>(new Map())
  const routeGlows  = useRef<Map<string, L.Polyline>>(new Map())
  const stationRefs = useRef<Array<{ marker: L.Marker; lines: string[] }>>([])
  const fringalRefs = useRef<L.Marker[]>([])
  const userRef     = useRef<L.Marker | null>(null)

  const routeCoords = new Map<string, [number, number][]>()
  urbanRoutePolylines.forEach(r => {
    routeCoords.set(r.id, r.id === "line-11" ? fringalOutboundCoords : r.waypoints)
  })

  const applyFocus = (routeId: SelectedRoute) => {
    routeLayers.current.forEach((poly, id) => {
      const active = routeId === null || id === routeId || (routeId === "line-11" && (id === "line-11-outbound" || id === "line-11-return"))
      poly.setStyle({ opacity: active ? (routeId ? 1 : 0.85) : 0.06, weight: active ? (routeId ? 6 : 4) : 2 })
    })
    routeGlows.current.forEach((g, id) => {
      const active = routeId === null || id === routeId || (routeId === "line-11" && (id === "line-11-outbound" || id === "line-11-return"))
      g.setStyle({ opacity: active ? (routeId ? 0.35 : 0.18) : 0.02 })
    })
    stationRefs.current.forEach(({ marker, lines }) => {
      marker.getElement()?.style && (marker.getElement()!.style.opacity = routeId === null || lines.some(l => l === routeId) ? "1" : "0.1")
    })
    fringalRefs.current.forEach(m => {
      m.getElement()?.style && (m.getElement()!.style.opacity = routeId === null || routeId === "line-11" ? "1" : "0.1")
    })
    simBusRef.current.forEach(({ marker, routeId: br }) => {
      marker.getElement()?.style && (marker.getElement()!.style.opacity = routeId === null || br === routeId ? "1" : "0")
    })
  }

  useEffect(() => {
    if (initRef.current || !containerRef.current) return
    initRef.current = true
    injectMapStyles()

    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false })
      .setView(KHENCHELA_CENTER, DEFAULT_ZOOM)
    mapRef.current = map

    // CartoDB Voyager (natural/light) tiles
    L.tileLayer(CARTO_VOYAGER_URL, {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map)

    // Urban routes
    urbanRoutePolylines.forEach(route => {
      const coords = routeCoords.get(route.id) ?? route.waypoints
      const glow = L.polyline(coords, { color: route.color, weight: 16, opacity: 0.18 }).addTo(map)
      const line = L.polyline(coords, { color: route.color, weight: 4, opacity: 0.85, dashArray: "8, 10" }).addTo(map)
      routeGlows.current.set(route.id, glow)
      routeLayers.current.set(route.id, line)

      route.waypoints.forEach(wp => {
        const el = document.createElement("div")
        el.style.cssText = `width:13px;height:13px;background:${route.color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.4);`
        const icon = L.divIcon({ html: el.outerHTML, className: "", iconSize: [13,13], iconAnchor: [6.5, 6.5] })
        const marker = L.marker(wp, { icon }).addTo(map)
        stationRefs.current.push({ marker, lines: [route.id] })
      })
    })

    // Fringal routes
    const fringalColor = "#2980B9"
    const addFringalTrack = (
      coords: [number, number][],
      wps: typeof fringalOutboundWaypoints,
      id: string,
    ) => {
      const glow = L.polyline(coords, { color: fringalColor, weight: 18, opacity: 0.18 }).addTo(map)
      const line = L.polyline(coords, { color: fringalColor, weight: 4, opacity: 0.85, dashArray: "8, 10" }).addTo(map)
      routeGlows.current.set(id, glow)
      routeLayers.current.set(id, line)

      wps.forEach(wp => {
        const size = wp.isTerminal ? 30 : 12
        const html = wp.isTerminal
          ? `<div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#5DADE2,#1F618D);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;animation:tk-terminal-pulse 1.8s ease-in-out infinite;">${wp.isStart ? `<svg width="10" height="12" fill="white"><polygon points="1,0 10,6 1,12"/></svg>` : `<svg width="9" height="9" fill="white"><rect x="1" y="1" width="7" height="7" rx="1.5"/></svg>`}</div>`
          : `<div style="width:${size}px;height:${size}px;background:white;border:3px solid ${fringalColor};border-radius:50%;"></div>`
        const icon = L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size/2, size/2] })
        const m = L.marker(wp.coords, { icon }).addTo(map)
        fringalRefs.current.push(m)
      })
    }
    addFringalTrack(fringalOutboundCoords, fringalOutboundWaypoints, "line-11-outbound")
    addFringalTrack(fringalReturnCoords,   fringalReturnWaypoints,   "line-11-return")

    // Station markers
    urbanStations.forEach(s => {
      const size = s.isMain ? 16 : 10
      const el = document.createElement("div")
      el.style.cssText = `width:${size}px;height:${size}px;background:#22C55E;border:${s.isMain?3:2}px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.4);`
      const icon = L.divIcon({ html: el.outerHTML, className: "", iconSize: [size,size], iconAnchor: [size/2,size/2] })
      const popup = `<div class="tk-pname">${s.name}</div><div class="tk-psub">${s.nameEn}</div>`
      const m = L.marker(s.position, { icon }).bindPopup(popup, { className: "tk-popup" }).addTo(map)
      stationRefs.current.push({ marker: m, lines: s.lines })
    })

    // Sim buses
    urbanRoutePolylines.forEach((route, idx) => {
      const coords = routeCoords.get(route.id) ?? route.waypoints
      const busHtml = `<svg class="tk-sim-bus" width="22" height="22" style="color:${route.color}" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="3" fill="${route.color}" stroke="white" stroke-width="1.5"/><rect x="4" y="6" width="5" height="4" rx="1" fill="rgba(255,255,255,0.8)"/><rect x="13" y="6" width="5" height="4" rx="1" fill="rgba(255,255,255,0.8)"/><circle cx="6" cy="16" r="1.5" fill="white"/><circle cx="16" cy="16" r="1.5" fill="white"/></svg>`
      const icon = L.divIcon({ html: busHtml, className: "", iconSize: [22,22], iconAnchor: [11,11] })
      const offset = idx / urbanRoutePolylines.length
      const { lat, lng } = getSimPos(coords, offset)
      const marker = L.marker([lat, lng], { icon, zIndexOffset: 50 }).addTo(map)
      simBusRef.current.push({ marker, routeId: route.id, offset })
    })

    // rAF sim bus loop
    const tick = () => {
      simBusRef.current.forEach(b => {
        b.offset = (b.offset + 0.000035) % 1
        const coords = routeCoords.get(b.routeId) ?? []
        const { lat, lng } = getSimPos(coords, b.offset)
        b.marker.setLatLng([lat, lng])
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // ── Live driver tracking ── 0775453629 ────────────────────────────────────
    const driverDbRef = rtdbRef(rtdb, "drivers/0775453629/location")
    const unsubDriver = onValue(driverDbRef, snap => {
      const data = snap.val() as DriverLocation | null
      if (!data?.lat || !data?.lng) return
      const html = `<div style="width:28px;height:28px;border-radius:50%;border:3px solid white;background:linear-gradient(135deg,#ec4899,#db2777);display:flex;align-items:center;justify-content:center;animation:tk-driver-pulse 2s ease-in-out infinite;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 4h8l2 6H6L8 4zM4 10v8h1v1a1 1 0 002 0v-1h10v1a1 1 0 002 0v-1h1v-8z"/></svg></div>`
      const icon = L.divIcon({ html, className: "", iconSize: [28,28], iconAnchor: [14,14] })
      if (!driverRef.current) {
        driverRef.current = L.marker([data.lat, data.lng], { icon, zIndexOffset: 1000 }).addTo(map)
      } else {
        driverRef.current.setLatLng([data.lat, data.lng])
      }
    })

    setReady(true)

    return () => {
      unsubDriver()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      map.remove()
      mapRef.current = null
      initRef.current = false
      stationRefs.current = []; fringalRefs.current = []
      simBusRef.current = []
    }
  }, [])

  useEffect(() => {
    applyFocus(selectedRoute)
  }, [selectedRoute])

  const locateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(pos => {
      setLocating(false)
      const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
      mapRef.current?.setView(latlng, 15, { animate: true })
      if (!userRef.current) {
        const html = `<div style="width:18px;height:18px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(59,130,246,0.3);"></div>`
        const icon = L.divIcon({ html, className: "", iconSize: [18,18], iconAnchor: [9,9] })
        userRef.current = L.marker(latlng, { icon }).addTo(mapRef.current!)
      } else { userRef.current.setLatLng(latlng) }
    }, () => setLocating(false))
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {ready && <RouteController selectedRoute={selectedRoute} onRouteSelect={setSelectedRoute} isDark={isDark} />}
      {ready && (
        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          onClick={locateMe}
          className="absolute bottom-10 right-4 z-[500] flex h-10 w-10 items-center justify-center rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-card transition-colors"
          aria-label="حدد موقعي">
          <LocateFixed className={`h-5 w-5 ${locating ? "animate-pulse text-primary" : "text-foreground"}`} />
        </motion.button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — auto-selects the best renderer
// ════════════════════════════════════════════════════════════════════════════════
export default function MaplibreMap(props: MapProps) {
  // null = not yet detected, true = WebGL ok, false = no WebGL
  const [webgl, setWebgl] = useState<boolean | null>(null)

  useEffect(() => {
    setWebgl(detectWebGL())
  }, [])

  if (webgl === null) {
    // Initial load — show dark background while detecting
    return (
      <div className="relative h-full w-full flex items-center justify-center" style={{ background: "#0f172a" }}>
        <motion.div className="h-10 w-10 rounded-full border-[3px] border-primary/30 border-t-primary"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    )
  }

  // WebGL available → MapLibre GL (production quality)
  // No WebGL (Replit sandbox) → Leaflet + CartoDB Dark Matter (same tiles, canvas 2D)
  return webgl ? <MapLibreRenderer {...props} /> : <LeafletDarkRenderer {...props} />
}
