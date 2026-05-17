"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import { db } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"
import { motion, AnimatePresence } from "framer-motion"
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff, MapPin } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useRouteSubStations } from "@/hooks/use-routes"
import { useBusSimulation, type SimulatedBus } from "@/lib/bus-simulation"

// Tile layer URLs
const TILE_LAYERS = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
}

interface Bus {
  id: string
  latitude: number
  longitude: number
  name?: string
  current_route_id?: string
  isLive?: boolean // true when receiving GPS from Driver App
  category?: "urban" | "intercity" // Bus type for coloring
}

type RouteViewMode = "all" | "single"
type SelectedRoute = string | null

// Khenchela Province center (zoomed out to show municipalities)
const KHENCHELA_PROVINCE_CENTER: [number, number] = [35.40, 7.15]
const KHENCHELA_CITY_CENTER: [number, number] = [35.4377, 7.1458]

// Route categories with colors
const ROUTE_CATEGORIES = {
  urban: { label: "داخل المدينة", labelEn: "Urban", color: "#00A651" },
  intercity: { label: "بين البلديات", labelEn: "Inter-city", color: "#3B82F6" },
  express: { label: "سريع / طلاب", labelEn: "Express", color: "#F59E0B" },
}

// All main stations in Khenchela city (urban)
const urbanStations: { position: [number, number]; name: string; nameEn: string; lines: string[]; isMain: boolean; category: "urban" }[] = [
  { position: [35.4420, 7.1380], name: "الجامعة", nameEn: "University", lines: ["01"], isMain: true, category: "urban" },
  { position: [35.4377, 7.1458], name: "وسط المدينة", nameEn: "City Center", lines: ["01", "02", "03"], isMain: true, category: "urban" },
  { position: [35.4350, 7.1350], name: "محطة خنشلة البرية", nameEn: "Khenchela Bus Station", lines: ["01", "02", "03", "K1", "K2", "K3", "K4", "K5", "K6", "K7"], isMain: true, category: "urban" },
  { position: [35.4330, 7.1520], name: "المستشفى", nameEn: "Hospital", lines: ["01", "02"], isMain: true, category: "urban" },
  { position: [35.4400, 7.1550], name: "السوق المركزي", nameEn: "Central Market", lines: ["01", "03"], isMain: true, category: "urban" },
  { position: [35.4400, 7.1480], name: "ملعب أول نوفمبر", nameEn: "Stadium", lines: ["02", "03"], isMain: false, category: "urban" },
  { position: [35.4450, 7.1320], name: "طريق عين البيضاء", nameEn: "Ain El Beyda Road", lines: ["02"], isMain: false, category: "urban" },
  { position: [35.4290, 7.1400], name: "المدينة الجديدة", nameEn: "New City", lines: ["03"], isMain: false, category: "urban" },
  { position: [35.4400, 7.1420], name: "حي 500 مسكن", nameEn: "500 Housing", lines: ["01"], isMain: false, category: "urban" },
  { position: [35.4310, 7.1430], name: "حي الأمل", nameEn: "El Amel", lines: ["03"], isMain: false, category: "urban" },
]

