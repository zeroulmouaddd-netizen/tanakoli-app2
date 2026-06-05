"use client"

import { MapPin, Navigation, Building2, GraduationCap, Hospital, Clock, WifiOff } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// ─── Landmark definitions (real Khenchela GPS coordinates) ────────────────────

interface Landmark {
  id: string
  name: string
  icon: React.ReactNode
  coordinates: [number, number] // [lat, lng]
}

const landmarks: Landmark[] = [
  {
    id: "1",
    name: "الجامعة",
    icon: <GraduationCap className="h-5 w-5" />,
    // جامعة عباس لغرور – خنشلة (Université Abbas Laghrour)
    coordinates: [35.3952, 7.1441],
  },
  {
    id: "2",
    name: "المستشفى",
    icon: <Hospital className="h-5 w-5" />,
    // المستشفى العمومي خنشلة (Hôpital de Khenchela)
    coordinates: [35.4285, 7.1502],
  },
  {
    id: "3",
    name: "وسط المدينة",
    icon: <Building2 className="h-5 w-5" />,
    // قلب وسط مدينة خنشلة (Khenchela City Center)
    coordinates: [35.4358, 7.1464],
  },
  {
    id: "4",
    name: "مسجد الأمير",
    icon: <MapPin className="h-5 w-5" />,
    // مسجد الأمير عبد القادر – خنشلة (Mosquée Émir Abdelkader)
    coordinates: [35.4370, 7.1478],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type GpsStatus = "pending" | "granted" | "denied"

interface RouteResult {
  distanceMeters: number   // metres along the real road
  durationSeconds: number  // seconds of walking
  coords: [number, number][] // [lat, lng] pairs — the road polyline
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} م`
  return `${(meters / 1000).toFixed(1)} كم`
}

function formatWalkingTime(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return "أقل من دقيقة"
  if (minutes === 1) return "دقيقة"
  return `${minutes} دقيقة`
}

// ─── GPS hook ─────────────────────────────────────────────────────────────────

function useUserLocation(): {
  position: [number, number] | null
  status: GpsStatus
} {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [status, setStatus] = useState<GpsStatus>("pending")

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("denied")
      return
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setStatus("granted")
      },
      () => {
        setStatus("denied")
        setPosition(null)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { position, status }
}

// ─── OSRM walking route fetcher ───────────────────────────────────────────────

async function fetchWalkingRoute(
  from: [number, number], // [lat, lng]
  to: [number, number]    // [lat, lng]
): Promise<RouteResult | null> {
  try {
    // OSRM expects lng,lat order
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}` +
      `?overview=full&geometries=geojson`

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null

    const data = await res.json()
    if (data.code !== "Ok" || !data.routes?.length) return null

    const route = data.routes[0]
    // GeoJSON coordinates are [lng, lat] — swap to [lat, lng] for Leaflet
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coords,
    }
  } catch {
    return null
  }
}

// ─── Mini-map component ───────────────────────────────────────────────────────

function MiniMapComponent({
  landmark,
  userPosition,
  routeCoords,
}: {
  landmark: Landmark
  userPosition: [number, number] | null
  routeCoords: [number, number][] | null
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)

  // Initialise map once per landmark
  useEffect(() => {
    if (!mapContainer.current) return

    const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

    const map = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView(landmark.coordinates, 15)

    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map)

    // Landmark marker — green circle with white border
    L.circleMarker(landmark.coordinates, {
      radius: 9,
      fillColor: "#00A651",
      color: "white",
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.95,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      routeLineRef.current = null
      userMarkerRef.current = null
    }
  }, [landmark])

  // Update user marker + route polyline when either changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old layers
    routeLineRef.current?.remove()
    routeLineRef.current = null
    userMarkerRef.current?.remove()
    userMarkerRef.current = null

    if (!userPosition) return

    // Blue dot — user location
    userMarkerRef.current = L.circleMarker(userPosition, {
      radius: 8,
      fillColor: "#3B82F6",
      color: "white",
      weight: 2.5,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(map)

    if (routeCoords && routeCoords.length > 1) {
      // Real road route — solid green polyline
      routeLineRef.current = L.polyline(routeCoords, {
        color: "#00A651",
        weight: 4,
        opacity: 0.85,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map)

      // Fit both endpoints plus some padding
      const bounds = L.latLngBounds(routeCoords)
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 })
    } else {
      // Route not loaded yet — fit user + landmark
      const bounds = L.latLngBounds([userPosition, landmark.coordinates])
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 })
    }
  }, [userPosition, routeCoords, landmark.coordinates])

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-muted shadow-inner">
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-black/5 via-transparent to-black/5 rounded-xl sm:rounded-2xl" />
      <div ref={mapContainer} className="h-40 sm:h-48 md:h-56 w-full" />
    </div>
  )
}

// ─── Landmark card ────────────────────────────────────────────────────────────

function LandmarkCard({
  landmark,
  userPosition,
  gpsStatus,
}: {
  landmark: Landmark
  userPosition: [number, number] | null
  gpsStatus: GpsStatus
}) {
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const lastFromRef = useRef<string>("")

  // Fetch OSRM route whenever the user's position changes
  useEffect(() => {
    if (!userPosition) {
      setRoute(null)
      return
    }

    const key = `${userPosition[0].toFixed(5)},${userPosition[1].toFixed(5)}`
    if (key === lastFromRef.current) return // same position — no re-fetch
    lastFromRef.current = key

    setRouteLoading(true)
    fetchWalkingRoute(userPosition, landmark.coordinates).then((result) => {
      setRoute(result)
      setRouteLoading(false)
    })
  }, [userPosition, landmark.coordinates])

  // Display values — prefer real route data, fall back gracefully
  const distanceText = route
    ? formatDistance(route.distanceMeters)
    : routeLoading
    ? "..."
    : "—"

  const walkingTimeText = route
    ? formatWalkingTime(route.durationSeconds)
    : routeLoading
    ? "..."
    : "—"

  return (
    <Card className="flex flex-col gap-3 sm:gap-4 overflow-hidden p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex flex-1 flex-col items-end gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-card-foreground">
            {landmark.name}
          </h3>
        </div>
        <div className="flex h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
          {landmark.icon}
        </div>
      </div>

      {/* GPS denied banner */}
      {gpsStatus === "denied" && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-amber-600 dark:text-amber-400">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">يرجى تفعيل GPS</span>
        </div>
      )}

      {/* Mini-map */}
      <MiniMapComponent
        landmark={landmark}
        userPosition={userPosition}
        routeCoords={route?.coords ?? null}
      />

      {/* Distance & time row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-primary/5 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-muted-foreground">المسافة سيراً</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-foreground">{distanceText}</span>
            <MapPin className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>الوقت</span>
          </div>
          <span className="text-lg font-bold text-foreground">{walkingTimeText}</span>
        </div>
      </div>
    </Card>
  )
}

// ─── Exported list ────────────────────────────────────────────────────────────

export function StationsList() {
  const { position, status } = useUserLocation()

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 pb-[100px]">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button className="flex items-center justify-center sm:justify-start gap-1 text-xs sm:text-sm text-primary order-2 sm:order-2">
            <Navigation className="h-4 w-4" />
            <span>ترتيب حسب المسافة</span>
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-foreground text-center sm:text-right order-1 sm:order-1">
            المحطات القريبة
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {landmarks.map((landmark) => (
            <LandmarkCard
              key={landmark.id}
              landmark={landmark}
              userPosition={position}
              gpsStatus={status}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
