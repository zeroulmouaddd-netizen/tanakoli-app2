"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { BusRoute, Station, RouteCategory, SubStation } from "@/lib/types/routes"

const ROUTES_CACHE_KEY = "tanoukli_routes_cache"
const STATIONS_CACHE_KEY = "tanoukli_stations_cache"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CacheData<T> {
  data: T
  timestamp: number
}

function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    const parsed: CacheData<T> = JSON.parse(cached)
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    const cacheData: CacheData<T> = { data, timestamp: Date.now() }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch {
    // Ignore cache errors
  }
}

// 7 verified Khenchela bus lines — coordinates from Google Maps Plus Codes
const urbanRoutes: BusRoute[] = [
  {
    id: "route-01",
    name: "خط 01 — طريق العيزار",
    nameEn: "Ligne 01 — Route Al-Aizar",
    lineNumber: "01",
    color: "#FF6B35",
    price: 25,
    workingHours: { start: "06:00", end: "20:00" },
    frequency: 15,
    category: "urban",
    stops: [
      { id: "01-s0", name: "نقطة الانطلاق طريق العيزار", nameEn: "Al-Aizar Departure Point", coords: [35.4279, 7.1431], order: 1 },
      { id: "01-s1", name: "نقطة وصول طريق العيزار",    nameEn: "Al-Aizar Arrival Point",   coords: [35.4075, 7.1380], order: 2 },
    ],
    sub_stations: [
      { id: "sub-01-0", name: "نقطة الانطلاق طريق العيزار", nameEn: "Al-Aizar Departure Point", coords: [35.4279, 7.1431], order: 1 },
      { id: "sub-01-1", name: "نقطة وصول طريق العيزار",    nameEn: "Al-Aizar Arrival Point",   coords: [35.4075, 7.1380], order: 2 },
    ],
  },
  {
    id: "route-02",
    name: "خط 02 — موسى رداح",
    nameEn: "Ligne 02 — Moussa Raddah",
    lineNumber: "02",
    color: "#9B59B6",
    price: 20,
    workingHours: { start: "06:00", end: "20:00" },
    frequency: 20,
    category: "urban",
    stops: [
      { id: "02-s1", name: "مسجد موسى رداح",  nameEn: "Mosquée Moussa Raddah", coords: [35.450003, 7.123128], order: 1 },
      { id: "02-s2", name: "موقف الحافلات",   nameEn: "Gare Routière",          coords: [35.445878, 7.144128], order: 2 },
    ],
    sub_stations: [
      { id: "sub-02-1", name: "مسجد موسى رداح",  nameEn: "Mosquée Moussa Raddah", coords: [35.450003, 7.123128], order: 1 },
      { id: "sub-02-2", name: "موقف الحافلات",   nameEn: "Gare Routière",          coords: [35.445878, 7.144128], order: 2 },
    ],
  },
  {
    id: "route-04",
    name: "خط 04 — انسيغة",
    nameEn: "Ligne 04 — Ansigha",
    lineNumber: "04",
    color: "#00BCD4",
    price: 30,
    workingHours: { start: "06:00", end: "20:00" },
    frequency: 25,
    category: "urban",
    stops: [
      { id: "04-s1", name: "نقطة انطلاق انسيغة", nameEn: "Ansigha Departure Point", coords: [35.42722, 7.14421], order: 1 },
      { id: "04-s2", name: "انسيغة",              nameEn: "Ansigha (Tammayurt)",    coords: [35.3950,  7.1420 ], order: 2 },
    ],
    sub_stations: [
      { id: "sub-04-1", name: "نقطة انطلاق انسيغة", nameEn: "Ansigha Departure Point", coords: [35.42722, 7.14421], order: 1 },
      { id: "sub-04-2", name: "انسيغة",              nameEn: "Ansigha (Tammayurt)",    coords: [35.3950,  7.1420 ], order: 2 },
    ],
  },
  {
    id: "route-05",
    name: "خط 05 — الحامة",
    nameEn: "Ligne 05 — Al-Hama (RN88)",
    lineNumber: "05",
    color: "#27AE60",
    price: 35,
    workingHours: { start: "05:30", end: "20:30" },
    frequency: 20,
    category: "urban",
    stops: [
      { id: "05-s1", name: "نقطة انطلاق الحامة", nameEn: "Hama Departure Point", coords: [35.4279, 7.1431], order: 1 },
      { id: "05-s2", name: "الحامة",      nameEn: "Al-Hama (centre)",   coords: [35.4659, 7.0581], order: 2 },
    ],
    sub_stations: [
      { id: "sub-05-1", name: "نقطة انطلاق الحامة", nameEn: "Hama Departure Point", coords: [35.4279, 7.1431], order: 1 },
      { id: "sub-05-2", name: "الحامة",      nameEn: "Al-Hama (centre)",   coords: [35.4659, 7.0581], order: 2 },
    ],
  },
  {
    id: "route-06",
    name: "خط 06 — المحمل",
    nameEn: "Ligne 06 — Al-Mahmal",
    lineNumber: "06",
    color: "#E74C3C",
    price: 40,
    workingHours: { start: "06:00", end: "20:00" },
    frequency: 30,
    category: "urban",
    stops: [
      { id: "06-s1", name: "نقطة انطلاق دار الثقافة", nameEn: "Dar Thaqafa Departure Point", coords: [35.4300, 7.1491], order: 1 },
      { id: "06-s2", name: "نقطة وصول تازوقاغت",      nameEn: "Tazoughaght Arrival Point",   coords: [35.3697, 7.2154], order: 2 },
    ],
    sub_stations: [
      { id: "sub-06-1", name: "نقطة انطلاق دار الثقافة", nameEn: "Dar Thaqafa Departure Point", coords: [35.4300, 7.1491], order: 1 },
      { id: "sub-06-2", name: "نقطة وصول تازوقاغت",      nameEn: "Tazoughaght Arrival Point",   coords: [35.3697, 7.2154], order: 2 },
    ],
  },
  {
    id: "route-10",
    name: "خط 10 — المدينة الجديدة",
    nameEn: "Ligne 10 — Cité Nouvelle",
    lineNumber: "10",
    color: "#F39C12",
    price: 20,
    workingHours: { start: "06:00", end: "20:00" },
    frequency: 15,
    category: "urban",
    stops: [
      { id: "10-s1", name: "المدينة الجديدة", nameEn: "Cité Nouvelle / Al-Hadika", coords: [35.424,    7.138   ], order: 1 },
      { id: "10-s2", name: "موقف الحافلات",   nameEn: "Gare Routière",             coords: [35.445878, 7.144128], order: 2 },
    ],
    sub_stations: [
      { id: "sub-10-1", name: "المدينة الجديدة", nameEn: "Cité Nouvelle / Al-Hadika", coords: [35.424,    7.138   ], order: 1 },
      { id: "sub-10-2", name: "موقف الحافلات",   nameEn: "Gare Routière",             coords: [35.445878, 7.144128], order: 2 },
    ],
  },
  {
    id: "route-11",
    name: "خط 11 — فرنقال",
    nameEn: "Ligne 11 — Frnqal",
    lineNumber: "11",
    color: "#2980B9",
    price: 25,
    workingHours: { start: "06:00", end: "20:00" },
    frequency: 20,
    category: "urban",
    stops: [
      { id: "11-s1", name: "قرية فرنقال",  nameEn: "Village Frnqal", coords: [35.45,     7.19    ], order: 1 },
      { id: "11-s4", name: "موقف الحافلات", nameEn: "Gare Routière",  coords: [35.445878, 7.144128], order: 2 },
    ],
    sub_stations: [
      { id: "sub-11-1", name: "قرية فرنقال",  nameEn: "Village Frnqal", coords: [35.45,     7.19    ], order: 1 },
      { id: "sub-11-4", name: "موقف الحافلات", nameEn: "Gare Routière",  coords: [35.445878, 7.144128], order: 2 },
    ],
  },
]

