"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import { db, rtdb } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { motion, AnimatePresence } from "framer-motion"
import { Layers, ChevronDown, ChevronUp, MapPin, Maximize2, Minimize2, LocateFixed } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useRouteSubStations } from "@/hooks/use-routes"
import { useBusSimulation, type SimulatedBus } from "@/lib/bus-simulation"

// Tile layer URLs — single stable OSM endpoint (no subdomain variable)
const TILE_LAYERS = {
  light: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
}

interface Bus {
  id: string
  latitude: number
  longitude: number
  name?: string
  current_route_id?: string
  isLive?: boolean // true when receiving GPS from Driver App
}

interface DriverLocation {
  lat: number
  lng: number
}

type RouteViewMode = "all" | "single"
type SelectedRoute = string | null

// Khenchela Province center (zoomed out to show municipalities)
const KHENCHELA_PROVINCE_CENTER: [number, number] = [35.40, 7.15]
const KHENCHELA_CITY_CENTER: [number, number] = [35.4377, 7.1458]

// Route categories with colors - Urban only
const ROUTE_CATEGORIES = {
  urban: { label: "داخل المدينة", labelEn: "Urban", color: "#00A651" },
}

// All main stations in Khenchela city with ETUSK Main Station
const urbanStations: { position: [number, number]; name: string; nameEn: string; arabicLabel: string; lines: string[]; isMain: boolean; category: "urban" }[] = [
  // ETUSK Main Hub
  { position: [35.4377, 7.1458], name: "ETUSK Station", nameEn: "ETUSK Main Station", arabicLabel: "محطة ETUSK الرئيسية", lines: ["sub-01", "sub-02", "sub-03", "urb-01", "urb-02", "urb-03", "urb-04"], isMain: true, category: "urban" },
  
  // Terminal Stops
  { position: [35.3900, 7.0800], name: "Hammam Essalhine", nameEn: "Hammam Essalhine", arabicLabel: "حمام الصالحين", lines: ["sub-01"], isMain: true, category: "urban" },
  { position: [35.4650, 7.0900], name: "El Hamma", nameEn: "El Hamma", arabicLabel: "الحمة", lines: ["sub-02"], isMain: true, category: "urban" },
  { position: [35.5000, 7.2500], name: "El Mahmel", nameEn: "El Mahmel", arabicLabel: "المحمل", lines: ["sub-03"], isMain: true, category: "urban" },
  { position: [35.4550, 7.1700], name: "Cite 1000 Logts", nameEn: "Cosider Housing", arabicLabel: "حي كوسيدار", lines: ["urb-01"], isMain: true, category: "urban" },
  { position: [35.3800, 7.1700], name: "Nouveau Pole", nameEn: "New Pole (El Aizar)", arabicLabel: "طريق العيزار", lines: ["urb-02"], isMain: true, category: "urban" },
  { position: [35.4100, 7.0900], name: "Cite Moussa", nameEn: "Moussa Raddah District", arabicLabel: "سيتي موسى الرداح", lines: ["urb-03"], isMain: true, category: "urban" },
  { position: [35.5200, 7.1200], name: "Ensigna", nameEn: "Ensigna", arabicLabel: "انسيغة", lines: ["urb-04"], isMain: true, category: "urban" },
  { position: [35.4200, 7.1200], name: "Ancienne Gare", nameEn: "Old Station", arabicLabel: "المحطة القديمة", lines: ["urb-05"], isMain: true, category: "urban" },
  { position: [35.4350, 7.1400], name: "New Gare A", nameEn: "New Station A", arabicLabel: "المحطة الجديدة أ", lines: ["urb-05"], isMain: true, category: "urban" },
]

// Removed intercity stations - Urban routes only

// Actual organized bus line network for Khenchela - Color coded routes
// Each route defined by 3-4 key waypoints that will be snapped to roads via OSRM
// OSRM will fetch the actual street geometry, ensuring routes follow real roads
const urbanRoutePolylines: { id: string; waypoints: [number, number][]; color: string; name: string; category: "urban"; arabicName: string; terminalFrom: string; terminalTo: string }[] = [
  // BLUE LINE - Northern route through Hammam Essalhine area
  {
    id: "sub-01",
    name: "Hammam Essalhine Route",
    arabicName: "خط حمام الصالحين",
    color: "#0066FF", // Solid Blue
    category: "urban",
    terminalFrom: "حمام الصالحين",
    terminalTo: "شارع النيل",
    waypoints: [
      [35.3850, 7.0750], // Start: Hammam Essalhine area
      [35.4000, 7.0920], // Mid waypoint
      [35.4210, 7.1130], // End: Nile street area
    ]
  },
  
  // GREEN LINE - Eastern route through El Hamma
  {
    id: "sub-02",
    name: "El Hamma Route",
    arabicName: "خط الحامة",
    color: "#22BB33", // Solid Green
    category: "urban",
    terminalFrom: "الحمة",
    terminalTo: "حي الاستقلال",
    waypoints: [
      [35.4700, 7.0850], // Start: El Hamma area
      [35.4500, 7.1050], // Mid waypoint
      [35.4330, 7.1340], // End: Independence district
    ]
  },
  
  // BLACK LINE - Far eastern route through El Mahmel
  {
    id: "sub-03",
    name: "El Mahmel Route",
    arabicName: "خط المحمل",
    color: "#1A1A1A", // Solid Black
    category: "urban",
    terminalFrom: "المحمل",
    terminalTo: "شارع الجمهورية",
    waypoints: [
      [35.5100, 7.2600], // Start: El Mahmel (far east)
      [35.4900, 7.2100], // Mid waypoint
      [35.4550, 7.1800], // End: Republic street
    ]
  },
  
  // CYAN LINE - Southern route through Cosider housing
  {
    id: "urb-01",
    name: "Cosider Housing Route",
    arabicName: "خط حي 1000 مسكن - كوسيدار",
    color: "#00D4FF", // Solid Cyan
    category: "urban",
    terminalFrom: "حي كوسيدار",
    terminalTo: "ساحة السوق",
    waypoints: [
      [35.4650, 7.1850], // Start: Cosider south
      [35.4500, 7.1800], // Mid waypoint
      [35.4420, 7.1590], // End: Market square
    ]
  },
  
  // ORANGE LINE - Western route through New Pole
  {
    id: "urb-02",
    name: "New Pole Route",
    arabicName: "خط القطب الجديد - طريق العيزار",
    color: "#FF9900", // Solid Orange
    category: "urban",
    terminalFrom: "طريق العيزار",
    terminalTo: "شارع فرعون",
    waypoints: [
      [35.3700, 7.1650], // Start: New Pole (far west)
      [35.4000, 7.1720], // Mid waypoint
      [35.4300, 7.1850], // End: Pharaoh street
    ]
  },
  
  // PURPLE LINE - Northwestern route through Moussa Raddah
  {
    id: "urb-03",
    name: "Moussa Raddah Route",
    arabicName: "خط حي موسى رداح",
    color: "#BB00FF", // Solid Purple
    category: "urban",
    terminalFrom: "سيتي موسى الرداح",
    terminalTo: "حي الثورة",
    waypoints: [
      [35.4050, 7.0800], // Start: Moussa Raddah (northwest)
      [35.4200, 7.1050], // Mid waypoint
      [35.4340, 7.1480], // End: Revolution district
    ]
  },
  
  // RED LINE - Eastern route through Ensigna
  {
    id: "urb-04",
    name: "Ensigna Route",
    arabicName: "خط انسيغة",
    color: "#FF3333", // Solid Red
    category: "urban",
    terminalFrom: "انسيغة",
    terminalTo: "ساحة الشهداء",
    waypoints: [
      [35.5300, 7.1250], // Start: Ensigna (far northeast)
      [35.5000, 7.1450], // Mid waypoint
      [35.4700, 7.1510], // End: Martyrs square
    ]
  },
  
  // YELLOW LINE - Central route connecting old station to new station
  {
    id: "urb-05",
    name: "Station Connector Route",
    arabicName: "خط المحطة القديمة - محطة المسافرين",
    color: "#FFDD00", // Solid Yellow
    category: "urban",
    terminalFrom: "المحطة القديمة",
    terminalTo: "محطة المسافرين (الجديدة)",
    waypoints: [
      [35.4150, 7.1150], // Start: Old station (southwest area)
      [35.4350, 7.1360], // End: New passenger station
    ]
  }
]