// Inter-city stations (municipalities)
const intercityStations: { position: [number, number]; name: string; nameEn: string; municipality: string; lines: string[]; isMain: boolean; category: "intercity" }[] = [
  { position: [35.3650, 7.0650], name: "وسط قايس", nameEn: "Kais Center", municipality: "قايس", lines: ["K1"], isMain: true, category: "intercity" },
  { position: [35.3800, 7.0800], name: "مدخل قايس", nameEn: "Kais Entrance", municipality: "قايس", lines: ["K1"], isMain: false, category: "intercity" },
  { position: [35.2640, 7.7600], name: "وسط الشريعة", nameEn: "Cheria Center", municipality: "الشريعة", lines: ["K2"], isMain: true, category: "intercity" },
  { position: [35.2700, 7.7500], name: "مدخل الشريعة", nameEn: "Cheria Entrance", municipality: "الشريعة", lines: ["K2"], isMain: false, category: "intercity" },
  { position: [35.3300, 6.9900], name: "وسط بوحمامة", nameEn: "Bouhmama Center", municipality: "بوحمامة", lines: ["K3"], isMain: true, category: "intercity" },
  { position: [35.4500, 7.1600], name: "مفترق بوحمامة", nameEn: "Bouhmama Junction", municipality: "خنشلة", lines: ["K3"], isMain: false, category: "intercity" },
  { position: [35.3850, 7.0850], name: "وسط ششار", nameEn: "Chechar Center", municipality: "ششار", lines: ["K4"], isMain: true, category: "intercity" },
  { position: [35.3900, 7.0900], name: "قرية ششار", nameEn: "Chechar Village", municipality: "ششار", lines: ["K4"], isMain: false, category: "intercity" },
  { position: [35.5000, 7.0400], name: "وسط عين الطويلة", nameEn: "Ain Touila Center", municipality: "عين الطويلة", lines: ["K5"], isMain: true, category: "intercity" },
  { position: [35.4900, 7.0500], name: "مدخل عين الطويلة", nameEn: "Ain Touila Entrance", municipality: "عين الطويلة", lines: ["K5"], isMain: false, category: "intercity" },
  { position: [35.5200, 7.2000], name: "وسط المحمل", nameEn: "El Mahmel Center", municipality: "المحمل", lines: ["K6"], isMain: true, category: "intercity" },
  { position: [35.4600, 7.1500], name: "طريق المحمل", nameEn: "El Mahmel Road", municipality: "خنشلة", lines: ["K6"], isMain: false, category: "intercity" },
  { position: [35.4100, 7.0500], name: "وسط طامزة", nameEn: "Tamza Center", municipality: "طامزة", lines: ["K7"], isMain: true, category: "intercity" },
  { position: [35.4200, 7.0700], name: "مدخل طامزة", nameEn: "Tamza Entrance", municipality: "طامزة", lines: ["K7"], isMain: false, category: "intercity" },
]

// Urban route polylines - Green category
const urbanRoutePolylines: { id: string; coords: [number, number][]; color: string; name: string; category: "urban" }[] = [
  {
    id: "01",
    name: "خط 01 - الجامعة",
    color: "#00A651",
    category: "urban",
    coords: [
      [35.4420, 7.1380], [35.4400, 7.1420], [35.4377, 7.1458],
      [35.4400, 7.1550], [35.4330, 7.1520], [35.4350, 7.1350],
    ]
  },
  {
    id: "02",
    name: "خط 02 - عين البيضاء",
    color: "#00A651",
    category: "urban",
    coords: [
      [35.4350, 7.1350], [35.4450, 7.1320], [35.4377, 7.1458],
      [35.4330, 7.1520], [35.4400, 7.1480],
    ]
  },
  {
    id: "03",
    name: "خط 03 - المدينة الجديدة",
    color: "#00A651",
    category: "urban",
    coords: [
      [35.4290, 7.1400], [35.4310, 7.1430], [35.4377, 7.1458],
      [35.4400, 7.1550], [35.4400, 7.1480], [35.4350, 7.1350],
    ]
  }
]