// Combined fallback routes (urban only)
const fallbackRoutes: BusRoute[] = [...urbanRoutes]

const fallbackStations: Station[] = [
  { id: "station-terminal",   name: "موقف الحافلات",   nameEn: "Gare Routière",       address: "موقف الحافلات الرئيسي - خنشلة", coords: [35.445878, 7.144128], lines: ["02","06","10","11"],       facilities: ["shelter","bench","kiosk","toilet"], isMainStation: true },
  { id: "station-aizar-start", name: "نقطة الانطلاق طريق العيزار", nameEn: "Al-Aizar Departure Point", address: "نقطة الانطلاق طريق العيزار - خنشلة", coords: [35.4279, 7.1431], lines: ["01"], facilities: ["shelter","bench"], isMainStation: true },
  { id: "station-muamria",     name: "نقطة وصول طريق العيزار",    nameEn: "Al-Aizar Arrival Point",   address: "نقطة وصول طريق العيزار - خنشلة",    coords: [35.4075, 7.1380], lines: ["01"], facilities: ["shelter","bench"], isMainStation: true },
  { id: "station-ansigha-start", name: "نقطة انطلاق انسيغة", nameEn: "Ansigha Departure Point", address: "نقطة انطلاق انسيغة - خنشلة", coords: [35.42722, 7.14421], lines: ["04"], facilities: ["shelter","bench"], isMainStation: true },
  { id: "station-finances",   name: "نزل المالية",     nameEn: "Hôtel des Finances",  address: "نزل المالية - خنشلة",            coords: [35.4279, 7.1431],     lines: ["05"],        facilities: ["shelter","bench"], isMainStation: true },
  { id: "station-moussa",     name: "مسجد موسى رداح",      nameEn: "Mosquée Moussa Raddah",    address: "مسجد حي موسى رداح - خنشلة",            coords: [35.450003, 7.123128], lines: ["02"], facilities: ["shelter","bench"],           isMainStation: true  },
  { id: "station-ansigha",    name: "انسيغة",               nameEn: "Ansigha",                  address: "انسيغة - قرب مركز الشرطة",             coords: [35.518,    7.119   ], lines: ["04"], facilities: ["shelter"],                  isMainStation: true  },
  { id: "station-alhama",     name: "الحامة",               nameEn: "Al-Hama (centre)",         address: "الحامة - وسط المدينة",                 coords: [35.4659,   7.0581  ], lines: ["05"], facilities: ["shelter","bench"],           isMainStation: true  },
  { id: "station-mahmal",     name: "نقطة وصول تازوقاغت",      nameEn: "Tazoughaght Arrival Point",   address: "تازوقاغت وسط - خنشلة",                 coords: [35.3697,   7.2154  ], lines: ["06"], facilities: ["shelter"],                  isMainStation: true  },
  { id: "station-culture",    name: "نقطة انطلاق دار الثقافة", nameEn: "Dar Thaqafa Departure Point", address: "دار الثقافة - شارع عباس لقرع - خنشلة", coords: [35.4300,   7.1491  ], lines: ["06"], facilities: ["shelter","bench"],           isMainStation: true  },
  { id: "station-newcity",    name: "المدينة الجديدة",      nameEn: "Cité Nouvelle / Al-Hadika", address: "المدينة الجديدة - حي الحديقة",        coords: [35.424,    7.138   ], lines: ["10"], facilities: ["shelter","bench"],           isMainStation: true  },
  { id: "station-frnqal-v",   name: "قرية فرنقال",         nameEn: "Village Frnqal",           address: "قرية فرنقال - خنشلة",                 coords: [35.45,     7.19    ], lines: ["11"], facilities: ["shelter"],                  isMainStation: true  },
]

