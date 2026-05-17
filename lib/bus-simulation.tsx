"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"

// Route coordinates for simulation - these define the paths buses follow
const urbanRoutePolylines = [
  {
    id: "01",
    name: "خط 01 - الجامعة",
    coords: [
      [35.4420, 7.1380], [35.4400, 7.1420], [35.4377, 7.1458],
      [35.4400, 7.1550], [35.4330, 7.1520], [35.4350, 7.1350],
    ] as [number, number][]
  },
  {
    id: "02",
    name: "خط 02 - عين البيضاء",
    coords: [
      [35.4350, 7.1350], [35.4450, 7.1320], [35.4377, 7.1458],
      [35.4330, 7.1520], [35.4400, 7.1480],
    ] as [number, number][]
  },
  {
    id: "03",
    name: "خط 03 - المدينة الجديدة",
    coords: [
      [35.4290, 7.1400], [35.4310, 7.1430], [35.4377, 7.1458],
      [35.4400, 7.1550], [35.4400, 7.1480], [35.4350, 7.1350],
    ] as [number, number][]
  }
]

const intercityRoutePolylines = [
  {
    id: "K1",
    name: "K1 - خنشلة - قايس",
    coords: [
      [35.4350, 7.1350], [35.4100, 7.1200], [35.3800, 7.0800], [35.3650, 7.0650],
    ] as [number, number][]
  },
  {
    id: "K2",
    name: "K2 - خنشلة - الشريعة",
    coords: [
      [35.4350, 7.1350], [35.3900, 7.2000], [35.2700, 7.7500], [35.2640, 7.7600],
    ] as [number, number][]
  },
]

// All routes combined for easy lookup
const allRoutes = [...urbanRoutePolylines, ...intercityRoutePolylines]

// Station positions for proximity detection (200m radius)
const allStations = [
  { position: [35.4420, 7.1380] as [number, number], name: "الجامعة", nameEn: "University" },
  { position: [35.4377, 7.1458] as [number, number], name: "وسط المدينة", nameEn: "City Center" },
  { position: [35.4350, 7.1350] as [number, number], name: "محطة خنشلة البرية", nameEn: "Bus Station" },
  { position: [35.4330, 7.1520] as [number, number], name: "المستشفى", nameEn: "Hospital" },
  { position: [35.4400, 7.1550] as [number, number], name: "السوق المركزي", nameEn: "Central Market" },
  { position: [35.4400, 7.1480] as [number, number], name: "ملعب أول نوفمبر", nameEn: "Stadium" },
  { position: [35.4450, 7.1320] as [number, number], name: "طريق عين البيضاء", nameEn: "Ain El Beyda Road" },
  { position: [35.4290, 7.1400] as [number, number], name: "المدينة الجديدة", nameEn: "New City" },
  { position: [35.3650, 7.0650] as [number, number], name: "وسط قايس", nameEn: "Kais Center" },
  { position: [35.2640, 7.7600] as [number, number], name: "وسط الشريعة", nameEn: "Cheria Center" },
]

export interface SimulatedBus {
  id: string
  name: string
  lineId: string
  lineName: string
  category: "urban" | "intercity"
  // Current position (interpolated for smooth movement)
  latitude: number
  longitude: number
  // Target position (next waypoint)
  targetLatitude: number
  targetLongitude: number
  // Route progress (0-1 along route)
  routeProgress: number
  // Direction: 1 = forward, -1 = backward (bus reverses at route ends)
  direction: 1 | -1
  // Speed in km/h
  speed: number
  // Status
  status: "moving" | "at_station"
  nearestStation: string | null
  nearestStationEn: string | null
  // Estimated arrival time in minutes
  arrivalMinutes: number
  // Always true for simulated buses (they're "live" in the simulation)
  isLive: true
}

// Calculate distance between two coordinates in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Linear interpolation between two coordinate points
function interpolatePosition(
  current: [number, number],
  target: [number, number],
  factor: number
): [number, number] {
  return [
    current[0] + (target[0] - current[0]) * factor,
    current[1] + (target[1] - current[1]) * factor,
  ]
}

// Get position along route based on progress (0.0 to 1.0)
function getPositionOnRoute(
  coords: [number, number][],
  progress: number
): [number, number] {
  if (!coords || coords.length === 0) return [35.4377, 7.1458] // Default to city center
  if (coords.length === 1) return coords[0]
  
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress))
  
  // Calculate total route length
  let totalLength = 0
  const segmentLengths: number[] = []
  
  for (let i = 0; i < coords.length - 1; i++) {
    const length = calculateDistance(
      coords[i][0], coords[i][1],
      coords[i + 1][0], coords[i + 1][1]
    )
    segmentLengths.push(length)
    totalLength += length
  }
  
  if (totalLength === 0) return coords[0]
  
  // Find position based on progress
  const targetDistance = clampedProgress * totalLength
  let accumulatedDistance = 0
  
  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedDistance + segmentLengths[i] >= targetDistance) {
      // Found the segment - interpolate within it
      const segmentProgress = segmentLengths[i] > 0 
        ? (targetDistance - accumulatedDistance) / segmentLengths[i]
        : 0
      return interpolatePosition(coords[i], coords[i + 1], segmentProgress)
    }
    accumulatedDistance += segmentLengths[i]
  }
  
  return coords[coords.length - 1]
}