// OSRM utility function - Fetches actual road geometry for waypoints
// Returns GeoJSON coordinates that follow real streets via OSRM service
async function fetchOSRMRoute(waypoints: [number, number][]): Promise<[number, number][] | null> {
  try {
    // Format waypoints for OSRM: lon,lat;lon,lat;...
    const coordinateString = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';')
    
    // Call OSRM service with overview=full to get detailed route
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(5000) }
    )
    
    if (!response.ok) {
      console.log("[v0] OSRM request failed, falling back to waypoints")
      return null
    }
    
    const data = await response.json()
    
    // Extract coordinates from GeoJSON geometry
    if (data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
      const coords = data.routes[0].geometry.coordinates
      // OSRM returns [lon, lat], we need [lat, lng]
      return coords.map(([lng, lat]: [number, number]) => [lat, lng])
    }
    
    return null
  } catch (error) {
    console.log("[v0] OSRM fetch error, falling back to waypoints:", error)
    return null
  }
}

// All routes (urban only)
const allRoutes = [...urbanRoutePolylines]

// Bus Hub Locations for the fleet (URBAN STATIONS ONLY)
// Buses exist only at urban terminals - No intercity hubs
// Total: 13 active buses for clean interface
const BUS_HUBS = {
  trainStation: { 
    coords: [35.4123, 7.1456] as [number, number], 
    name: "محطة القطار خنشلة",
    nameEn: "Train Station (Khenchela)",
    count: 8 
  },
  newBusTerminal: { 
    coords: [35.4080, 7.1320] as [number, number], 
    name: "المحطة الجديدة",
    nameEn: "New Bus Terminal",
    count: 5 
  },
}

// Generate static fleet buses at FIXED urban station coordinates ONLY
// Uses circular parking layout with random jitter for natural appearance
function generateFleetBuses(): Bus[] {
  const buses: Bus[] = []
  let busIndex = 1
  
  // Seeded random for consistent positions across renders
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000
    return x - Math.floor(x)
  }
  
  // Create circular parking layout with random jitter
  // Buses spread in a circle around the station like a parking lot
  const addParkingOffset = (coords: [number, number], index: number, total: number, stationSeed: number): [number, number] => {
    // Arrange in concentric rings for natural parking look
    const busesPerRing = 5
    const ring = Math.floor(index / busesPerRing)
    const posInRing = index % busesPerRing
    
    // Base radius increases per ring (approx 20-40m spacing)
    const baseRadius = 0.0003 + (ring * 0.00025)
    
    // Angle spread evenly in ring with offset per ring
    const angleOffset = ring * 0.3 // Stagger rings
    const angle = ((posInRing / busesPerRing) * 2 * Math.PI) + angleOffset
    
    // Add random jitter (0.0001 = ~10m)
    const seed = stationSeed * 100 + index
    const jitterLat = (seededRandom(seed) - 0.5) * 0.0002
    const jitterLng = (seededRandom(seed + 50) - 0.5) * 0.0002
    
    return [
      coords[0] + Math.cos(angle) * baseRadius + jitterLat,
      coords[1] + Math.sin(angle) * baseRadius + jitterLng,
    ]
  }
  
  // Train Station (Khenchela) - urban buses
  for (let i = 0; i < BUS_HUBS.trainStation.count; i++) {
    const pos = addParkingOffset(BUS_HUBS.trainStation.coords, i, BUS_HUBS.trainStation.count, 1)
    buses.push({
      id: `fleet-${busIndex.toString().padStart(3, "0")}`,
      latitude: pos[0],
      longitude: pos[1],
      name: `حافلة ${busIndex} - ${BUS_HUBS.trainStation.name}`,
      current_route_id: ["01", "02", "03"][i % 3],
      isLive: false,
    })
    busIndex++
  }
  
  // New Bus Terminal - urban buses
  for (let i = 0; i < BUS_HUBS.newBusTerminal.count; i++) {
    const pos = addParkingOffset(BUS_HUBS.newBusTerminal.coords, i, BUS_HUBS.newBusTerminal.count, 2)
    buses.push({
      id: `fleet-${busIndex.toString().padStart(3, "0")}`,
      latitude: pos[0],
      longitude: pos[1],
      name: `حافلة ${busIndex} - ${BUS_HUBS.newBusTerminal.name}`,
      current_route_id: ["01", "02", "03"][i % 3],
      isLive: false,
    })
    busIndex++
  }
  
  return buses
}

// Generate the static fleet (35 buses total)
const FLEET_BUSES = generateFleetBuses()