export function useRoutes() {
  const [routes, setRoutes] = useState<BusRoute[]>(() => {
    const cached = getFromCache<BusRoute[]>(ROUTES_CACHE_KEY)
    return cached || fallbackRoutes
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const routesRef = collection(db, "routes")
    
    const unsubscribe = onSnapshot(
      routesRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const routesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as BusRoute[]
          setRoutes(routesData)
          setCache(ROUTES_CACHE_KEY, routesData)
        }
        setIsLoading(false)
      },
      () => {
        // On error, use fallback/cached data
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { routes, isLoading }
}

export function useStations() {
  const [stations, setStations] = useState<Station[]>(() => {
    const cached = getFromCache<Station[]>(STATIONS_CACHE_KEY)
    return cached || fallbackStations
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stationsRef = collection(db, "stations")
    
    const unsubscribe = onSnapshot(
      stationsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const stationsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as Station[]
          setStations(stationsData)
          setCache(STATIONS_CACHE_KEY, stationsData)
        }
        setIsLoading(false)
      },
      () => {
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { stations, isLoading }
}

// Hook to search routes and stations with category filter
export function useRouteSearch(searchQuery: string, category?: RouteCategory) {
  const { routes, isLoading: routesLoading } = useRoutes()
  const { stations, isLoading: stationsLoading } = useStations()
  
  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    
    // First filter by category if specified
    let categoryFilteredRoutes = routes
    if (category) {
      categoryFilteredRoutes = routes.filter(route => route.category === category)
    }
    
    if (!query) {
      return { 
        routes, 
        stations, 
        matchedRoutes: categoryFilteredRoutes, 
        matchedStations: stations 
      }
    }
    
    // Search in routes
    const matchedRoutes = categoryFilteredRoutes.filter((route) => 
      route.name.includes(searchQuery) ||
      route.nameEn.toLowerCase().includes(query) ||
      route.lineNumber.toLowerCase().includes(query) ||
      // Search in stops
      route.stops.some(stop => 
        stop.name.includes(searchQuery) || 
        stop.nameEn.toLowerCase().includes(query)
      )
    )
    
    const matchedStations = stations.filter((station) =>
      station.name.includes(searchQuery) ||
      station.nameEn.toLowerCase().includes(query) ||
      station.address.includes(searchQuery)
    )
    
    return { routes, stations, matchedRoutes, matchedStations }
  }, [routes, stations, searchQuery, category])
  
  return {
    ...filteredResults,
    isLoading: routesLoading || stationsLoading
  }
}

// Get routes by category
export function useRoutesByCategory(category: RouteCategory) {
  const { routes, isLoading } = useRoutes()
  
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => route.category === category)
  }, [routes, category])
  
  return { routes: filteredRoutes, isLoading }
}

