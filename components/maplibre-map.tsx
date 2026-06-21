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
import {
  hammaOutboundCoords,
  hammaReturnCoords,
  hammaOutboundWaypoints,
  hammaReturnWaypoints,
} from "@/lib/data/hamma-gpx-data"

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

// ── Snap a [lat,lng] point to the nearest point on a [lat,lng][] polyline ────
function snapToPolyline(point: [number, number], polyline: [number, number][]): [number, number] {
  let bestDist = Infinity, bestLat = point[0], bestLng = point[1]
  for (let i = 0; i < polyline.length - 1; i++) {
    const [ay, ax] = polyline[i];   const [by, bx] = polyline[i+1]  // y=lat, x=lng
    const [py, px] = point
    const abx = bx-ax, aby = by-ay; const len2 = abx*abx + aby*aby
    if (len2 === 0) continue
    const t = Math.max(0, Math.min(1, ((px-ax)*abx + (py-ay)*aby) / len2))
    const nx = ax + t*abx, ny = ay + t*aby
    const d = Math.hypot(px-nx, py-ny)
    if (d < bestDist) { bestDist = d; bestLat = ny; bestLng = nx }
  }
  return [bestLat, bestLng]
}

// ── Chevron point computation (shared by MapLibre rAF loop) ──────────────────
type ChevFC = { type:"FeatureCollection"; features:Array<{ type:"Feature"; geometry:{ type:"Point"; coordinates:[number,number] }; properties:{ bearing:number } }> }
function computeChevPoints(coords:[number,number][], phase:number, spacingDeg = 0.007): ChevFC {
  const features: ChevFC["features"] = []
  if (coords.length < 2) return { type:"FeatureCollection", features }
  const lens: number[] = []; let total = 0
  for (let i = 0; i < coords.length-1; i++) {
    const d = Math.hypot(coords[i+1][0]-coords[i][0], coords[i+1][1]-coords[i][1])
    lens.push(d); total += d
  }
  if (total === 0) return { type:"FeatureCollection", features }
  const startOff = (phase * spacingDeg) % spacingDeg
  for (let dist = startOff; dist < total; dist += spacingDeg) {
    let acc = 0
    for (let i = 0; i < lens.length; i++) {
      if (acc + lens[i] >= dist || i === lens.length-1) {
        const t = lens[i] > 0 ? Math.min(1,(dist-acc)/lens[i]) : 0
        const lng = coords[i][0] + t*(coords[i+1][0]-coords[i][0])
        const lat = coords[i][1] + t*(coords[i+1][1]-coords[i][1])
        // icon is drawn pointing right; convert route direction to MapLibre bearing (CW from north)
        const bearing = Math.atan2(coords[i+1][0]-coords[i][0], coords[i+1][1]-coords[i][1])*180/Math.PI - 90
        features.push({ type:"Feature", geometry:{ type:"Point", coordinates:[lng,lat] }, properties:{ bearing } })
        break
      }
      acc += lens[i]
    }
  }
  return { type:"FeatureCollection", features }
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
    .tk-sim-bus { will-change:transform; }
    /* Stop label visibility — toggled by map zoom */
    .tk-stop-label { font-size:11px;font-weight:600;color:#1e293b;background:rgba(255,255,255,0.92);
      padding:2px 6px;border-radius:5px;white-space:nowrap;pointer-events:none;
      position:absolute;left:14px;top:50%;transform:translateY(-50%);
      display:none;box-shadow:0 1px 4px rgba(0,0,0,0.18); }
    .tk-stop-wrapper { position:relative;display:flex;align-items:center;cursor:pointer; }
    .tk-stop-wrapper > div { box-sizing:border-box; }
    .tk-labels-on .tk-stop-label { display:block; }
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
function MapLibreRenderer({ trackingLineId, isFullscreen }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import("maplibre-gl").Map | null>(null)
  const initRef      = useRef(false)
  const { isDark }   = useTheme()

  const simBuses         = useRef<Array<{ marker: import("maplibre-gl").Marker; routeId: string; offset: number; direction: number }>>([])
  const driverRef        = useRef<import("maplibre-gl").Marker | null>(null)
  const userRef          = useRef<import("maplibre-gl").Marker | null>(null)
  const rafRef           = useRef<number | null>(null)
  const chevronCoordsRef = useRef<Map<string, [number,number][]>>(new Map())

  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  const routeCoords = new Map<string, [number, number][]>()
  urbanRoutePolylines.forEach(r => {
    if (r.id === "line-11") routeCoords.set(r.id, fringalOutboundCoords)
    else if (r.id === "line-05") routeCoords.set(r.id, hammaOutboundCoords)
    else routeCoords.set(r.id, r.waypoints)
  })

  // Focus mode — visibility-based route isolation + native stop layer filtering
  const applyFocus = (routeId: SelectedRoute) => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      setTimeout(() => applyFocus(routeId), 100)
      return
    }

    // Route layers: use visibility "none"/"visible" so non-selected layers are fully removed
    // from the render pipeline (not just transparent).
    urbanRoutePolylines.forEach(r => {
      let keys: string[]
      if (r.id === "line-11") keys = ["line-11-outbound", "line-11-return"]
      else if (r.id === "line-05") keys = ["line-05-outbound", "line-05-return"]
      else keys = [r.id]
      const active  = routeId === null || r.id === routeId
      const focused = routeId !== null && r.id === routeId
      const vis = active ? "visible" : "none"
      keys.forEach(key => {
        if (map.getLayer(`glow-${key}`)) {
          map.setLayoutProperty(`glow-${key}`, "visibility", vis)
          if (active) map.setPaintProperty(`glow-${key}`, "line-opacity", focused ? 0.30 : 0.15)
        }
        if (map.getLayer(`casing-${key}`)) {
          map.setLayoutProperty(`casing-${key}`, "visibility", vis)
          if (active) {
            map.setPaintProperty(`casing-${key}`, "line-opacity", focused ? 0.95 : 0.82)
            map.setPaintProperty(`casing-${key}`, "line-width",   focused ? 10 : 8)
          }
        }
        if (map.getLayer(`route-${key}`)) {
          map.setLayoutProperty(`route-${key}`, "visibility", vis)
          if (active) map.setPaintProperty(`route-${key}`, "line-width", focused ? 7 : 5)
        }
        if (map.getLayer(`chev-${key}`))
          map.setLayoutProperty(`chev-${key}`, "visibility", vis)
      })
    })

    // Native stop layers — filter by selected route using linesStr substring match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stopsFilter: any = routeId === null ? null : ["in", `,${routeId},`, ["get", "linesStr"]]
    if (map.getLayer("stops-circle")) map.setFilter("stops-circle", stopsFilter)
    if (map.getLayer("stops-label"))  map.setFilter("stops-label",  stopsFilter)

    // Simulated buses
    simBuses.current.forEach(({ marker, routeId: br }) => {
      marker.getElement().style.opacity = routeId === null || br === routeId ? "1" : "0"
    })

    // Fly to selected route bounds
    if (routeId) {
      if (routeId === "line-11") {
        const all = [...fringalOutboundCoords, ...fringalReturnCoords]
        const lats = all.map(c => c[0]), lngs = all.map(c => c[1])
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14 })
      } else if (routeId === "line-05") {
        const all = [...hammaOutboundCoords, ...hammaReturnCoords]
        const lats = all.map(c => c[0]), lngs = all.map(c => c[1])
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 14 })
      } else {
        const route = urbanRoutePolylines.find(r => r.id === routeId)
        if (route) {
          const coords = routeCoords.get(routeId) ?? route.waypoints
          const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1])
          map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 50, maxZoom: 15 })
        }
      }
    }
  }

  useEffect(() => {
    if (initRef.current || !containerRef.current) return
    initRef.current = true
    injectMapStyles()

    const initMap = async () => {
      const maplibregl = (await import("maplibre-gl")).default

      const CARTO_STYLE: import("maplibre-gl").StyleSpecification = {
        version: 8,
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
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
        // ── Chevron arrow sprite (drawn once, shared by all symbol layers) ─────
        const arrowSz = 24
        const arrowCanvas = document.createElement("canvas")
        arrowCanvas.width = arrowSz; arrowCanvas.height = arrowSz
        const actx = arrowCanvas.getContext("2d")!
        actx.clearRect(0, 0, arrowSz, arrowSz)
        actx.fillStyle = "rgba(255,255,255,0.88)"
        // Right-pointing chevron — MapLibre rotates it along the line
        actx.beginPath()
        actx.moveTo(7,  4)
        actx.lineTo(18, 12)
        actx.lineTo(7,  20)
        actx.lineTo(7,  16)
        actx.lineTo(13, 12)
        actx.lineTo(7,  8)
        actx.closePath()
        actx.fill()
        const arrowImageData = actx.getImageData(0, 0, arrowSz, arrowSz)
        map.addImage("chevron-arrow", { width: arrowSz, height: arrowSz, data: new Uint8Array(arrowImageData.data.buffer) })

        // ── Premium 3-layer route renderer ────────────────────────────────────
        const addRoute = (key: string, color: string, geoCoords: [number, number][]) => {
          map.addSource(`src-${key}`, {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: geoCoords }, properties: {} },
          })
          // Layer 1 — ambient glow
          map.addLayer({ id: `glow-${key}`, type: "line", source: `src-${key}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": color, "line-width": 20, "line-opacity": 0.15, "line-blur": 8 } })
          // Layer 2 — white casing (border effect)
          map.addLayer({ id: `casing-${key}`, type: "line", source: `src-${key}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.82 } })
          // Layer 3 — colored inner line
          map.addLayer({ id: `route-${key}`, type: "line", source: `src-${key}`,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": color, "line-width": 5, "line-opacity": 1 } })
          // Layer 4 — animated chevrons (points updated each rAF frame)
          map.addSource(`chev-src-${key}`, { type:"geojson", data:{ type:"FeatureCollection", features:[] } })
          map.addLayer({ id:`chev-${key}`, type:"symbol", source:`chev-src-${key}`,
            layout:{
              "icon-image": "chevron-arrow",
              "icon-size": 0.78,
              "icon-rotate": ["get","bearing"],
              "icon-rotation-alignment": "map",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          })
          chevronCoordsRef.current.set(key, geoCoords)
        }

        // Urban routes (OSRM optional)
        for (const route of urbanRoutePolylines) {
          if (route.id === "line-11") continue
          if (route.id === "line-05") continue
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
        }

        // ── Native stop layers: collect all stops as GeoJSON then add circle + symbol layers ──
        // Native layers are rendered by WebGL at exact geographic coords — zero zoom drift.
        type StopFeat = {
          type: "Feature"
          geometry: { type: "Point"; coordinates: [number, number] }
          properties: { name: string; linesStr: string; color: string; isMain: boolean }
        }
        const stopFeatures: StopFeat[] = []

        // Urban stops
        urbanStations.forEach(s => {
          const color = urbanRoutePolylines.find(r => s.lines.includes(r.id))?.color ?? "#64748b"
          stopFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [s.position[1], s.position[0]] },
            properties: { name: s.name, linesStr: `,${s.lines.join(",")},`, color, isMain: s.isMain },
          })
        })

        // Fringal routes
        const fringalColor = "#2980B9"
        const addFringal = (coords: [number, number][], key: "line-11-outbound" | "line-11-return") => {
          addRoute(key, fringalColor, coords.map(([lat, lng]) => [lng, lat] as [number, number]))
        }
        addFringal(fringalOutboundCoords, "line-11-outbound")
        addFringal(fringalReturnCoords,   "line-11-return")
        // Fringal stops — deduplicated, snapped to outbound polyline
        const seenFringal = new Set<string>()
        ;[...fringalOutboundWaypoints, ...fringalReturnWaypoints].forEach(wp => {
          if (seenFringal.has(wp.name)) return
          seenFringal.add(wp.name)
          const snapped = snapToPolyline(wp.coords, fringalOutboundCoords)
          stopFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [snapped[1], snapped[0]] },
            properties: { name: wp.name, linesStr: ",line-11,", color: fringalColor, isMain: wp.isTerminal },
          })
        })

        // Hamma routes (خط 05 — الحامة-خنشلة)
        const hammaColor = "#27AE60"
        const addHamma = (coords: [number, number][], key: "line-05-outbound" | "line-05-return") => {
          addRoute(key, hammaColor, coords.map(([lat, lng]) => [lng, lat] as [number, number]))
        }
        addHamma(hammaOutboundCoords, "line-05-outbound")
        addHamma(hammaReturnCoords,   "line-05-return")
        // Hamma stops — deduplicated, snapped to outbound polyline
        const seenHamma = new Set<string>()
        ;[...hammaOutboundWaypoints, ...hammaReturnWaypoints].forEach(wp => {
          if (seenHamma.has(wp.name)) return
          seenHamma.add(wp.name)
          const snapped = snapToPolyline(wp.coords, hammaOutboundCoords)
          stopFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [snapped[1], snapped[0]] },
            properties: { name: wp.name, linesStr: ",line-05,", color: hammaColor, isMain: wp.isTerminal },
          })
        })

        // Add GeoJSON source + circle layer (no drift — rendered in WebGL at exact coords)
        map.addSource("stops", {
          type: "geojson",
          data: { type: "FeatureCollection", features: stopFeatures },
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addLayer({
          id: "stops-circle",
          type: "circle",
          source: "stops",
          paint: {
            "circle-radius":        ["case", ["get", "isMain"], 6, 4]       as any,
            "circle-color":         "white",
            "circle-stroke-width":  ["case", ["get", "isMain"], 3, 2]       as any,
            "circle-stroke-color":  ["get", "color"]                        as any,
            "circle-stroke-opacity": 1,
          },
        } as any)
        // Symbol labels — minzoom keeps them hidden until z14, no JS listener needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addLayer({
          id: "stops-label",
          type: "symbol",
          source: "stops",
          minzoom: 14,
          layout: {
            "text-field":             ["get", "name"]          as any,
            "text-size":              11,
            "text-font":              ["Noto Sans Regular"],
            "text-anchor":            "left",
            "text-offset":            [1.2, 0]                 as any,
            "text-allow-overlap":     false,
            "text-ignore-placement":  false,
            "text-max-width":         8,
          },
          paint: {
            "text-color":       "#1e293b",
            "text-halo-color":  "rgba(255,255,255,0.92)",
            "text-halo-width":  2,
          },
        } as any)

        // ── Chevron rAF animation loop ───────────────────────────────────────
        let chevPhase = 0; let lastTs = 0
        const animChev = (ts: number) => {
          const dt = Math.min((lastTs ? ts - lastTs : 16), 100) / 1000
          lastTs = ts
          chevPhase = (chevPhase + 0.14 * dt) % 1
          chevronCoordsRef.current.forEach((coords, key) => {
            const src = map.getSource(`chev-src-${key}`) as import("maplibre-gl").GeoJSONSource | undefined
            src?.setData(computeChevPoints(coords, chevPhase) as unknown as import("maplibre-gl").GeoJSONSourceSpecification["data"])
          })
          rafRef.current = requestAnimationFrame(animChev)
        }
        rafRef.current = requestAnimationFrame(animChev)

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
          driverRef.current = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([data.lng, data.lat]).addTo(map)
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
        userRef.current = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([pos.coords.longitude, pos.coords.latitude]).addTo(mapRef.current!)
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
          className={`absolute ${isFullscreen ? "bottom-20" : "bottom-4"} right-4 z-[500] flex h-10 w-10 items-center justify-center rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-card transition-colors`}
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
function LeafletDarkRenderer({ trackingLineId, isFullscreen }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const initRef      = useRef(false)
  const driverRef    = useRef<L.Marker | null>(null)
  const simBusRef    = useRef<Array<{ marker: L.Marker; routeId: string; offset: number; direction: number }>>([])
  const rafRef       = useRef<number | null>(null)
  const { isDark }   = useTheme()

  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  const routeLayers   = useRef<Map<string, L.Polyline>>(new Map())
  const routeGlows    = useRef<Map<string, L.Polyline>>(new Map())
  const routeCasings  = useRef<Map<string, L.Polyline>>(new Map())
  const stationRefs = useRef<Array<{ marker: L.Marker; lines: string[] }>>([])
  const fringalRefs = useRef<L.Marker[]>([])
  const hammaRefs   = useRef<L.Marker[]>([])
  const userRef     = useRef<L.Marker | null>(null)
  const chevMarkersRef = useRef<Array<{ marker: L.Marker; routeId: string; phase: number }>>([])

  const routeCoords = new Map<string, [number, number][]>()
  urbanRoutePolylines.forEach(r => {
    if (r.id === "line-11") routeCoords.set(r.id, fringalOutboundCoords)
    else if (r.id === "line-05") routeCoords.set(r.id, hammaOutboundCoords)
    else routeCoords.set(r.id, r.waypoints)
  })

  const applyFocus = (routeId: SelectedRoute) => {
    const isActive = (id: string) =>
      routeId === null || id === routeId
        || (routeId === "line-11" && (id === "line-11-outbound" || id === "line-11-return"))
        || (routeId === "line-05" && (id === "line-05-outbound" || id === "line-05-return"))
    const focused = (id: string) => routeId !== null && isActive(id)

    routeLayers.current.forEach((poly, id) => {
      const a = isActive(id); const f = focused(id)
      poly.setStyle({ opacity: a ? 1 : 0, weight: f ? 7 : 5 })
    })
    routeCasings.current.forEach((casing, id) => {
      const a = isActive(id); const f = focused(id)
      casing.setStyle({ opacity: a ? (f ? 0.95 : 0.82) : 0, weight: f ? 10 : 8 })
    })
    routeGlows.current.forEach((g, id) => {
      const a = isActive(id); const f = focused(id)
      g.setStyle({ opacity: a ? (f ? 0.32 : 0.15) : 0 })
    })
    stationRefs.current.forEach(({ marker, lines }) => {
      const el = marker.getElement()
      if (el?.style) el.style.opacity = routeId === null || lines.some(l => l === routeId) ? "1" : "0"
    })
    fringalRefs.current.forEach(m => {
      const el = m.getElement()
      if (el?.style) el.style.opacity = routeId === null || routeId === "line-11" ? "1" : "0"
    })
    hammaRefs.current.forEach(m => {
      const el = m.getElement()
      if (el?.style) el.style.opacity = routeId === null || routeId === "line-05" ? "1" : "0"
    })
    simBusRef.current.forEach(({ marker, routeId: br }) => {
      marker.getElement()?.style && (marker.getElement()!.style.opacity = routeId === null || br === routeId ? "1" : "0")
    })
    chevMarkersRef.current.forEach(({ marker, routeId: cr }) => {
      const el = marker.getElement()
      if (el?.style) el.style.opacity = isActive(cr) ? "1" : "0"
    })

    if (routeId && mapRef.current) {
      const map = mapRef.current
      if (routeId === "line-11") {
        map.fitBounds(L.latLngBounds([...fringalOutboundCoords, ...fringalReturnCoords]), { padding: [60, 60], maxZoom: 14 })
      } else if (routeId === "line-05") {
        map.fitBounds(L.latLngBounds([...hammaOutboundCoords, ...hammaReturnCoords]), { padding: [60, 60], maxZoom: 14 })
      } else {
        const route = urbanRoutePolylines.find(r => r.id === routeId)
        if (route) {
          const coords = routeCoords.get(routeId) ?? route.waypoints
          map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 15 })
        }
      }
    }
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
      if (route.id === "line-11" || route.id === "line-05") return
      const coords = routeCoords.get(route.id) ?? route.waypoints
      const glow   = L.polyline(coords, { color: route.color, weight: 20, opacity: 0.15 }).addTo(map)
      const casing = L.polyline(coords, { color: "#ffffff",   weight: 8,  opacity: 0.82, lineCap: "round", lineJoin: "round" }).addTo(map)
      const line   = L.polyline(coords, { color: route.color, weight: 5,  opacity: 1,    lineCap: "round", lineJoin: "round" }).addTo(map)
      routeGlows.current.set(route.id, glow)
      routeCasings.current.set(route.id, casing)
      routeLayers.current.set(route.id, line)

      // (station markers rendered in the single urbanStations pass below)
    })

    // Fringal routes
    const fringalColor = "#2980B9"
    const addFringalTrack = (coords: [number, number][], id: string) => {
      const glow   = L.polyline(coords, { color: fringalColor, weight: 20, opacity: 0.15 }).addTo(map)
      const casing = L.polyline(coords, { color: "#ffffff",    weight: 8,  opacity: 0.82, lineCap: "round", lineJoin: "round" }).addTo(map)
      const line   = L.polyline(coords, { color: fringalColor, weight: 5,  opacity: 1,    lineCap: "round", lineJoin: "round" }).addTo(map)
      routeGlows.current.set(id, glow); routeCasings.current.set(id, casing); routeLayers.current.set(id, line)
    }
    addFringalTrack(fringalOutboundCoords, "line-11-outbound")
    addFringalTrack(fringalReturnCoords,   "line-11-return")
    // Deduplicated fringal stops — snapped, one per unique name
    const seenFringalL = new Set<string>()
    ;[...fringalOutboundWaypoints, ...fringalReturnWaypoints].forEach(wp => {
      if (seenFringalL.has(wp.name)) return
      seenFringalL.add(wp.name)
      const snapped = snapToPolyline(wp.coords, fringalOutboundCoords)
      const sz = wp.isTerminal ? 12 : 8; const bw = wp.isTerminal ? 3 : 2.5
      const html = `<div class="tk-stop-wrapper" style="width:${sz}px;height:${sz}px;"><div style="width:${sz}px;height:${sz}px;background:white;border:${bw}px solid ${fringalColor};border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div><span class="tk-stop-label">${wp.name}</span></div>`
      const icon = L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz/2, sz/2] })
      fringalRefs.current.push(L.marker(snapped, { icon }).addTo(map))
    })

    // Hamma routes (خط 05 — الحامة-خنشلة)
    const hammaColor = "#27AE60"
    const addHammaTrack = (coords: [number, number][], id: string) => {
      const glow   = L.polyline(coords, { color: hammaColor, weight: 20, opacity: 0.15 }).addTo(map)
      const casing = L.polyline(coords, { color: "#ffffff",  weight: 8,  opacity: 0.82, lineCap: "round", lineJoin: "round" }).addTo(map)
      const line   = L.polyline(coords, { color: hammaColor, weight: 5,  opacity: 1,    lineCap: "round", lineJoin: "round" }).addTo(map)
      routeGlows.current.set(id, glow); routeCasings.current.set(id, casing); routeLayers.current.set(id, line)
    }
    addHammaTrack(hammaOutboundCoords, "line-05-outbound")
    addHammaTrack(hammaReturnCoords,   "line-05-return")
    // Deduplicated hamma stops — snapped, one per unique name
    const seenHammaL = new Set<string>()
    ;[...hammaOutboundWaypoints, ...hammaReturnWaypoints].forEach(wp => {
      if (seenHammaL.has(wp.name)) return
      seenHammaL.add(wp.name)
      const snapped = snapToPolyline(wp.coords, hammaOutboundCoords)
      const sz = wp.isTerminal ? 12 : 8; const bw = wp.isTerminal ? 3 : 2.5
      const html = `<div class="tk-stop-wrapper" style="width:${sz}px;height:${sz}px;"><div style="width:${sz}px;height:${sz}px;background:white;border:${bw}px solid ${hammaColor};border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div><span class="tk-stop-label">${wp.name}</span></div>`
      const icon = L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz/2, sz/2] })
      hammaRefs.current.push(L.marker(snapped, { icon }).addTo(map))
    })

    // ── Station markers (single pass — premium white circle + colored border) ──
    urbanStations.forEach(s => {
      const sz = s.isMain ? 12 : 8
      const bw = s.isMain ? 3 : 2.5
      const firstLineColor = urbanRoutePolylines.find(r => s.lines.includes(r.id))?.color ?? "#64748b"
      const html = `<div class="tk-stop-wrapper" style="width:${sz}px;height:${sz}px;"><div style="width:${sz}px;height:${sz}px;background:white;border:${bw}px solid ${firstLineColor};border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div><span class="tk-stop-label">${s.name}</span></div>`
      const icon = L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz/2, sz/2] })
      const popup = `<div class="tk-pname">${s.name}</div><div class="tk-psub">${s.nameEn}</div>`
      const m = L.marker(s.position, { icon }).bindPopup(popup, { className: "tk-popup" }).addTo(map)
      stationRefs.current.push({ marker: m, lines: s.lines })
    })

    // ── Zoom-based label visibility ────────────────────────────────────────────
    const updateLeafletLabels = () => {
      const show = map.getZoom() >= 14
      containerRef.current?.classList.toggle("tk-labels-on", show)
    }
    map.on("zoomend", updateLeafletLabels)
    updateLeafletLabels()

    // ── Leaflet chevron animation — 4 moving chevron DIVs per route ────────────
    const chevronHtml = (color: string) =>
      `<div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;opacity:0.9;">
        <svg viewBox="0 0 12 12" width="12" height="12">
          <path d="M3 1 L9 6 L3 11 L3 8.5 L6.5 6 L3 3.5Z" fill="${color}" stroke="white" stroke-width="0.8"/>
        </svg>
      </div>`
    const allLeafletRoutes: Array<{ id: string; coords: [number, number][]; color: string }> = [
      ...urbanRoutePolylines
        .filter(r => r.id !== "line-11" && r.id !== "line-05")
        .map(r => ({ id: r.id, coords: routeCoords.get(r.id) ?? r.waypoints, color: r.color })),
      { id: "line-11-outbound", coords: fringalOutboundCoords, color: "#2980B9" },
      { id: "line-11-return",   coords: fringalReturnCoords,   color: "#2980B9" },
      { id: "line-05-outbound", coords: hammaOutboundCoords,   color: "#27AE60" },
      { id: "line-05-return",   coords: hammaReturnCoords,     color: "#27AE60" },
    ]
    chevMarkersRef.current = []
    allLeafletRoutes.forEach(route => {
      for (let i = 0; i < 4; i++) {
        const phase0 = i / 4
        const icon = L.divIcon({ html: chevronHtml(route.color), className: "", iconSize: [14, 14], iconAnchor: [7, 7] })
        const pos = getSimPos(route.coords, phase0)
        const m = L.marker([pos.lat, pos.lng], { icon, interactive: false, zIndexOffset: -10 }).addTo(map)
        chevMarkersRef.current.push({ marker: m, routeId: route.id, phase: phase0 })
      }
    })

    const CHEV_SPEED = 0.12
    let lastChevTs = 0
    const animLeafletChev = (ts: number) => {
      const dt = Math.min((lastChevTs ? ts - lastChevTs : 16), 100) / 1000
      lastChevTs = ts
      chevMarkersRef.current.forEach(entry => {
        entry.phase = (entry.phase + CHEV_SPEED * dt) % 1
        const route = allLeafletRoutes.find(r => r.id === entry.routeId)
        if (!route) return
        const pos = getSimPos(route.coords, entry.phase)
        const heading = pos.heading
        const el = entry.marker.getElement()
        if (el) {
          const svg = el.querySelector("path")
          if (svg) {
            const parent = svg.parentElement as SVGElement | null
            if (parent) parent.style.transform = `rotate(${heading}deg)`
          }
        }
        entry.marker.setLatLng([pos.lat, pos.lng])
      })
      rafRef.current = requestAnimationFrame(animLeafletChev)
    }
    rafRef.current = requestAnimationFrame(animLeafletChev)

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
      chevMarkersRef.current.forEach(e => e.marker.remove())
      chevMarkersRef.current = []
      map.remove()
      mapRef.current = null
      initRef.current = false
      stationRefs.current = []; fringalRefs.current = []; hammaRefs.current = []
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
          className={`absolute ${isFullscreen ? "bottom-20" : "bottom-4"} right-4 z-[500] flex h-10 w-10 items-center justify-center rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-card transition-colors`}
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
