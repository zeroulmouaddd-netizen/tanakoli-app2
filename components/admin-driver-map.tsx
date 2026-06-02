"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { fetchActiveDrivers, type ActiveDriver } from "@/lib/admin-utils"
import { MapPin } from "lucide-react"

const KHENCHELA_CITY_CENTER: [number, number] = [35.4377, 7.1458]

interface AdminMapProps {
  onDriverSelect?: (driverPhone: string) => void
}

export function AdminDriverMap({ onDriverSelect }: AdminMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const [drivers, setDrivers] = useState<ActiveDriver[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Create map
    const map = L.map(mapContainerRef.current).setView(KHENCHELA_CITY_CENTER, 14)

    // Add tile layer (dark theme)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      className: "grayscale brightness-75",
    }).addTo(map)

    mapRef.current = map
    setIsLoading(false)

    return () => {
      map.remove()
    }
  }, [])

  // Subscribe to driver locations
  useEffect(() => {
    if (!mapRef.current) return

    console.log("[v0] Subscribing to active drivers")
    const unsubscribe = fetchActiveDrivers((activeDrivers) => {
      console.log("[v0] Updated drivers:", activeDrivers)
      setDrivers(activeDrivers)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Update markers on map
  useEffect(() => {
    if (!mapRef.current) return

    const existingPhones = new Set(markersRef.current.keys())
    const currentPhones = new Set(drivers.map((d) => d.phone))

    // Remove markers for drivers no longer in list
    existingPhones.forEach((phone) => {
      if (!currentPhones.has(phone)) {
        const marker = markersRef.current.get(phone)
        if (marker) {
          mapRef.current?.removeLayer(marker)
          markersRef.current.delete(phone)
        }
      }
    })

    // Add or update markers
    drivers.forEach((driver) => {
      if (!driver.location) return

      const lat = driver.location.lat
      const lng = driver.location.lng

      // Create or update marker
      if (markersRef.current.has(driver.phone)) {
        // Update existing marker position
        const marker = markersRef.current.get(driver.phone)
        if (marker) {
          marker.setLatLng([lat, lng])
        }
      } else {
        // Create new marker
        const html = `
          <div class="flex flex-col items-center gap-1">
            <div class="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-lg">
              ${driver.phone}
            </div>
            <div class="text-white px-2 py-0.5 rounded text-xs bg-slate-700 font-medium">
              Line: ${driver.line}
            </div>
          </div>
        `

        const icon = L.divIcon({
          html,
          className: "driver-marker",
          iconSize: [140, 60],
          iconAnchor: [70, 30],
        })

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`<div class="p-2">
            <p class="font-semibold">Driver: ${driver.phone}</p>
            <p class="text-sm text-gray-600">Line: ${driver.line}</p>
            <p class="text-sm text-gray-600">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
            ${onDriverSelect ? `<button class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded">Select</button>` : ""}
          </div>`)

        if (onDriverSelect) {
          marker.on("popupopen", () => {
            const popupButtons = document.querySelectorAll(".leaflet-popup-content button")
            popupButtons.forEach((btn) => {
              btn.addEventListener("click", () => onDriverSelect(driver.phone))
            })
          })
        }

        markersRef.current.set(driver.phone, marker)
      }
    })
  }, [drivers, onDriverSelect])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">
          Active Drivers ({drivers.length})
        </h3>
      </div>

      {isLoading ? (
        <div className="h-96 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
          <p className="text-slate-400">Loading map...</p>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="h-96 rounded-lg border border-slate-600 overflow-hidden shadow-lg"
          style={{ zIndex: 1 }}
        />
      )}

      {drivers.length === 0 && !isLoading && (
        <div className="h-32 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600 border-dashed">
          <p className="text-slate-400">No active drivers at the moment</p>
        </div>
      )}

      {/* Drivers List */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h4 className="font-semibold text-white mb-3">Driver List</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {drivers.length > 0 ? (
            drivers.map((driver) => (
              <div
                key={driver.phone}
                className="flex justify-between items-center p-2 bg-slate-600 rounded text-sm hover:bg-slate-500 transition-colors cursor-pointer"
                onClick={() => onDriverSelect?.(driver.phone)}
              >
                <div>
                  <p className="font-mono font-semibold text-blue-300">
                    {driver.phone}
                  </p>
                  <p className="text-slate-300">Line: {driver.line}</p>
                </div>
                {driver.location && (
                  <p className="text-xs text-slate-400">
                    {driver.location.lat.toFixed(4)}, {driver.location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">No active drivers</p>
          )}
        </div>
      </div>
    </div>
  )
}