// Inter-city route polylines - Blue category
const intercityRoutePolylines: { id: string; coords: [number, number][]; color: string; name: string; category: "intercity" }[] = [
  {
    id: "K1",
    name: "K1 - خنشلة - قايس",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.4100, 7.1200], [35.3800, 7.0800], [35.3650, 7.0650],
    ]
  },
  {
    id: "K2",
    name: "K2 - خنشلة - الشريعة",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.3900, 7.2000], [35.2700, 7.7500], [35.2640, 7.7600],
    ]
  },
  {
    id: "K3",
    name: "K3 - خنشلة - ب����حمامة",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.4500, 7.1600], [35.3300, 6.9900],
    ]
  },
  {
    id: "K4",
    name: "K4 - خنشلة - ششار",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.4200, 7.1200], [35.3900, 7.0900], [35.3850, 7.0850],
    ]
  },
  {
    id: "K5",
    name: "K5 - خنشلة - عين الطويلة",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.4500, 7.1100], [35.4900, 7.0500], [35.5000, 7.0400],
    ]
  },
  {
    id: "K6",
    name: "K6 - خنشلة - المحمل",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.4600, 7.1500], [35.5200, 7.2000],
    ]
  },
  {
    id: "K7",
    name: "K7 - خنشلة - طامزة",
    color: "#3B82F6",
    category: "intercity",
    coords: [
      [35.4350, 7.1350], [35.4200, 7.0700], [35.4100, 7.0500],
    ]
  },
]

// All routes combined
const allRoutes = [...urbanRoutePolylines, ...intercityRoutePolylines]

// Bus Hub Locations for the 35-bus fleet (FIXED STATION-BASED ONLY)
// Buses ONLY exist at these 4 coordinates - NO line-based distribution
const BUS_HUBS = {
  trainStation: { 
    coords: [35.4123, 7.1456] as [number, number], 
    name: "محطة القطار خنشلة",
    nameEn: "Train Station (Khenchela)",
    count: 10 
  },
  newBusTerminal: { 
    coords: [35.4080, 7.1320] as [number, number], 
    name: "المحطة الجديدة",
    nameEn: "New Bus Terminal",
    count: 10 
  },
  kaisCenter: { 
    coords: [35.4110, 6.9150] as [number, number], 
    name: "مركز قايس",
    nameEn: "Kais Center",
    count: 10 
  },
  cheriaCenter: { 
    coords: [35.3450, 7.3120] as [number, number], 
    name: "مركز الشريعة",
    nameEn: "Cheria Center",
    count: 5 
  },
}