// Get all unique stations from routes
export function useAllStationsFromRoutes() {
  const { routes } = useRoutes()
  
  return useMemo(() => {
    const stationMap = new Map<string, { name: string; nameEn: string; coords: [number, number]; lines: string[]; municipality?: string }>()
    
    routes.forEach((route) => {
      route.stops.forEach((stop) => {
        const existing = stationMap.get(stop.name)
        if (existing) {
          if (!existing.lines.includes(route.lineNumber)) {
            existing.lines.push(route.lineNumber)
          }
        } else {
          stationMap.set(stop.name, {
            name: stop.name,
            nameEn: stop.nameEn,
            coords: stop.coords,
            lines: [route.lineNumber],
            municipality: stop.municipality
          })
        }
      })
    })
    
    return Array.from(stationMap.values())
  }, [routes])
}

// Get all municipalities served - removed for urban only
export function useMunicipalities() {
  return useMemo(() => {
    return ["خنشلة"]
  }, [])
}

// Get a single route by ID with sub_stations
export function useRouteById(routeId: string | null) {
  const { routes, isLoading } = useRoutes()
  
  const route = useMemo(() => {
    if (!routeId) return null
    return routes.find(r => r.id === routeId || r.lineNumber === routeId) || null
  }, [routes, routeId])
  
  return { route, isLoading }
}

// Get sub_stations for a specific route
export function useRouteSubStations(routeId: string | null) {
  const { route, isLoading } = useRouteById(routeId)
  
  const subStations = useMemo(() => {
    if (!route) return []
    // Return sub_stations if available, otherwise derive from stops
    return route.sub_stations || route.stops.map(stop => ({
      id: stop.id,
      name: stop.name,
      nameEn: stop.nameEn,
      coords: stop.coords,
      order: stop.order,
    }))
  }, [route])
  
  return { subStations, route, isLoading }
}
