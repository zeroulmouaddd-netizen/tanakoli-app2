"use client"

import { MapPin, Navigation, Building2, GraduationCap, Hospital, ShoppingBag, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Station {
  id: string
  name: string
  distance: string
  walkingTime: string
  lines: string[]
  icon: React.ReactNode
  coordinates: [number, number]
}

const stations: Station[] = [
  {
    id: "1",
    name: "الجامعة",
    distance: "150 م",
    walkingTime: "2 دقيقة",
    lines: ["خط 1", "خط 3"],
    icon: <GraduationCap className="h-5 w-5" />,
    coordinates: [35.4420, 7.1380],
  },
  {
    id: "2",
    name: "وسط المدينة",
    distance: "300 م",
    walkingTime: "4 دقائق",
    lines: ["خط 2", "خط 4", "خط 5"],
    icon: <Building2 className="h-5 w-5" />,
    coordinates: [35.4377, 7.1458],
  },
  {
    id: "3",
    name: "المستشفى",
    distance: "450 م",
    walkingTime: "6 دقائق",
    lines: ["خط 1", "خط 6"],
    icon: <Hospital className="h-5 w-5" />,
    coordinates: [35.4330, 7.1520],
  },
  {
    id: "4",
    name: "السوق المركزي",
    distance: "600 م",
    walkingTime: "8 دقائق",
    lines: ["خط 2", "خط 3"],
    icon: <ShoppingBag className="h-5 w-5" />,
    coordinates: [35.4400, 7.1550],
  },
]

// Mini-Map Component
function MiniMapComponent({ station }: { station: Station }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize map with disabled interactions
    map.current = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView(station.coordinates, 17)

    // Add tile layer with dark theme
    const isDark = document.documentElement.classList.contains("dark")
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map.current)

    // Add marker for the station
    L.circleMarker(station.coordinates, {
      radius: 8,
      fillColor: "#00A651",
      color: "white",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(map.current)

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [station])

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-muted shadow-inner">
      {/* Dark gradient overlay for seamless blending */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-black/5 via-transparent to-black/5 rounded-xl sm:rounded-2xl" />
      
      {/* Map container */}
      <div
        ref={mapContainer}
        className="h-40 sm:h-48 md:h-56 w-full"
      />
    </div>
  )
}

// Station Card - Premium Static Widget
function StationCard({ station }: { station: Station }) {
  return (
    <Card className="flex flex-col gap-3 sm:gap-4 overflow-hidden p-3 sm:p-4">
      {/* Top: Station Info and Icon */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex flex-1 flex-col items-end gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-card-foreground">{station.name}</h3>
          <div className="flex flex-wrap justify-end gap-1">
            {station.lines.map((line) => (
              <span
                key={line}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {line}
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
          {station.icon}
        </div>
      </div>

      {/* Middle: Mini-Map */}
      <MiniMapComponent station={station} />

      {/* Bottom: Route Details */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-primary/5 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-muted-foreground">المسافة سيراً</span>
          <div className="flex items-center gap-1">
            <span className="text-lg sm:text-lg font-bold text-foreground">{station.distance}</span>
            <MapPin className="h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>الوقت</span>
          </div>
          <span className="text-lg sm:text-lg font-bold text-foreground">{station.walkingTime}</span>
        </div>
      </div>
    </Card>
  )
}

export function StationsList() {
  return (
    <div className="relative">
      {/* Gradient background - only visible on larger screens for visual separation */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 pb-[100px]">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button className="flex items-center justify-center sm:justify-start gap-1 text-xs sm:text-sm text-primary order-2 sm:order-2">
            <Navigation className="h-4 w-4" />
            <span>ترتيب حسب المسافة</span>
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-foreground text-center sm:text-right order-1 sm:order-1">المحطات القريبة</h2>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      </div>
    </div>
  )
}
