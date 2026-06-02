"use client"

import { useEffect, useState } from "react"
import { rtdb } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { Users } from "lucide-react"

interface DriverLocation {
  lat: number
  lng: number
  timestamp?: number
}

interface Driver {
  phone: string
  location: DriverLocation
}

interface AdminDriverListProps {
  onDriverSelect?: (driverPhone: string) => void
}

export function AdminDriverMap({ onDriverSelect }: AdminDriverListProps) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Subscribe to driver locations from Firebase Realtime Database
    const driversRef = ref(rtdb, "drivers")

    const unsubscribe = onValue(
      driversRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setDrivers([])
          setIsLoading(false)
          return
        }

        const driversData = snapshot.val()
        const driversList: Driver[] = []

        // Process drivers data - read from drivers/{phone}/location
        for (const [phone, driverData] of Object.entries(driversData)) {
          const data = driverData as any
          if (data.location && typeof data.location === "object") {
            driversList.push({
              phone,
              location: data.location,
            })
          }
        }

        setDrivers(driversList)
        setIsLoading(false)
      },
      (error) => {
        console.error("[v0] Error fetching driver locations:", error)
        setIsLoading(false)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">
          Active Drivers ({drivers.length})
        </h3>
      </div>

      {isLoading ? (
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <p className="text-slate-400 text-center">Loading drivers...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="bg-slate-700 rounded-lg p-8 border border-slate-600 border-dashed flex items-center justify-center">
          <p className="text-slate-400">No active drivers at the moment</p>
        </div>
      ) : (
        <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Latitude
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Longitude
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Last Update
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {drivers.map((driver) => (
                  <tr
                    key={driver.phone}
                    className="hover:bg-slate-600 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-blue-300">
                      {driver.phone}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {driver.location.lat.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {driver.location.lng.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {formatTime(driver.location.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      {onDriverSelect && (
                        <button
                          onClick={() => onDriverSelect(driver.phone)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