// Inject styles
if (typeof document !== "undefined") {
  const styleId = "leaflet-custom-styles-v2"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      @keyframes leaflet-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
      }
      @keyframes bus-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(255,107,0,0.5); }
        50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(255,107,0,0.15), 0 2px 12px rgba(255,107,0,0.6); }
      }
      @keyframes bus-ping {
        0% { transform: scale(1); opacity: 1; }
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      /* Bus marker container - lower z-index than stations and below bottom nav */
      .bus-marker-container { position: relative; z-index: 50 !important; }
      /* Waiting buses: reduced opacity */
      .bus-marker-waiting { opacity: 0.65; }
      .bus-marker-live { opacity: 1; }
      /* Zoomed-out state: small circle (6px) - hidden at low zoom via clustering */
      .bus-marker-mini {
        width: 6px; height: 6px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.9);
        transition: all 0.3s ease;
      }
      .bus-marker-mini.urban { background: #00A651; }
      .bus-marker-mini.live { animation: bus-pulse-mini 2s ease-in-out infinite; }
      @keyframes bus-pulse-mini {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      /* Medium zoom: circle (12px) */
      .bus-marker-medium {
        width: 12px; height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s ease;
      }
      .bus-marker-medium.urban { background: #00A651; box-shadow: 0 1px 3px rgba(0,166,81,0.4); }
      .bus-marker-medium.live { animation: bus-pulse 2s ease-in-out infinite; }
      /* Full zoom: full bus icon (20px) */
      .bus-marker-full {
        width: 20px; height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s ease;
      }
      .bus-marker-full.urban { 
        background: linear-gradient(135deg, #00A651 0%, #22C55E 100%);
        box-shadow: 0 2px 5px rgba(0,166,81,0.4);
      }
      .bus-marker-full.live { animation: bus-pulse 2s ease-in-out infinite; }
      .bus-marker-full:hover { transform: scale(1.1); }
      /* Fixed 24px bus icon - always visible and clickable */
      .bus-marker-icon {
        width: 24px; height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
        box-shadow: none !important;
      }
      .bus-marker-icon.urban { 
        background: linear-gradient(135deg, #00A651 0%, #22C55E 100%);
      }
      .bus-marker-icon.live { animation: bus-pulse 2s ease-in-out infinite; }
      .bus-marker-icon:hover { transform: scale(1.15); z-index: 1000 !important; }
      /* Smooth movement transition for simulated buses */
      .bus-marker-simulated {
        transition: transform 0.1s linear !important;
      }
      .bus-marker-at-station {
        animation: bus-station-pulse 1.5s ease-in-out infinite !important;
      }
      @keyframes bus-station-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3); }
        50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.15); }
      }
      /* Remove all shadows and lines from bus markers */
      .bus-marker-container {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      .bus-marker-container::before,
      .bus-marker-container::after {
        display: none !important;
      }
      .leaflet-marker-icon.bus-marker-container {
        background: transparent !important;
        border: none !important;
      }
      /* Remove default leaflet marker shadows */
      .leaflet-marker-shadow { display: none !important; }
      /* Live bus ping animation */
      .bus-ping {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 100%; height: 100%;
        background: currentColor; border-radius: 50%;
        opacity: 0.3;
        animation: bus-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      .bus-ping.urban { background: rgba(0, 166, 81, 0.3); }
      /* Custom cluster styles */
      .marker-cluster {
        background: rgba(30, 41, 59, 0.85) !important;
        border: 2px solid white !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      }
      .marker-cluster div {
        background: transparent !important;
        color: white !important;
        font-weight: 700 !important;
        font-size: 12px !important;
      }
      .marker-cluster-small {
        background: rgba(0, 166, 81, 0.85) !important;
        width: 32px !important; height: 32px !important;
      }
      .marker-cluster-small div {
        width: 28px !important; height: 28px !important;
        line-height: 28px !important;
      }
      .marker-cluster-medium {
        background: rgba(59, 130, 246, 0.85) !important;
        width: 38px !important; height: 38px !important;
      }
      .marker-cluster-medium div {
        width: 34px !important; height: 34px !important;
        line-height: 34px !important;
      }
      .marker-cluster-large {
        background: rgba(245, 158, 11, 0.9) !important;
        width: 44px !important; height: 44px !important;
      }
      .marker-cluster-large div {
        width: 40px !important; height: 40px !important;
        line-height: 40px !important;
      }
      /* Spiderfy styles */
      .leaflet-marker-icon.leaflet-interactive { cursor: pointer; }
      .leaflet-cluster-anim .leaflet-marker-icon, 
      .leaflet-cluster-anim .leaflet-marker-shadow {
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      }
      /* Station markers - higher z-index than buses, but below bottom nav */
      .station-marker { 
        transition: transform 0.2s ease, opacity 0.3s ease;
        z-index: 75 !important;
      }
      .station-marker:hover { transform: scale(1.15); z-index: 85 !important; }
      .station-marker.faded { opacity: 0.3; }
      .urban-station-marker {
        width: 8px; height: 8px;
        background: #FFFFFF; border: 2px solid currentColor; border-radius: 50%;
        box-shadow: 0 0 8px currentColor, 0 0 12px rgba(255, 255, 255, 0.4);
        display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(0 0 4px currentColor);
      }
      .urban-station-marker.main {
        width: 8px; height: 8px; border-width: 2px;
        box-shadow: 0 0 8px currentColor, 0 0 12px rgba(255, 255, 255, 0.4);
      }
      .urban-station-marker.minor {
        width: 6px; height: 6px; border-width: 1px;
        background: #FFFFFF;
        box-shadow: 0 0 6px currentColor, 0 0 10px rgba(255, 255, 255, 0.3);
      }
      .leaflet-popup-content-wrapper { 
        border-radius: 12px; backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.95); padding: 0;
      }
      .dark .leaflet-popup-content-wrapper {
        background: rgba(30, 41, 59, 0.95);
        border: 1px solid rgba(71, 85, 105, 0.5);
      }
      .leaflet-popup-content { margin: 12px 16px; font-size: 14px; }
      .leaflet-popup-tip { background: rgba(255, 255, 255, 0.95); }
      .dark .leaflet-popup-tip { background: rgba(30, 41, 59, 0.95); }
      .station-popup { text-align: center; direction: rtl; }
      .station-popup-name {
        font-family: 'Noto Sans Arabic', sans-serif;
        font-weight: 700; font-size: 15px; color: #1a1a1a; margin-bottom: 4px;
      }
      .dark .station-popup-name { color: #F8FAFC; }
      .station-popup-municipality {
        font-size: 12px; color: #3B82F6; margin-bottom: 6px; font-weight: 500;
      }
      .station-popup-lines { 
        display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; 
        margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;
      }
      .dark .station-popup-lines { border-top-color: rgba(71, 85, 105, 0.5); }
      .station-popup-lines-title {
        font-size: 11px; color: #666; margin-bottom: 4px; width: 100%;
      }
      .dark .station-popup-lines-title { color: #94A3B8; }
      /* Leaflet zoom controls dark mode */
      .dark .leaflet-control-zoom {
        border: 1px solid rgba(71, 85, 105, 0.5) !important;
        border-radius: 8px !important;
        overflow: hidden;
      }
      .dark .leaflet-control-zoom a {
        background: rgba(30, 41, 59, 0.95) !important;
        color: #F8FAFC !important;
        border-color: rgba(71, 85, 105, 0.5) !important;
      }
      .dark .leaflet-control-zoom a:hover {
        background: rgba(51, 65, 85, 0.95) !important;
      }
      .dark .leaflet-control-attribution {
        background: rgba(30, 41, 59, 0.8) !important;
        color: #94A3B8 !important;
      }
      .dark .leaflet-control-attribution a { color: #60A5FA !important; }
      .station-line-badge {
        font-size: 11px; font-weight: 600;
        padding: 3px 8px; border-radius: 6px;
        color: white; cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .station-line-badge:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .station-line-badge.urban { background: #00A651; }
      /* ── Living line flow animation ── */
      @keyframes route-flow {
        from { stroke-dashoffset: 0; }
        to   { stroke-dashoffset: -25; }
      }
      /* ── Terminal dot pulse ── */
      @keyframes terminal-pulse {
        0%, 100% { transform: scale(0.8); opacity: 0.85; }
        50%       { transform: scale(1.2); opacity: 1; }
      }
      /* Main animated dashed line — targets the SVG <path> directly in Leaflet SVG mode */
      .cyber-line {
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        opacity: 0.85 !important;
        filter: drop-shadow(0 0 5px rgba(255,255,255,0.5)) !important;
        animation: route-flow 3s linear infinite !important;
        animation-play-state: running !important;
        will-change: stroke-dashoffset;
      }
      /* Glow halo layer — thick blurred path rendered behind the dashed line */
      .cyber-glow {
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        opacity: 0.2 !important;
        filter: blur(4px) !important;
      }
      /* Pulsing start / end terminal dots */
      .marker-start > div,
      .marker-end > div {
        animation: terminal-pulse 1.5s ease-in-out infinite;
        transform-origin: center;
      }
      .route-polyline { transition: opacity 0.3s ease, stroke-width 0.3s ease; }
      .route-polyline-faded { opacity: 0.12 !important; }
      .route-polyline-highlighted { opacity: 1 !important; }
      .sub-station-marker {
        width: 12px; height: 12px;
        background: #FF6B00; border: 2px solid white; border-radius: 50%;
        box-shadow: 0 2px 4px rgba(255,107,0,0.4);
        transition: transform 0.2s ease;
      }
      .sub-station-marker:hover { transform: scale(1.3); }
      @keyframes sub-station-pulse {
        0%, 100% { box-shadow: 0 2px 4px rgba(255,107,0,0.4); }
        50% { box-shadow: 0 0 0 4px rgba(255,107,0,0.2), 0 2px 4px rgba(255,107,0,0.4); }
      }
      .sub-station-marker.active { animation: sub-station-pulse 2s infinite; }
      /* Driver marker styles - pink/magenta bus */
      .driver-marker-icon {
        width: 28px; height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 0 2px white, 0 0 12px rgba(236, 72, 153, 0.6);
        position: relative;
      }
      .driver-marker-icon::after {
        content: '';
        position: absolute;
        width: 40px; height: 40px;
        background: radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%);
        border-radius: 50%;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        animation: driver-marker-pulse 2s ease-in-out infinite;
        pointer-events: none;
      }
      .driver-marker-icon svg {
        position: relative;
        z-index: 1;
      }
      @keyframes driver-marker-pulse {
        0%, 100% { width: 40px; height: 40px; }
        50% { width: 55px; height: 55px; }
      }
      .driver-marker-icon:hover { 
        transform: scale(1.15); 
        box-shadow: 0 0 0 2px white, 0 0 18px rgba(236, 72, 153, 0.8);
      }
      /* ── Simulated bus markers ── */
      .sim-bus-wrap {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      .sim-bus-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        transform-origin: center;
        will-change: transform;
        filter: drop-shadow(0 0 5px currentColor);
      }
    `
    document.head.appendChild(style)
  }
}

function RouteController({
  viewMode, 
  setViewMode, 
  selectedRoute, 
  setSelectedRoute,
  onRouteSelect,
  isDark
}: { 
  viewMode: RouteViewMode
  setViewMode: (mode: RouteViewMode) => void
  selectedRoute: SelectedRoute
  setSelectedRoute: (route: SelectedRoute) => void
  onRouteSelect: (routeId: string | null) => void
  isDark: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Dark mode colors
  const bgColor = isDark ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)"
  const textColor = isDark ? "#F8FAFC" : "#1a1a1a"
  const mutedTextColor = isDark ? "#94A3B8" : "#64748b"
  const borderColor = isDark ? "rgba(71, 85, 105, 0.5)" : "rgba(226, 232, 240, 1)"
  const hoverBg = isDark ? "rgba(51, 65, 85, 0.8)" : "rgba(241, 245, 249, 0.8)"
  const activeBg = isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)"

  const handleRouteClick = (routeId: string) => {
    if (selectedRoute === routeId) {
      setSelectedRoute(null)
      setViewMode("all")
      onRouteSelect(null)
    } else {
      setSelectedRoute(routeId)
      setViewMode("single")
      onRouteSelect(routeId)
    }
    setIsExpanded(false)
  }

  const handleShowAll = () => {
    setSelectedRoute(null)
    setViewMode("all")
    onRouteSelect(null)
    setIsExpanded(false)
  }

  return (
    <>
      {/* Route Controller - Top Right */}
      <div className="absolute right-4 top-4 z-[1000]" style={{ direction: "rtl" }}>
        <motion.div
          layout
          className="overflow-hidden rounded-xl shadow-lg backdrop-blur-sm"
          style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
        >
          {/* Controller Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" style={{ color: "#22C55E" }} />
              <span className="text-sm font-semibold" style={{ color: textColor }}>
                {viewMode === "all" 
                  ? "كل الخطوط" 
                  : selectedRoute 
                    ? urbanRoutePolylines.find(r => r.id === selectedRoute)?.arabicName || selectedRoute
                    : "اختر خط"
                }
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: mutedTextColor }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: mutedTextColor }} />
            )}
          </button>

          {/* Expanded Route List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <div className="max-h-64 overflow-y-auto p-2">
                  {/* Show All Button */}
                  <button
                    onClick={handleShowAll}
                    className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                    style={{ 
                      backgroundColor: viewMode === "all" ? activeBg : "transparent",
                      color: viewMode === "all" ? "#22C55E" : textColor
                    }}
                    onMouseEnter={(e) => { if (viewMode !== "all") e.currentTarget.style.backgroundColor = hoverBg }}
                    onMouseLeave={(e) => { if (viewMode !== "all") e.currentTarget.style.backgroundColor = "transparent" }}
                  >
                    <MapPin className="h-4 w-4" style={{ color: viewMode === "all" ? "#22C55E" : mutedTextColor }} />
                    <span className="font-medium">عرض كل الخطوط</span>
                  </button>

                  {/* Suburban & Urban Routes with colored swatches */}
                  <div className="mb-2">
                    <div className="mb-1 px-2 text-[11px] font-semibold" style={{ color: mutedTextColor }}>
                      خطوط النقل
                    </div>
                    {urbanRoutePolylines.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => handleRouteClick(route.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                        style={{ 
                          backgroundColor: selectedRoute === route.id ? activeBg : "transparent",
                          color: selectedRoute === route.id ? route.color : textColor
                        }}
                        onMouseEnter={(e) => { if (selectedRoute !== route.id) e.currentTarget.style.backgroundColor = hoverBg }}
                        onMouseLeave={(e) => { if (selectedRoute !== route.id) e.currentTarget.style.backgroundColor = "transparent" }}
                      >
                        <div 
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ 
                            backgroundColor: route.color,
                            border: selectedRoute === route.id ? `2px solid ${route.color}` : "1px solid rgba(0,0,0,0.2)",
                            boxShadow: selectedRoute === route.id ? `0 0 0 2px ${route.color}40` : "none"
                          }}
                        />
                        <span className={selectedRoute === route.id ? "font-bold" : "font-medium"}>
                          {route.arabicName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}

// Interpolate position + compute heading along a coordinate array (degree-space, fast)
function getSimBusPosAndHeading(
  coords: [number, number][],
  progress: number
): { lat: number; lng: number; heading: number } {
  if (!coords || coords.length < 2) {
    return { lat: coords?.[0]?.[0] ?? 35.44, lng: coords?.[0]?.[1] ?? 7.15, heading: 0 }
  }
  const clamped = Math.max(0, Math.min(0.9999, progress))
  let totalLen = 0
  const lens: number[] = []
  for (let i = 0; i < coords.length - 1; i++) {
    const d = Math.hypot(coords[i + 1][0] - coords[i][0], coords[i + 1][1] - coords[i][1])
    lens.push(d)
    totalLen += d
  }
  if (totalLen === 0) return { lat: coords[0][0], lng: coords[0][1], heading: 0 }
  const target = clamped * totalLen
  let acc = 0
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target) {
      const t = lens[i] > 0 ? (target - acc) / lens[i] : 0
      const lat = coords[i][0] + t * (coords[i + 1][0] - coords[i][0])
      const lng = coords[i][1] + t * (coords[i + 1][1] - coords[i][1])
      const heading = Math.atan2(
        coords[i + 1][1] - coords[i][1],
        coords[i + 1][0] - coords[i][0]
      ) * (180 / Math.PI)
      return { lat, lng, heading }
    }
    acc += lens[i]
  }
  const last = coords[coords.length - 1]
  return { lat: last[0], lng: last[1], heading: 0 }
}

interface LeafletMapProps {
  trackingLineId?: string | null
  isFullscreen?: boolean
}

export default function LeafletMap({ trackingLineId, isFullscreen = false }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const isInitializedRef = useRef(false)
  const [buses, setBuses] = useState<Bus[]>([])
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  // Separate refs for clustered vs non-clustered markers
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map()) // For simulated (moving) buses - NOT clustered
  const fleetClusterRef = useRef<L.MarkerClusterGroup | null>(null) // For static fleet buses - CLUSTERED
  const fleetMarkersRef = useRef<Map<string, L.Marker>>(new Map()) // Track fleet markers in cluster
  const routePolylinesRef = useRef<Map<string, L.Polyline>>(new Map())
  const routeGlowPolylinesRef = useRef<Map<string, L.Polyline>>(new Map())
  const routeCoordsRef = useRef<Map<string, [number, number][]>>(new Map())
  const simBusMarkersRef = useRef<Array<{ marker: L.Marker; routeId: string; progressOffset: number }>>([])
  const simAnimFrameRef = useRef<number | null>(null)
  const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const subStationMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const driverMarkerRef = useRef<L.Marker | null>(null) // For real-time driver location
  const userMarkerRef = useRef<L.Marker | null>(null) // For "locate me" blue dot
  const { isDark } = useTheme()
  const [tilesLoaded, setTilesLoaded] = useState(false)

  // Locate me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  // Route viewing state
  const [viewMode, setViewMode] = useState<RouteViewMode>("all")
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute>(null)
  
  // Get sub-stations for selected route
const { subStations } = useRouteSubStations(selectedRoute)
  
  // Get simulated buses from context
  const { simulatedBuses } = useBusSimulation()
  
  // Static fleet buses (35 buses waiting at hub locations)
  // These will become live when Driver App sends GPS signals
  const [fleetBuses] = useState<Bus[]>(FLEET_BUSES)
  
  // Track current zoom level for icon scaling
  const [currentZoom, setCurrentZoom] = useState(13)
  
  // Track if map is ready for rendering markers
  const [mapReady, setMapReady] = useState(false)

  // Handle route selection from controller
  const handleRouteSelect = useCallback((routeId: string | null) => {
    const map = mapRef.current
    if (!map) return

    // Update polyline styles
    routePolylinesRef.current.forEach((polyline, id) => {
      if (routeId === null) {
        polyline.setStyle({ weight: 4, opacity: 0.85 })
        polyline.getElement()?.classList.remove("route-polyline-faded", "route-polyline-highlighted")
      } else if (id === routeId) {
        polyline.setStyle({ weight: 6, opacity: 1 })
        polyline.getElement()?.classList.remove("route-polyline-faded")
        polyline.getElement()?.classList.add("route-polyline-highlighted")
        polyline.bringToFront()
      } else {
        polyline.setStyle({ weight: 2, opacity: 0.12 })
        polyline.getElement()?.classList.add("route-polyline-faded")
        polyline.getElement()?.classList.remove("route-polyline-highlighted")
      }
    })

    // Sync glow halo layers
    routeGlowPolylinesRef.current.forEach((glow, id) => {
      if (routeId === null) {
        glow.setStyle({ weight: 14, opacity: 0.18 })
      } else if (id === routeId) {
        glow.setStyle({ weight: 20, opacity: 0.28 })
        glow.bringToFront()
      } else {
        glow.setStyle({ weight: 10, opacity: 0.04 })
      }
    })

    // Update station marker styles
    stationMarkersRef.current.forEach((marker, name) => {
      const markerElement = marker.getElement()
      if (!markerElement) return

      if (routeId === null) {
        markerElement.classList.remove("faded")
        markerElement.style.opacity = "1"
      } else {
        // Check if this station is on the selected route
        const station = urbanStations.find(s => s.name === name)
        if (station && station.lines.includes(routeId)) {
          markerElement.classList.remove("faded")
          markerElement.style.opacity = "1"
        } else {
          markerElement.classList.add("faded")
          markerElement.style.opacity = "0.3"
        }
      }
    })

    // If a route is selected, fit map to that route
    if (routeId) {
      const route = allRoutes.find(r => r.id === routeId)
      if (route) {
        const bounds = L.latLngBounds(route.waypoints)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    }
  }, [])

  // Handle tracking from props
  useEffect(() => {
    if (trackingLineId && mapRef.current) {
      setSelectedRoute(trackingLineId)
      setViewMode("single")
      handleRouteSelect(trackingLineId)
    }
  }, [trackingLineId, handleRouteSelect])

  // Switch tile layer based on theme (setUrl reuses the existing layer — no re-create)
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    const newUrl = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light
    tileLayerRef.current.setUrl(newUrl)
  }, [isDark])

  // Re-measure the container whenever fullscreen state changes so Leaflet
  // fills the new dimensions without gray edges
  useEffect(() => {
    const t = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize(true)
    }, 250)
    return () => clearTimeout(t)
  }, [isFullscreen])

  // Real-time listener for Firebase buses (live GPS from Driver App)
  // Falls back gracefully - fleet buses will still render if Firebase fails
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    
    try {
      const busesCollectionRef = collection(db, "buses")
      
      unsubscribe = onSnapshot(
        busesCollectionRef,
        (snapshot) => {
          const busesData: Bus[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            latitude: doc.data().latitude,
            longitude: doc.data().longitude,
            name: doc.data().name,
            current_route_id: doc.data().current_route_id,
            isLive: true, // Firebase buses are live
          }))
          setBuses(busesData)
        },
        (error) => {
          console.error("[v0] Firebase bus listener error (using offline fleet):", error.message)
          // Fleet buses will still render - no action needed
        }
      )
    } catch (error) {
      console.error("[v0] Firebase initialization error (using offline fleet):", error)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Real-time listener for driver location (0775453629 = drivers/0775453629/location)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    try {
      const driverLocationRef = ref(rtdb, "drivers/0775453629/location")
      
      unsubscribe = onValue(
        driverLocationRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            if (data && typeof data.lat === "number" && typeof data.lng === "number") {
              setDriverLocation({
                lat: data.lat,
                lng: data.lng,
              })
              console.log("[v0] Driver location updated:", data)
            }
          } else {
            // Driver is offline
            setDriverLocation(null)
          }
        },
        (error) => {
          console.error("[v0] Driver location listener error:", error.message)
        }
      )
    } catch (error) {
      console.error("[v0] Driver location initialization error:", error)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])



  // Initialize map
  useEffect(() => {
    const container = containerRef.current
    if (!container || isInitializedRef.current) return

    const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number }
    if (leafletContainer._leaflet_id) return

    isInitializedRef.current = true

    const map = L.map(container, {
      attributionControl: false,
      center: KHENCHELA_CITY_CENTER,
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
      minZoom: 10,
      maxZoom: 18,
      preferCanvas: false, // SVG mode required for CSS stroke-dashoffset animation
    })

    mapRef.current = map

    // Add initial tile layer — initialized ONCE, never re-created on re-renders
    tileLayerRef.current = L.tileLayer(TILE_LAYERS.light, {
      maxZoom: 18,
      minZoom: 10,
      tileSize: 256,
      zoomOffset: 0,
      keepBuffer: 6,
      updateWhenIdle: true,
      updateWhenZooming: false,
      crossOrigin: "anonymous",
    }).addTo(map)

    // Bug 1 fix: hide spinner after first tile-batch load OR 2 s fallback.
    // NEVER reset it back to false — prevents spinner flickering on every pan/zoom.
    const hideSpinner = () => setTilesLoaded(true)
    tileLayerRef.current.on("load", hideSpinner)
    const spinnerFallback = setTimeout(hideSpinner, 2000)

    // Bug 4 fix: guarantee Leaflet knows the real container size after mount
    const mountSizeTimer = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize(true)
    }, 300)

    // Track zoom level for bus icon scaling
    map.on("zoomend", () => {
      setCurrentZoom(map.getZoom())
      // Re-render any tiles that may have gone gray during zoom
      setTimeout(() => map.invalidateSize(), 150)
    })

    // Fix gray tiles on any container resize (fullscreen, panel open/close, etc.)
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize()
      }, 200)
    })
    if (container) resizeObserver.observe(container)
    
    // Create marker cluster group for static fleet buses
    // Simulated (moving) buses are NOT clustered to prevent flickering
    const fleetCluster = L.markerClusterGroup({
      maxClusterRadius: 50, // Cluster within 50px
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 15, // Show individual markers at zoom 15+
      animate: true,
      animateAddingMarkers: false, // Prevent animation on add to reduce flicker
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        let size = "small"
        let dimensions = 32
        if (count > 10) {
          size = "medium"
          dimensions = 38
        }
        if (count > 25) {
          size = "large"
          dimensions = 44
        }
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(dimensions, dimensions),
        })
      }
    })
    fleetCluster.addTo(map)
    fleetClusterRef.current = fleetCluster
  
  // Add urban route polylines with OSRM-based snap-to-road routing + dashed animated styling
    urbanRoutePolylines.forEach(async (route) => {
      // Fetch real road geometry from OSRM
      const osrmCoords = await fetchOSRMRoute(route.waypoints)
      const routeCoords = osrmCoords || route.waypoints // Fallback to waypoints if OSRM fails

      // Glow halo layer — thick, blurred, same color, drawn FIRST (behind)
      const glowPolyline = L.polyline(routeCoords, {
        color: route.color,
        weight: 14,
        opacity: 0.18,
        lineCap: "round",
        lineJoin: "round",
        className: "cyber-glow",
        interactive: false,
      }).addTo(map)
      routeGlowPolylinesRef.current.set(route.id, glowPolyline)
      
      // Main polyline — dashed, animated, drawn ON TOP of glow
      const polyline = L.polyline(routeCoords, {
        color: route.color,
        weight: 4,
        opacity: 0.85,
        dashArray: "10, 15",
        lineCap: "round",
        lineJoin: "round",
        className: "route-polyline cyber-line",
      }).addTo(map)
      
      // Add start marker at first coordinate
      if (routeCoords.length > 0) {
        const startMarker = L.marker(routeCoords[0], {
          icon: L.divIcon({
            html: `<div style="width: 12px; height: 12px; background-color: white; border: 3px solid ${route.color}; border-radius: 50%; box-shadow: 0 0 8px ${route.color};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            className: "marker-start",
          }),
          zIndexOffset: 250,
        }).addTo(map)
      }
      
      // Add end marker at last coordinate
      if (routeCoords.length > 1) {
        const endMarker = L.marker(routeCoords[routeCoords.length - 1], {
          icon: L.divIcon({
            html: `<div style="width: 12px; height: 12px; background-color: white; border: 3px solid ${route.color}; border-radius: 50%; box-shadow: 0 0 8px ${route.color};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            className: "marker-end",
          }),
          zIndexOffset: 250,
        }).addTo(map)
      }
      
      polyline.bindPopup(`
        <div class="station-popup">
          <div class="station-popup-name">${route.arabicName}</div>
          <div style="font-size:11px;color:#666;margin-top:4px;">من: ${route.terminalFrom}</div>
          <div style="font-size:11px;color:#666;">إلى: ${route.terminalTo}</div>
        </div>
      `)
      
      routePolylinesRef.current.set(route.id, polyline)
      // Store resolved coords for the rAF simulation loop
      routeCoordsRef.current.set(route.id, routeCoords)
    })

    // Function to create line badges HTML with colored swatches
    const createLineBadges = (lines: string[]) => {
      return lines.map(line => {
        const route = urbanRoutePolylines.find(r => r.id === line)
        const color = route?.color || "#999"
        const lineName = route?.arabicName || line
        return `<span class="station-line-badge" style="background-color: ${color}; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; color: white; font-size: 11px; font-weight: 600;" data-line="${line}">
          <span style="width: 6px; height: 6px; background-color: rgba(255,255,255,0.5); border-radius: 50%;"></span>
          ${lineName}
        </span>`
      }).join("")
    }

    // Station markers intentionally omitted — only route start/end dots are shown

    // ── Simulated buses: 2 per route, rAF-driven, zero React re-renders ──
    // Seed routeCoordsRef with waypoints immediately so buses start moving before OSRM resolves
    urbanRoutePolylines.forEach(route => {
      if (!routeCoordsRef.current.has(route.id)) {
        routeCoordsRef.current.set(route.id, route.waypoints)
      }
    })

    const BUSES_PER_ROUTE = 2
    const ROUTE_DURATION_MS = 50000 // full lap in 50 s — tuneable

    urbanRoutePolylines.forEach(route => {
      for (let b = 0; b < BUSES_PER_ROUTE; b++) {
        const progressOffset = b / BUSES_PER_ROUTE // bus 0 → 0.0, bus 1 → 0.5
        const initial = route.waypoints[0]
        const busMarker = L.marker(initial, {
          icon: L.divIcon({
            className: "sim-bus-wrap",
            html: `<div class="sim-bus-inner" style="color:${route.color};">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Direction arrow at nose -->
                <polygon points="9,0 5,5 13,5" fill="currentColor" opacity="0.95"/>
                <!-- Body -->
                <rect x="2" y="5" width="14" height="11" rx="2" fill="currentColor" opacity="0.9"/>
                <!-- Windows -->
                <rect x="3.5" y="7" width="4" height="3" rx="0.8" fill="white" opacity="0.8"/>
                <rect x="10.5" y="7" width="4" height="3" rx="0.8" fill="white" opacity="0.8"/>
                <!-- Underline / skirt -->
                <rect x="2" y="14.5" width="14" height="1.5" rx="0.5" fill="white" opacity="0.3"/>
                <!-- Wheels -->
                <circle cx="5" cy="18.5" r="1.5" fill="white" opacity="0.75"/>
                <circle cx="13" cy="18.5" r="1.5" fill="white" opacity="0.75"/>
              </svg>
            </div>`,
            iconSize: [18, 20],
            iconAnchor: [9, 10],
          }),
          zIndexOffset: 400,
          interactive: false,
        }).addTo(map)
        simBusMarkersRef.current.push({ marker: busMarker, routeId: route.id, progressOffset })
      }
    })

    // rAF loop — reads routeCoordsRef (updated as OSRM resolves), no React state
    const simStartTime = Date.now()
    const tickSimBuses = () => {
      const elapsed = Date.now() - simStartTime
      simBusMarkersRef.current.forEach(({ marker, routeId, progressOffset }) => {
        const coords = routeCoordsRef.current.get(routeId)
        if (!coords || coords.length < 2) return
        const progress = ((elapsed / ROUTE_DURATION_MS) + progressOffset) % 1
        const { lat, lng, heading } = getSimBusPosAndHeading(coords, progress)
        marker.setLatLng([lat, lng])
        const inner = marker.getElement()?.querySelector('.sim-bus-inner') as HTMLElement | null
        if (inner) inner.style.transform = `rotate(${heading}deg)`
      })
      simAnimFrameRef.current = requestAnimationFrame(tickSimBuses)
    }
    simAnimFrameRef.current = requestAnimationFrame(tickSimBuses)

    // Mark map as ready for bus markers
    setMapReady(true)
  
    return () => {
      clearTimeout(spinnerFallback)
      clearTimeout(mountSizeTimer)
      setMapReady(false)
      // Cancel rAF sim loop
      if (simAnimFrameRef.current !== null) {
        cancelAnimationFrame(simAnimFrameRef.current)
        simAnimFrameRef.current = null
      }
      // Remove simulated bus markers
      simBusMarkersRef.current.forEach(({ marker }) => marker.remove())
      simBusMarkersRef.current = []
      // Clear simulated bus markers (direct on map)
      busMarkersRef.current.forEach((marker) => marker.remove())
      busMarkersRef.current.clear()
      // Clear fleet cluster
      if (fleetClusterRef.current) {
        fleetClusterRef.current.clearLayers()
        fleetClusterRef.current = null
      }
      fleetMarkersRef.current.clear()
      routePolylinesRef.current.clear()
      routeGlowPolylinesRef.current.clear()
      stationMarkersRef.current.clear()
      subStationMarkersRef.current.forEach((marker) => marker.remove())
      subStationMarkersRef.current.clear()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      isInitializedRef.current = false
    }
  }, [])

// Separate simulated buses (moving, NOT clustered) from static buses (clustered)
  const { movingBuses, staticBuses } = useMemo(() => {
    // Filter simulated buses by route if needed
    let moving = simulatedBuses.filter(bus => {
      if (!selectedRoute) return true
      return bus.lineId === selectedRoute
    })
    
    // Combine Firebase and fleet buses as static
    const allStatic: Bus[] = [...buses, ...fleetBuses]
    let staticFiltered = allStatic.filter(bus => {
      if (!selectedRoute) return true
      return bus.current_route_id === selectedRoute
    })
    
    return { movingBuses: moving, staticBuses: staticFiltered }
  }, [simulatedBuses, buses, fleetBuses, selectedRoute])
  
  // Helper function to get bus icon - ALWAYS 24px bus icons (no small dots)
  // All buses are displayed as clickable 24px bus icons regardless of zoom level
  const getBusIcon = useCallback((bus: Bus | SimulatedBus) => {
    const category = ('category' in bus) ? bus.category : "urban"
    const isLive = bus.isLive || false
    const isSimulated = 'routeProgress' in bus
    const isAtStation = isSimulated && (bus as SimulatedBus).status === "at_station"
    const categoryClass = category === "intercity" ? "intercity" : "urban"
    
    // Additional classes for simulated buses
    const simulatedClass = isSimulated ? "bus-marker-simulated" : ""
    const stationClass = isAtStation ? "bus-marker-at-station" : ""
    
    // Always use 24px bus icon with proper Bus SVG
    // iconAnchor [12, 12] = center of icon anchored to coordinate for smooth movement
    return L.divIcon({
      className: "bus-marker-container",
      html: `<div class="bus-marker-icon ${categoryClass} ${isLive ? "live" : ""} ${!isLive ? "bus-marker-waiting" : ""} ${simulatedClass} ${stationClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/>
            <rect x="4" y="3" width="16" height="18" rx="2"/>
            <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
          </svg>
        </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12], // Center anchor for smooth movement
    })
  }, [])

  // Update sub-station markers when selected route changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing sub-station markers
    subStationMarkersRef.current.forEach((marker) => marker.remove())
    subStationMarkersRef.current.clear()

    // Only add sub-station markers when a route is selected
    if (!selectedRoute || subStations.length === 0) return

    // Find the route color
    const route = allRoutes.find(r => r.id === selectedRoute)
    const routeColor = route 
      ? ROUTE_CATEGORIES.urban.color
      : "#FF6B00"

    // Create sub-station markers
    subStations.forEach((subStation) => {
      const subStationIcon = L.divIcon({
        className: "sub-station-container",
        html: `<div class="sub-station-marker active" style="background: ${routeColor};"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

const marker = L.marker(subStation.coords, { 
      icon: subStationIcon,
      zIndexOffset: 150 // Between buses and stations
    })
      .addTo(map)
      .bindPopup(`
        <div class="station-popup">
          <div class="station-popup-name">${subStation.name}</div>
          <div style="font-size:11px;" class="station-popup-lines-title">${subStation.nameEn}</div>
            <div style="font-size:10px;color:#999;margin-top:4px;">محطة فرعية - ترتيب ${subStation.order}</div>
          </div>
        `)

      subStationMarkersRef.current.set(subStation.id, marker)
    })
  }, [selectedRoute, subStations])
  
// Validate coordinate is valid and within Khenchela region
  const isValidCoord = useCallback((lat: number, lon: number): boolean => {
    return (
      typeof lat === "number" &&
      typeof lon === "number" &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      isFinite(lat) &&
      isFinite(lon) &&
      lat >= 35.0 && lat <= 36.0 &&
      lon >= 6.5 && lon <= 8.0
    )
  }, [])

  // Update SIMULATED (moving) bus markers - NOT clustered for smooth movement
  // DISABLED: Bus markers removed from map display
  useEffect(() => {
    return // Disable bus marker rendering
    const map = mapRef.current
    if (!map || !mapReady) return
    
    // Filter to valid coordinates only
    const validMovingBuses = movingBuses.filter(bus => isValidCoord(bus.latitude, bus.longitude))
    const currentIds = new Set(validMovingBuses.map(bus => bus.id))

    // Remove old markers
    busMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        busMarkersRef.current.delete(id)
      }
    })

    // Update or create markers for moving buses
    validMovingBuses.forEach((bus) => {
      const existingMarker = busMarkersRef.current.get(bus.id)
      
      // Status for simulated buses
      const statusLabel = bus.status === "at_station" 
        ? `في المحطة: ${bus.nearestStation}` 
        : "في الطريق"
      const statusColor = bus.status === "at_station" ? "#22C55E" : "#3B82F6"
      
      const popupContent = `
        <div class="station-popup">
          <div class="station-popup-name">${bus.name}</div>
          <div style="font-size:11px;margin-top:4px;">
            <span style="color:#00A651;font-weight:600;">داخلي</span>
            <span style="color:#666;margin:0 4px;">•</span>
            <span style="color:${statusColor};font-weight:500;">${statusLabel}</span>
          </div>
          <div style="font-size:11px;color:#666;margin-top:4px;">الخط: ${bus.lineName}</div>
          <div style="font-size:12px;color:#22C55E;font-weight:600;margin-top:6px;padding:6px 10px;background:rgba(34,197,94,0.1);border-radius:6px;">
            الوصول خلال ${bus.arrivalMinutes} دقيقة
          </div>
        </div>
      `
      
      const busIcon = getBusIcon(bus)
      
      if (existingMarker) {
        // Smooth position update
        existingMarker.setLatLng([bus.latitude, bus.longitude])
        existingMarker.setIcon(busIcon)
        existingMarker.setPopupContent(popupContent)
      } else {
        // Create new marker directly on map (NOT in cluster)
        const marker = L.marker([bus.latitude, bus.longitude], { 
          icon: busIcon,
          zIndexOffset: 500 // Above clusters
        })
          .addTo(map)
          .bindPopup(popupContent)
        
        busMarkersRef.current.set(bus.id, marker)
      }
    })
  }, [movingBuses, mapReady, isValidCoord, getBusIcon])

  // Update STATIC (fleet) bus markers - CLUSTERED to prevent overlap
  // DISABLED: Bus markers removed from map display
  useEffect(() => {
    return // Disable bus marker rendering
    const cluster = fleetClusterRef.current
    if (!cluster || !mapReady) return
    
    // Filter to valid coordinates
    const validStaticBuses = staticBuses.filter(bus => isValidCoord(bus.latitude, bus.longitude))
    const currentIds = new Set(validStaticBuses.map(bus => bus.id))

    // Remove markers no longer needed
    fleetMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        cluster.removeLayer(marker)
        fleetMarkersRef.current.delete(id)
      }
    })

    // Add new fleet bus markers to cluster
    validStaticBuses.forEach((bus) => {
      if (fleetMarkersRef.current.has(bus.id)) return // Already exists
      
      const statusLabel = bus.isLive ? "نشط" : "في الانتظار"
      const statusColor = bus.isLive ? "#22C55E" : "#94A3B8"
      const route = allRoutes.find(r => r.id === bus.current_route_id)
      const routeName = route ? route.name : `خط ${bus.current_route_id || "غير محدد"}`
      
      const popupContent = `
        <div class="station-popup">
          <div class="station-popup-name">${bus.name || `حافلة ${bus.id}`}</div>
          <div style="font-size:11px;margin-top:4px;">
            <span style="color:#00A651;font-weight:600;">داخلي</span>
            <span style="color:#666;margin:0 4px;">•</span>
            <span style="color:${statusColor};font-weight:500;">${statusLabel}</span>
          </div>
          ${bus.current_route_id ? `<div style="font-size:11px;color:#666;margin-top:4px;">الخط: ${routeName}</div>` : ""}
        </div>
      `
      
      const busIcon = getBusIcon(bus)
      
      const marker = L.marker([bus.latitude, bus.longitude], { 
        icon: busIcon,
      })
        .bindPopup(popupContent)
      
      cluster.addLayer(marker)
      fleetMarkersRef.current.set(bus.id, marker)
    })
  }, [staticBuses, mapReady, isValidCoord, getBusIcon])

  // Update driver location marker (real-time GPS from Driver App)
  // Shows at Khenchela center by default if no data yet
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Use real location if available, otherwise use default Khenchela center
    const displayLocation = driverLocation || {
      lat: 35.4358,
      lng: 7.1436,
    }

    // Validate coordinates
    if (!isValidCoord(displayLocation.lat, displayLocation.lng)) {
      console.warn("[v0] Invalid driver coordinates:", displayLocation)
      return
    }

    const driverIcon = L.divIcon({
      className: "driver-marker-container",
      html: `<div class="driver-marker-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/>
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const statusText = driverLocation ? "Live Driver - 0775453629" : "Default Location (Awaiting GPS)"
    const popupContent = `
      <div class="station-popup">
        <div class="station-popup-name">سائق مباشر</div>
        <div style="font-size:11px;color:#ec4899;font-weight:600;margin-top:4px;">${statusText}</div>
        <div style="font-size:10px;color:#666;margin-top:6px;">إحداثيات: ${displayLocation.lat.toFixed(4)}, ${displayLocation.lng.toFixed(4)}</div>
      </div>
    `

    if (driverMarkerRef.current) {
      // Update existing marker position
      driverMarkerRef.current.setLatLng([displayLocation.lat, displayLocation.lng])
      driverMarkerRef.current.setPopupContent(popupContent)
    } else {
      // Create new driver marker
      driverMarkerRef.current = L.marker(
        [displayLocation.lat, displayLocation.lng],
        {
          icon: driverIcon,
          zIndexOffset: 600, // Above all other markers
        }
      )
        .addTo(map)
        .bindPopup(popupContent)

      console.log("[v0] Driver marker created at:", displayLocation, driverLocation ? "(live)" : "(default)")
    }
  }, [driverLocation, mapReady, isValidCoord])

  // Handle "locate me" button tap
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError("يرجى السماح بالوصول للموقع")
      return
    }
    setIsLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLocation({ lat, lng })
        setIsLocating(false)
        const map = mapRef.current
        if (map) map.flyTo([lat, lng], 15, { duration: 1.2 })
      },
      () => {
        setLocateError("يرجى السماح بالوصول للموقع")
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Keep the blue dot in sync with userLocation
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (!userLocation) return

    const blueDotIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#3B82F6;border:3px solid white;
        box-shadow:0 0 0 4px rgba(59,130,246,0.3);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: blueDotIcon,
        zIndexOffset: 700,
      }).addTo(map)
    }
  }, [userLocation, mapReady])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" style={{ background: isDark ? "#1a2235" : "#e8e0d8", minHeight: "200px" }} />

      {/* Tile loading indicator — shown until map fires its first "load" event */}
      {!tilesLoaded && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-card/80 px-5 py-3 shadow backdrop-blur-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <span className="text-xs font-medium text-muted-foreground">جاري التحميل...</span>
          </div>
        </div>
      )}
      
      {/* Route Controller - Top Right */}
      <RouteController
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        onRouteSelect={handleRouteSelect}
        isDark={isDark}
      />

      {/* Locate Me Button - Bottom Right */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
        {locateError && (
          <div className="rounded-xl bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white shadow backdrop-blur-sm" dir="rtl">
            {locateError}
          </div>
        )}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-70"
          style={{ background: isDark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.95)", border: "1px solid rgba(59,130,246,0.4)" }}
          aria-label="تحديد موقعي"
        >
          {isLocating ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400/40 border-t-blue-500" />
          ) : (
            <LocateFixed size={20} className={userLocation ? "text-blue-500" : isDark ? "text-slate-300" : "text-slate-600"} />
          )}
        </button>
      </div>
    </div>
  )
}
