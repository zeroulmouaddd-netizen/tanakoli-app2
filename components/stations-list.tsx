"use client"

import { MapPin, Navigation, Building2, GraduationCap, Hospital, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Real verified GPS coordinates for Khenchela city, Algeria
interface Landmark {
  id: string
  name: string
  icon: React.ReactNode
  coordinates: [number, number]
}

const landmarks: Landmark[] = [
  {
    id: "1",
    name: "الجامعة",
    icon: <GraduationCap className="h-5 w-5" />,
    // جامعة عباس لغرور – خنشلة (Université Abbas Laghrour, Khenchela)
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
    // مسجد الأمير عبد القادر – خنشلة (Mosquée Émir Abdelkader, Khenchela)
    coordinates: [35.4370, 7.1478],
  },
]

// Haversine formula — returns distance in meters between two GPS points
function haversineDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371000 // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} م`
  return `${(meters / 1000).toFixed(1)} كم`
}

// Estimate walking time at 5 km/h
function formatWalkingTime(meters: number): string {
  const minutes = Math.round(meters / 83.33) // 5 km/h ≈ 83.33 m/min
  if (minutes < 1) return "أقل من دقيقة"
  if (minutes === 1) return "دقيقة"
  return `${minutes} دقيقة`
}

// Hook: watch user's GPS position
function useUserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return position
}

// Mini-Map: shows landmark + user location + straight-line path
function MiniMapComponent({
  landmark,
  userPosition,
}: {
  landmark: Landmark
  userPosition: [number, number] | null
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current) return

    const isDark = document.documentElement.classList.contains("dark")
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

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

    // Landmark marker (green)
    L.circleMarker(landmark.coordinates, {
      radius: 9,
      fillColor: "#00A651",
      color: "white",
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      routeLineRef.current = null
      userMarkerRef.current = null
    }
  }, [landmark])

  // Update user location marker and route line whenever position changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove previous user marker and route line
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }

    if (!userPosition) return

    // User location marker (blue pulsing dot)
    userMarkerRef.current = L.circleMarker(userPosition, {
      radius: 7,
      fillColor: "#3B82F6",
      color: "white",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map)

    // Dashed walking route line
    routeLineRef.current = L.polyline([userPosition, landmark.coordinates], {
      color: "#00A651",
      weight: 2.5,
      opacity: 0.8,
      dashArray: "6, 8",
    }).addTo(map)

    // Fit map to show both points with padding
    const bounds = L.latLngBounds([userPosition, landmark.coordinates])
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 })
  }, [userPosition, landmark.coordinates])

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-muted shadow-inner">
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-black/5 via-transparent to-black/5 rounded-xl sm:rounded-2xl" />
      <div ref={mapContainer} className="h-40 sm:h-48 md:h-56 w-full" />
    </div>
  )
}

// Single landmark card
function LandmarkCard({
  landmark,
  userPosition,
}: {
  landmark: Landmark
  userPosition: [number, number] | null
}) {
  const distanceMeters = userPosition
    ? haversineDistance(userPosition, landmark.coordinates)
    : null

  const distanceText = distanceMeters !== null ? formatDistance(distanceMeters) : "—"
  const walkingTimeText = distanceMeters !== null ? formatWalkingTime(distanceMeters) : "—"

  return (
    <Card className="flex flex-col gap-3 sm:gap-4 overflow-hidden p-3 sm:p-4">
      {/* Top: Landmark name and icon */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex flex-1 flex-col items-end gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-card-foreground">{landmark.name}</h3>
        </div>
        <div className="flex h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
          {landmark.icon}
        </div>
      </div>

      {/* Mini-Map */}
      <MiniMapComponent landmark={landmark} userPosition={userPosition} />

      {/* Distance & Walking Time */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-primary/5 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-muted-foreground">المسافة سيراً</span>
          <div className="flex items-center gap-1">
            <span className="text-lg sm:text-lg font-bold text-foreground">{distanceText}</span>
            <MapPin className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>الوقت</span>
          </div>
          <span className="text-lg sm:text-lg font-bold text-foreground">{walkingTimeText}</span>
        </div>
      </div>
    </Card>
  )
}

export function StationsList() {
  const userPosition = useUserLocation()

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
            <LandmarkCard key={landmark.id} landmark={landmark} userPosition={userPosition} />
          ))}
        </div>
      </div>
    </div>
  )
}