// Generate exactly 35 static fleet buses at FIXED station coordinates ONLY
// NO line-based distribution - buses ONLY exist at the 4 hub coordinates
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
  
  // Train Station (Khenchela) - 10 buses (urban)
  for (let i = 0; i < BUS_HUBS.trainStation.count; i++) {
    const pos = addParkingOffset(BUS_HUBS.trainStation.coords, i, BUS_HUBS.trainStation.count, 1)
    buses.push({
      id: `fleet-${busIndex.toString().padStart(3, "0")}`,
      latitude: pos[0],
      longitude: pos[1],
      name: `حافلة ${busIndex} - ${BUS_HUBS.trainStation.name}`,
      current_route_id: ["01", "02", "03"][i % 3],
      isLive: false,
      category: "urban",
    })
    busIndex++
  }
  
  // New Bus Terminal - 10 buses (urban)
  for (let i = 0; i < BUS_HUBS.newBusTerminal.count; i++) {
    const pos = addParkingOffset(BUS_HUBS.newBusTerminal.coords, i, BUS_HUBS.newBusTerminal.count, 2)
    buses.push({
      id: `fleet-${busIndex.toString().padStart(3, "0")}`,
      latitude: pos[0],
      longitude: pos[1],
      name: `حافلة ${busIndex} - ${BUS_HUBS.newBusTerminal.name}`,
      current_route_id: ["01", "02", "03"][i % 3],
      isLive: false,
      category: "urban",
    })
    busIndex++
  }
  
  // Kais Center - 10 buses (intercity)
  for (let i = 0; i < BUS_HUBS.kaisCenter.count; i++) {
    const pos = addParkingOffset(BUS_HUBS.kaisCenter.coords, i, BUS_HUBS.kaisCenter.count, 3)
    buses.push({
      id: `fleet-${busIndex.toString().padStart(3, "0")}`,
      latitude: pos[0],
      longitude: pos[1],
      name: `حافلة ${busIndex} - ${BUS_HUBS.kaisCenter.name}`,
      current_route_id: ["K1", "K3", "K4", "K7"][i % 4],
      isLive: false,
      category: "intercity",
    })
    busIndex++
  }
  
  // Cheria Center - 5 buses (intercity)
  for (let i = 0; i < BUS_HUBS.cheriaCenter.count; i++) {
    const pos = addParkingOffset(BUS_HUBS.cheriaCenter.coords, i, BUS_HUBS.cheriaCenter.count, 4)
    buses.push({
      id: `fleet-${busIndex.toString().padStart(3, "0")}`,
      latitude: pos[0],
      longitude: pos[1],
      name: `حافلة ${busIndex} - ${BUS_HUBS.cheriaCenter.name}`,
      current_route_id: ["K2", "K5", "K6"][i % 3],
      isLive: false,
      category: "intercity",
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
      /* Bus marker container - lower z-index than stations */
      .bus-marker-container { position: relative; z-index: 100 !important; }
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
      .bus-marker-mini.intercity { background: #3B82F6; }
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
      .bus-marker-medium.intercity { background: #3B82F6; box-shadow: 0 1px 3px rgba(59,130,246,0.4); }
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
      .bus-marker-full.intercity { 
        background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
        box-shadow: 0 2px 5px rgba(59,130,246,0.4);
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
      .bus-marker-icon.intercity { 
        background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
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
      .bus-ping.intercity { background: rgba(59, 130, 246, 0.3); }
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
      /* Station markers - higher z-index than buses */
      .station-marker { 
        transition: transform 0.2s ease, opacity 0.3s ease;
        z-index: 200 !important;
      }
      .station-marker:hover { transform: scale(1.15); z-index: 300 !important; }
      .station-marker.faded { opacity: 0.3; }
      .urban-station-marker {
        width: 24px; height: 24px;
        background: #00A651; border: 2px solid white; border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,166,81,0.4);
        display: flex; align-items: center; justify-content: center;
      }
      .urban-station-marker.main {
        width: 28px; height: 28px; border-width: 3px;
        box-shadow: 0 3px 10px rgba(0,166,81,0.5);
      }
      .urban-station-marker.minor {
        width: 18px; height: 18px;
        background: rgba(0,166,81,0.85);
      }
      .intercity-station-marker {
        width: 28px; height: 28px;
        background: #3B82F6; border: 3px solid white; border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59,130,246,0.5);
        display: flex; align-items: center; justify-content: center;
      }
      .intercity-station-marker.main {
        width: 32px; height: 32px;
        box-shadow: 0 3px 12px rgba(59,130,246,0.6);
      }
      .intercity-station-marker.minor {
        width: 20px; height: 20px; border-width: 2px;
        background: rgba(59,130,246,0.85);
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
      .station-line-badge.intercity { background: #3B82F6; }
      .station-line-badge.express { background: #F59E0B; }
      .route-polyline { transition: opacity 0.3s ease, stroke-width 0.3s ease; }
      .route-polyline-faded { opacity: 0.15 !important; }
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
    `
    document.head.appendChild(style)
  }
}

// Route Controller Component
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
  const [showLegend, setShowLegend] = useState(true)
  
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
{/* Legend - Bottom Left */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-24 left-3 z-[1000] rounded-xl p-3 shadow-lg backdrop-blur-sm"
            style={{ direction: "rtl", backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: textColor }}>دليل الألوان</span>
              <button 
                onClick={() => setShowLegend(false)}
                className="transition-colors"
                style={{ color: mutedTextColor }}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {Object.entries(ROUTE_CATEGORIES).map(([key, { label, color }]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-6 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px]" style={{ color: mutedTextColor }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show Legend Button */}
      {!showLegend && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowLegend(true)}
          className="absolute bottom-24 left-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm"
          style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
        >
          <Eye className="h-5 w-5" style={{ color: textColor }} />
        </motion.button>
      )}

      {/* Route Controller - Top Right */}
      <div className="absolute right-3 top-3 z-[1000]" style={{ direction: "rtl" }}>
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
                {viewMode === "all" ? "كل الخطوط" : `خط ${selectedRoute}`}
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
                    <Eye className="h-4 w-4" style={{ color: viewMode === "all" ? "#22C55E" : mutedTextColor }} />
                    <span className="font-medium">عرض كل الخطوط</span>
                  </button>

                  {/* Urban Routes */}
                  <div className="mb-2">
                    <div className="mb-1 px-2 text-[11px] font-semibold" style={{ color: mutedTextColor }}>
                      داخل المدينة
                    </div>
                    {urbanRoutePolylines.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => handleRouteClick(route.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                        style={{ 
                          backgroundColor: selectedRoute === route.id ? activeBg : "transparent",
                          color: selectedRoute === route.id ? "#22C55E" : textColor
                        }}
                        onMouseEnter={(e) => { if (selectedRoute !== route.id) e.currentTarget.style.backgroundColor = hoverBg }}
                        onMouseLeave={(e) => { if (selectedRoute !== route.id) e.currentTarget.style.backgroundColor = "transparent" }}
                      >
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ 
                            backgroundColor: ROUTE_CATEGORIES.urban.color,
                            boxShadow: selectedRoute === route.id ? `0 0 0 2px ${ROUTE_CATEGORIES.urban.color}40` : "none"
                          }}
                        />
                        <span className={selectedRoute === route.id ? "font-bold" : "font-medium"}>
                          خط {route.id}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Intercity Routes */}
                  <div>
                    <div className="mb-1 px-2 text-[11px] font-semibold" style={{ color: mutedTextColor }}>
                      بين البلديات
                    </div>
                    {intercityRoutePolylines.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => handleRouteClick(route.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                        style={{ 
                          backgroundColor: selectedRoute === route.id ? activeBg : "transparent",
                          color: selectedRoute === route.id ? "#3B82F6" : textColor
                        }}
                        onMouseEnter={(e) => { if (selectedRoute !== route.id) e.currentTarget.style.backgroundColor = hoverBg }}
                        onMouseLeave={(e) => { if (selectedRoute !== route.id) e.currentTarget.style.backgroundColor = "transparent" }}
                      >
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ 
                            backgroundColor: ROUTE_CATEGORIES.intercity.color,
                            boxShadow: selectedRoute === route.id ? `0 0 0 2px ${ROUTE_CATEGORIES.intercity.color}40` : "none"
                          }}
                        />
                        <span className={selectedRoute === route.id ? "font-bold" : "font-medium"}>
                          {route.name.split(" - ")[1] || route.id}
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

interface LeafletMapProps {
  trackingLineId?: string | null
}

export default function LeafletMap({ trackingLineId }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const isInitializedRef = useRef(false)
  const [buses, setBuses] = useState<Bus[]>([])
  // Separate refs for clustered vs non-clustered markers
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map()) // For simulated (moving) buses - NOT clustered
  const fleetClusterRef = useRef<L.MarkerClusterGroup | null>(null) // For static fleet buses - CLUSTERED
  const fleetMarkersRef = useRef<Map<string, L.Marker>>(new Map()) // Track fleet markers in cluster
  const routePolylinesRef = useRef<Map<string, L.Polyline>>(new Map())
  const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const subStationMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const { isDark } = useTheme()
  
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
        // Show all mode - thin lines, normal opacity
        polyline.setStyle({ weight: 3, opacity: 0.7 })
        polyline.getElement()?.classList.remove("route-polyline-faded", "route-polyline-highlighted")
      } else if (id === routeId) {
        // Selected route - thick, bright
        polyline.setStyle({ weight: 6, opacity: 1 })
        polyline.getElement()?.classList.remove("route-polyline-faded")
        polyline.getElement()?.classList.add("route-polyline-highlighted")
        polyline.bringToFront()
      } else {
        // Other routes - faded
        polyline.setStyle({ weight: 2, opacity: 0.15 })
        polyline.getElement()?.classList.add("route-polyline-faded")
        polyline.getElement()?.classList.remove("route-polyline-highlighted")
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
        const allStations = [...urbanStations, ...intercityStations]
        const station = allStations.find(s => s.name === name)
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
        const bounds = L.latLngBounds(route.coords)
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

  // Switch tile layer based on theme
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    
    const newUrl = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light
    tileLayerRef.current.setUrl(newUrl)
  }, [isDark])

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
            category: doc.data().category || "urban",
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



  // Initialize map
  useEffect(() => {
    const container = containerRef.current
    if (!container || isInitializedRef.current) return

    const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number }
    if (leafletContainer._leaflet_id) return

    isInitializedRef.current = true

    const map = L.map(container, {
      center: KHENCHELA_CITY_CENTER,
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
      minZoom: 9,
      maxZoom: 18,
    })

    mapRef.current = map

    // Add initial tile layer (will be updated based on theme)
    tileLayerRef.current = L.tileLayer(TILE_LAYERS.light, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

L.control.zoom({ position: "bottomright" }).addTo(map)
    
    // Track zoom level for bus icon scaling
    map.on("zoomend", () => {
      setCurrentZoom(map.getZoom())
    })
    
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
  
  // Add urban route polylines (Green)
    urbanRoutePolylines.forEach((route) => {
      const polyline = L.polyline(route.coords, {
        color: ROUTE_CATEGORIES.urban.color,
        weight: 3,
        opacity: 0.7,
        dashArray: "8, 6",
        className: "route-polyline",
      }).addTo(map)
      
      polyline.bindPopup(`
        <div class="station-popup">
          <div class="station-popup-name">${route.name}</div>
          <div style="font-size:11px;color:#666;">خط حضري</div>
        </div>
      `)
      
      routePolylinesRef.current.set(route.id, polyline)
    })

    // Add intercity route polylines (Blue)
    intercityRoutePolylines.forEach((route) => {
      const polyline = L.polyline(route.coords, {
        color: ROUTE_CATEGORIES.intercity.color,
        weight: 3,
        opacity: 0.7,
        className: "route-polyline",
      }).addTo(map)
      
      polyline.bindPopup(`
        <div class="station-popup">
          <div class="station-popup-name">${route.name}</div>
          <div style="font-size:11px;color:#666;">خط بين البلديات</div>
        </div>
      `)
      
      routePolylinesRef.current.set(route.id, polyline)
    })

    // Function to create line badges HTML
    const createLineBadges = (lines: string[]) => {
      return lines.map(line => {
        const isIntercity = line.startsWith("K")
        const category = isIntercity ? "intercity" : "urban"
        return `<span class="station-line-badge ${category}" data-line="${line}">خط ${line}</span>`
      }).join("")
    }

    // Add urban station markers
    urbanStations.forEach((station) => {
      const markerClass = station.isMain ? "urban-station-marker main" : "urban-station-marker minor"
      
      const stationIcon = L.divIcon({
        className: "station-marker",
        html: `<div class="${markerClass}">
          ${station.isMain ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
          </svg>` : ""}
        </div>`,
        iconSize: station.isMain ? [28, 28] : [18, 18],
        iconAnchor: station.isMain ? [14, 14] : [9, 9],
      })

const marker = L.marker(station.position, { 
      icon: stationIcon,
      zIndexOffset: 200 // Ensure stations appear above buses
    })
      .addTo(map)
      .bindPopup(`
        <div class="station-popup">
          <div class="station-popup-name">${station.name}</div>
          <div style="font-size:11px;color:#666;margin-bottom:4px;">${station.nameEn}</div>
          <div class="station-popup-lines">
            <div class="station-popup-lines-title">الخطوط المارة</div>
            ${createLineBadges(station.lines)}
          </div>
        </div>
      `)
    
    stationMarkersRef.current.set(station.name, marker)
  })
  
  // Add intercity station markers
    intercityStations.forEach((station) => {
      const markerClass = station.isMain ? "intercity-station-marker" : "intercity-station-marker minor"
      
      const stationIcon = L.divIcon({
        className: "station-marker",
        html: `<div class="${markerClass}">
          ${station.isMain ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>` : ""}
        </div>`,
        iconSize: station.isMain ? [28, 28] : [20, 20],
        iconAnchor: station.isMain ? [14, 14] : [10, 10],
      })

const marker = L.marker(station.position, { 
      icon: stationIcon,
      zIndexOffset: 200 // Ensure stations appear above buses
    })
      .addTo(map)
      .bindPopup(`
        <div class="station-popup">
          <div class="station-popup-name">${station.name}</div>
          <div class="station-popup-municipality">${station.municipality}</div>
          <div style="font-size:11px;color:#666;margin-bottom:4px;">${station.nameEn}</div>
          <div class="station-popup-lines">
            <div class="station-popup-lines-title">الخطوط المارة</div>
            ${createLineBadges(station.lines)}
            </div>
          </div>
        `)

      stationMarkersRef.current.set(station.name, marker)
    })

    // Current location marker
    const currentLocationIcon = L.divIcon({
      className: "current-location-icon",
      html: `<div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;width:20px;height:20px;background:#FF6B00;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(255,107,0,0.5);z-index:2;"></div>
        <div style="position:absolute;width:40px;height:40px;background:rgba(255,107,0,0.2);border-radius:50%;top:-10px;left:-10px;animation:leaflet-pulse 2s infinite;"></div>
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

L.marker(KHENCHELA_CITY_CENTER, { icon: currentLocationIcon })
    .addTo(map)
    .bindPopup('<div class="station-popup"><div class="station-popup-name">موقعك الحالي</div></div>')
    
    // Mark map as ready for bus markers
    setMapReady(true)
  
    return () => {
      setMapReady(false)
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
    const category = bus.category || "urban"
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
      ? (route.category === "urban" ? ROUTE_CATEGORIES.urban.color : ROUTE_CATEGORIES.intercity.color)
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
  useEffect(() => {
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
      const categoryLabel = bus.category === "intercity" ? "خارجي" : "داخلي"
      
      // Status for simulated buses
      const statusLabel = bus.status === "at_station" 
        ? `في المحطة: ${bus.nearestStation}` 
        : "في الطريق"
      const statusColor = bus.status === "at_station" ? "#22C55E" : "#3B82F6"
      
      const popupContent = `
        <div class="station-popup">
          <div class="station-popup-name">${bus.name}</div>
          <div style="font-size:11px;margin-top:4px;">
            <span style="color:${bus.category === "intercity" ? "#3B82F6" : "#00A651"};font-weight:600;">${categoryLabel}</span>
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
  useEffect(() => {
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
      
      const categoryLabel = bus.category === "intercity" ? "خارجي" : "داخلي"
      const statusLabel = bus.isLive ? "نشط" : "في الانتظار"
      const statusColor = bus.isLive ? "#22C55E" : "#94A3B8"
      const route = allRoutes.find(r => r.id === bus.current_route_id)
      const routeName = route ? route.name : `خط ${bus.current_route_id || "غير محدد"}`
      
      const popupContent = `
        <div class="station-popup">
          <div class="station-popup-name">${bus.name || `حافلة ${bus.id}`}</div>
          <div style="font-size:11px;margin-top:4px;">
            <span style="color:${bus.category === "intercity" ? "#3B82F6" : "#00A651"};font-weight:600;">${categoryLabel}</span>
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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
<RouteController
  viewMode={viewMode}
  setViewMode={setViewMode}
  selectedRoute={selectedRoute}
  setSelectedRoute={setSelectedRoute}
  onRouteSelect={handleRouteSelect}
  isDark={isDark}
  />
    </div>
  )
}
