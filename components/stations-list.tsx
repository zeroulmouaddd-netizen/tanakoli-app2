"use client"

import { MapPin, Navigation, Building2, GraduationCap, Hospital, ShoppingBag, ArrowUpRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Station {
  id: string
  name: string
  distance: string
  lines: string[]
  icon: React.ReactNode
  latitude: number
  longitude: number
}

const stations: Station[] = [
  {
    id: "1",
    name: "الجامعة",
    distance: "150 م",
    lines: ["خط 1", "خط 3"],
    icon: <GraduationCap className="h-5 w-5" />,
    latitude: 35.6944,
    longitude: 3.6588,
  },
  {
    id: "2",
    name: "وسط المدينة",
    distance: "300 م",
    lines: ["خط 2", "خط 4", "خط 5"],
    icon: <Building2 className="h-5 w-5" />,
    latitude: 35.6886,
    longitude: 3.6547,
  },
  {
    id: "3",
    name: "المستشفى",
    distance: "450 م",
    lines: ["خط 1", "خط 6"],
    icon: <Hospital className="h-5 w-5" />,
    latitude: 35.6920,
    longitude: 3.6610,
  },
  {
    id: "4",
    name: "السوق المركزي",
    distance: "600 م",
    lines: ["خط 2", "خط 3"],
    icon: <ShoppingBag className="h-5 w-5" />,
    latitude: 35.6855,
    longitude: 3.6505,
  },
]

export function StationsList() {
  const handleNavigate = (station: Station) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`
    window.open(googleMapsUrl, "_blank")
  }

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
          <Card
            key={station.id}
            className="flex flex-col gap-4 p-4 transition-all hover:shadow-md active:scale-[0.98]"
          >
            {/* Station Info Row */}
            <div className="flex items-center justify-between gap-4">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                {station.icon}
              </div>
            </div>

            {/* Distance and Navigation Button */}
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={() => handleNavigate(station)}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                size="sm"
              >
                <span>الاتجاهات</span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 bg-muted/50 rounded-lg">
                <span>{station.distance}</span>
                <MapPin className="h-4 w-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
