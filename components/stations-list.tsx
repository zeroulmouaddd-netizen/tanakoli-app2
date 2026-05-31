"use client"

import { MapPin, Navigation, Building2, GraduationCap, Hospital, ShoppingBag, ChevronDown, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { motion, AnimatePresence } from "framer-motion"

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

    // Initialize map
    map.current = L.map(mapContainer.current).setView(station.coordinates, 17)

    // Add tile layer with dark theme
    const isDark = document.documentElement.classList.contains("dark")
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors',
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
    <div
      ref={mapContainer}
      className="h-48 w-full rounded-xl border border-border/50 bg-muted"
      style={{ overflow: "hidden" }}
    />
  )
}

// Expandable Station Card
function ExpandableStationCard({ station }: { station: Station }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      layout
      className="overflow-hidden"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Card
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer items-center gap-4 p-4 transition-all hover:shadow-md active:scale-[0.98]"
      >
        <div className="flex flex-1 flex-col items-end gap-1">
          <h3 className="font-semibold text-card-foreground">{station.name}</h3>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{station.distance}</span>
          <MapPin className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="flex h-6 w-6 items-center justify-center"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {station.icon}
          </div>
        </div>
      </Card>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 space-y-4">
              {/* Mini-Map */}
              <MiniMapComponent station={station} />

              {/* Route Details */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-primary/5 p-4">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-medium text-muted-foreground">المسافة سيراً</span>
                  <span className="text-lg font-bold text-foreground">{station.distance}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>الوقت</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{station.walkingTime}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function StationsList() {
  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <button className="flex items-center gap-1 text-sm text-primary">
          <Navigation className="h-4 w-4" />
          <span>ترتيب حسب المسافة</span>
        </button>
        <h2 className="text-lg font-semibold text-foreground">المحطات القريبة</h2>
      </div>

      <div className="flex flex-col gap-3">
        {stations.map((station) => (
          <ExpandableStationCard key={station.id} station={station} />
        ))}
      </div>
    </div>
  )
}