// Calculate route length for a given route
function getRouteLength(coords: [number, number][]): number {
  let length = 0
  for (let i = 0; i < coords.length - 1; i++) {
    length += calculateDistance(
      coords[i][0], coords[i][1],
      coords[i + 1][0], coords[i + 1][1]
    )
  }
  return length
}

// Find nearest station within 200m radius
function findNearestStation(
  lat: number,
  lon: number
): { name: string; nameEn: string; distance: number } | null {
  if (!isValidCoordinate(lat, lon)) return null
  
  let nearest: { name: string; nameEn: string; distance: number } | null = null
  
  for (const station of allStations) {
    const distance = calculateDistance(lat, lon, station.position[0], station.position[1])
    if (distance <= 200 && (!nearest || distance < nearest.distance)) {
      nearest = { name: station.name, nameEn: station.nameEn, distance }
    }
  }
  
  return nearest
}

// Calculate estimated arrival time in minutes
function calculateArrivalTime(progress: number, speed: number, routeLength: number): number {
  if (speed <= 0 || routeLength <= 0) return 0
  const remainingDistance = (1 - progress) * routeLength // in meters
  const speedMps = (speed * 1000) / 3600 // km/h to m/s
  const seconds = remainingDistance / speedMps
  return Math.max(1, Math.ceil(seconds / 60)) // Minimum 1 minute
}

// Validate coordinates are within Khenchela region
function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= 35.0 && lat <= 36.0 && // Khenchela latitude range
    lon >= 6.5 && lon <= 8.0      // Khenchela longitude range
  )
}

// Bus configuration - 5 simulated buses on different routes
const BUS_CONFIG = [
  { id: "sim-001", name: "حافلة 101", lineId: "01", lineName: "خط 01 - الجامعة", category: "urban" as const, speed: 25, initialProgress: 0.05 },
  { id: "sim-002", name: "حافلة 102", lineId: "02", lineName: "خط 02 - عين البيضاء", category: "urban" as const, speed: 30, initialProgress: 0.25 },
  { id: "sim-003", name: "حافلة 103", lineId: "03", lineName: "خط 03 - المدينة الجديدة", category: "urban" as const, speed: 22, initialProgress: 0.55 },
  { id: "sim-004", name: "حافلة K1-01", lineId: "K1", lineName: "K1 - خنشلة - قايس", category: "intercity" as const, speed: 50, initialProgress: 0.15 },
  { id: "sim-005", name: "حافلة K2-01", lineId: "K2", lineName: "K2 - خنشلة - الشريعة", category: "intercity" as const, speed: 55, initialProgress: 0.35 },
]

// Create initial buses with proper positions calculated from their routes
function createInitialBuses(): SimulatedBus[] {
  return BUS_CONFIG.map(config => {
    const route = allRoutes.find(r => r.id === config.lineId)
    if (!route) {
      // Fallback to city center if route not found
      return createBusAtPosition(config, [35.4377, 7.1458])
    }
    
    // Calculate initial position from route progress
    const initialPos = getPositionOnRoute(route.coords, config.initialProgress)
    const routeLength = getRouteLength(route.coords)
    const arrivalMinutes = calculateArrivalTime(config.initialProgress, config.speed, routeLength)
    const nearStation = findNearestStation(initialPos[0], initialPos[1])
    
    return {
      id: config.id,
      name: config.name,
      lineId: config.lineId,
      lineName: config.lineName,
      category: config.category,
      latitude: initialPos[0],
      longitude: initialPos[1],
      targetLatitude: initialPos[0],
      targetLongitude: initialPos[1],
      routeProgress: config.initialProgress,
      direction: 1 as const,
      speed: config.speed,
      status: nearStation ? "at_station" as const : "moving" as const,
      nearestStation: nearStation?.name || null,
      nearestStationEn: nearStation?.nameEn || null,
      arrivalMinutes,
      isLive: true as const,
    }
  })
}

// Helper to create a bus at a specific position (fallback)
function createBusAtPosition(config: typeof BUS_CONFIG[0], pos: [number, number]): SimulatedBus {
  return {
    id: config.id,
    name: config.name,
    lineId: config.lineId,
    lineName: config.lineName,
    category: config.category,
    latitude: pos[0],
    longitude: pos[1],
    targetLatitude: pos[0],
    targetLongitude: pos[1],
    routeProgress: config.initialProgress,
    direction: 1 as const,
    speed: config.speed,
    status: "moving" as const,
    nearestStation: null,
    nearestStationEn: null,
    arrivalMinutes: 5,
    isLive: true as const,
  }
}

