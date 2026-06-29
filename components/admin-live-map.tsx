"use client"

import { useEffect, useRef, useState } from "react"
import { rtdb } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { MapPin, Radio, WifiOff } from "lucide-react"

interface DriverPin {
  phone: string
  lat: number
  lng: number
  timestamp: number | null
}

export function AdminLiveMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const [drivers, setDrivers] = useState<DriverPin[]>([])
  const [tilesReady, setTilesReady] = useState(false)
  const isInitRef = useRef(false)

  // Init Leaflet map once
  useEffect(() => {
    if (isInitRef.current || !containerRef.current) return
    isInitRef.current = true

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css")

      const container = containerRef.current
      if (!container) return
      const el = container as any
      if (el._leaflet_id) return

      const map = L.map(container, {
        center: [35.4377, 7.1458],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
      })

      // Dark tile layer (CartoDB Dark Matter)
      const tl = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          keepBuffer: 3,
          updateWhenIdle: true,
          updateWhenZooming: false,
          crossOrigin: "anonymous",
        }
      ).addTo(map)

      tl.on("load", () => setTilesReady(true))
      setTimeout(() => setTilesReady(true), 2000)

      mapRef.current = map

      // Resize fix
      setTimeout(() => map.invalidateSize(), 200)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        isInitRef.current = false
      }
    }
  }, [])

  // Subscribe to RTDB and update markers
  useEffect(() => {
    const unsub = onValue(ref(rtdb, "drivers"), async (snap) => {
      if (!snap.exists()) {
        setDrivers([])
        return
      }

      const L = (await import("leaflet")).default
      const map = mapRef.current
      if (!map) return

      const data = snap.val() as Record<string, any>
      const pins: DriverPin[] = []
      const seenPhones = new Set<string>()

      for (const [phone, val] of Object.entries(data)) {
        const loc = val?.location
        if (!loc?.lat || !loc?.lng) continue

        const pin: DriverPin = {
          phone,
          lat: loc.lat,
          lng: loc.lng,
          timestamp: loc.timestamp ?? null,
        }
        pins.push(pin)
        seenPhones.add(phone)

        const isLive = pin.timestamp ? Date.now() - pin.timestamp < 5 * 60 * 1000 : false
        const color = isLive ? "#10B981" : "#64748B"

        const iconHtml = `
          <div style="
            width:28px;height:28px;border-radius:50%;
            background:linear-gradient(135deg,${color},${color}cc);
            border:2px solid white;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 0 2px ${color}55,0 2px 8px rgba(0,0,0,0.4);
            ${isLive ? `animation:adminPulse 2s ease-in-out infinite;` : ""}
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
              <rect x="1" y="6" width="22" height="12" rx="4"/>
              <path d="M5 6V4M19 6V4"/>
              <circle cx="7" cy="14" r="1.5" fill="white"/>
              <circle cx="17" cy="14" r="1.5" fill="white"/>
            </svg>
          </div>
        `

        const icon = L.divIcon({
          html: iconHtml,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const popupHtml = `
          <div style="font-family:system-ui;font-size:12px;min-width:160px;color:#1e293b">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:${color}">${isLive ? "🟢 Live" : "⚫ Offline"}</div>
            <div style="color:#475569;margin-bottom:2px">${phone}</div>
            <div style="font-family:monospace;font-size:11px;color:#64748b">${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</div>
            ${pin.timestamp ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px">Updated: ${new Date(pin.timestamp).toLocaleTimeString()}</div>` : ""}
          </div>
        `

        if (markersRef.current[phone]) {
          markersRef.current[phone].setLatLng([loc.lat, loc.lng])
          markersRef.current[phone].setIcon(icon)
          markersRef.current[phone].getPopup()?.setContent(popupHtml)
        } else {
          const marker = L.marker([loc.lat, loc.lng], { icon })
            .bindPopup(popupHtml, { maxWidth: 220 })
            .addTo(map)
          markersRef.current[phone] = marker
        }
      }

      // Remove stale markers
      for (const phone of Object.keys(markersRef.current)) {
        if (!seenPhones.has(phone)) {
          markersRef.current[phone].remove()
          delete markersRef.current[phone]
        }
      }

      setDrivers(pins)
    })

    return () => unsub()
  }, [])

  const liveCount = drivers.filter(
    (d) => d.timestamp && Date.now() - d.timestamp < 5 * 60 * 1000
  ).length

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60 flex-shrink-0">
        <MapPin className="h-4 w-4 text-emerald-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">Live Dispatcher Map</h3>
          <p className="text-xs text-slate-500">{drivers.length} tracked • {liveCount} live</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Radio style={{ width: 12, height: 12 }} />
            {liveCount} Active
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <WifiOff style={{ width: 12, height: 12 }} />
            {drivers.length - liveCount} Offline
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 420 }}>
        <style>{`
          @keyframes adminPulse {
            0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,0.3),0 2px 8px rgba(0,0,0,0.4)}
            50%{box-shadow:0 0 0 6px rgba(16,185,129,0.1),0 2px 8px rgba(0,0,0,0.4)}
          }
          .leaflet-control-attribution{display:none!important}
        `}</style>
        <div ref={containerRef} className="h-full w-full" style={{ background: "#1a1f2e" }} />
        {!tilesReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-[500]">
            <div className="h-6 w-6 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
          </div>
        )}
        {drivers.length === 0 && tilesReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400]">
            <div className="bg-slate-900/80 backdrop-blur rounded-xl px-5 py-3 text-center">
              <WifiOff className="h-6 w-6 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No active drivers</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