interface BusSimulationContextType {
  simulatedBuses: SimulatedBus[]
  isSimulationRunning: boolean
  startSimulation: () => void
  stopSimulation: () => void
}

const BusSimulationContext = createContext<BusSimulationContextType | null>(null)

// Pre-calculate route lengths (constant, no need to recalculate)
const routeLengths = new Map<string, number>()
allRoutes.forEach(route => {
  routeLengths.set(route.id, getRouteLength(route.coords))
})

export function BusSimulationProvider({ children }: { children: ReactNode }) {
  const [simulatedBuses, setSimulatedBuses] = useState<SimulatedBus[]>(() => createInitialBuses())
  const [isSimulationRunning, setIsSimulationRunning] = useState(true)
  
  // Use refs to track intervals and avoid stale closure issues
  const smoothIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Smooth interpolation effect - runs every 100ms for fluid movement
  useEffect(() => {
    if (!isSimulationRunning) {
      if (smoothIntervalRef.current) {
        clearInterval(smoothIntervalRef.current)
        smoothIntervalRef.current = null
      }
      return
    }
    
    smoothIntervalRef.current = setInterval(() => {
      setSimulatedBuses(prevBuses => 
        prevBuses.map(bus => {
          // Skip if already at target (prevents unnecessary updates)
          const latDiff = Math.abs(bus.targetLatitude - bus.latitude)
          const lonDiff = Math.abs(bus.targetLongitude - bus.longitude)
          if (latDiff < 0.00001 && lonDiff < 0.00001) {
            return bus
          }
          
          // Smooth interpolation factor (0.15 = 15% closer per frame)
          const factor = 0.15
          const newLat = bus.latitude + (bus.targetLatitude - bus.latitude) * factor
          const newLon = bus.longitude + (bus.targetLongitude - bus.longitude) * factor
          
          return {
            ...bus,
            latitude: newLat,
            longitude: newLon,
          }
        })
      )
    }, 100)
    
    return () => {
      if (smoothIntervalRef.current) {
        clearInterval(smoothIntervalRef.current)
        smoothIntervalRef.current = null
      }
    }
  }, [isSimulationRunning])
  
  // Target position update effect - runs every 3 seconds
  useEffect(() => {
    if (!isSimulationRunning) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      return
    }
    
    // Update function
    const updateTargets = () => {
      setSimulatedBuses(prevBuses => 
        prevBuses.map(bus => {
          const route = allRoutes.find(r => r.id === bus.lineId)
          if (!route) return bus
          
          const routeLength = routeLengths.get(bus.lineId) || 1000
          
          // Calculate how much the bus moves in 3 seconds
          const speedMps = (bus.speed * 1000) / 3600 // Convert km/h to m/s
          const distancePerUpdate = speedMps * 3 // Distance in 3 seconds
          const progressIncrement = distancePerUpdate / routeLength
          
          // Update progress based on direction
          let newProgress = bus.routeProgress + (progressIncrement * bus.direction)
          let newDirection = bus.direction
          
          // Reverse at route endpoints
          if (newProgress >= 1) {
            newProgress = 1 - (newProgress - 1) // Bounce back
            newDirection = -1
          } else if (newProgress <= 0) {
            newProgress = Math.abs(newProgress) // Bounce forward
            newDirection = 1
          }
          
          // Get new target position from route
          const targetPos = getPositionOnRoute(route.coords, newProgress)
          
          // Validate coordinates - skip update if invalid
          if (!isValidCoordinate(targetPos[0], targetPos[1])) {
            return bus
          }
          
          // Check station proximity
          const nearStation = findNearestStation(targetPos[0], targetPos[1])
          const status: "moving" | "at_station" = nearStation ? "at_station" : "moving"
          
          // Calculate arrival time
          const arrivalMinutes = calculateArrivalTime(newProgress, bus.speed, routeLength)
          
          return {
            ...bus,
            targetLatitude: targetPos[0],
            targetLongitude: targetPos[1],
            routeProgress: newProgress,
            direction: newDirection,
            status,
            nearestStation: nearStation?.name || null,
            nearestStationEn: nearStation?.nameEn || null,
            arrivalMinutes,
          }
        })
      )
    }
    
    // Run immediately on mount, then every 3 seconds
    updateTargets()
    updateIntervalRef.current = setInterval(updateTargets, 3000)
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
    }
  }, [isSimulationRunning])
  
  const startSimulation = useCallback(() => {
    setIsSimulationRunning(true)
  }, [])
  
  const stopSimulation = useCallback(() => {
    setIsSimulationRunning(false)
  }, [])
  
  return (
    <BusSimulationContext.Provider value={{ 
      simulatedBuses, 
      isSimulationRunning, 
      startSimulation, 
      stopSimulation 
    }}>
      {children}
    </BusSimulationContext.Provider>
  )
}

export function useBusSimulation() {
  const context = useContext(BusSimulationContext)
  if (!context) {
    throw new Error("useBusSimulation must be used within a BusSimulationProvider")
  }
  return context
}
