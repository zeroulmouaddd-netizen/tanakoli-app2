"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { db, rtdb } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import {
  ref,
  update,
  onValue,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database"
import {
  toLocalPhone,
  toE164,
  resolveDriverFirebaseRecords,
} from "@/lib/driver-config"

export interface DriverLocation {
  lat: number
  lng: number
  latitude: number
  longitude: number
  updatedAt: number
  timestamp: number
}

export interface DriverPresenceBroadcast {
  phone: string
  phoneE164: string
  isOnline: boolean
  status: "active" | "idle"
  lastSeen: number
  updatedAt: number
  latitude?: number
  longitude?: number
  activeRoute?: string | null
}

const LAST_LOCATION_STORAGE_KEY = "tanakoli_driver_last_location"
export const PRESENCE_BROADCAST_KEY = "tanakoli_driver_presence_sync"
export const PRESENCE_CHANNEL_NAME = "tanakoli_driver_presence_channel"

// Default coordinates for Khenchela transit hub when hardware GPS is blocked/unavailable
const DEFAULT_KHENCHELA_COORDS = {
  latitude: 35.4377,
  longitude: 7.1458,
}

const HEARTBEAT_INTERVAL_MS = 25_000

// Cache resolved Firestore doc IDs per normalized local phone
const resolvedDocsCache = new Map<
  string,
  { driverDocIds: string[]; userDocIds: string[] }
>()

async function getTargetDocIds(phone: string): Promise<{
  local: string
  e164: string
  driverDocIds: string[]
  userDocIds: string[]
}> {
  const local = toLocalPhone(phone)
  const e164 = toE164(phone)
  if (!local) {
    return { local: "", e164: "", driverDocIds: [], userDocIds: [] }
  }

  const cached = resolvedDocsCache.get(local)
  if (cached) {
    return { local, e164, ...cached }
  }

  // Seed default IDs immediately so initial writes don't have to wait
  const initial = { driverDocIds: [local], userDocIds: [local] }
  resolvedDocsCache.set(local, initial)

  void resolveDriverFirebaseRecords(phone)
    .then((resolved) => {
      if (resolved.driverDocIds.length > 0 || resolved.userDocIds.length > 0) {
        resolvedDocsCache.set(local, {
          driverDocIds:
            resolved.driverDocIds.length > 0 ? resolved.driverDocIds : [local],
          userDocIds:
            resolved.userDocIds.length > 0 ? resolved.userDocIds : [local],
        })
      }
    })
    .catch(() => {})

  return { local, e164, ...initial }
}

function broadcastPresenceEvent(payload: DriverPresenceBroadcast): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PRESENCE_BROADCAST_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage errors
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(PRESENCE_CHANNEL_NAME)
      ch.postMessage(payload)
      ch.close()
    }
  } catch {
    // Ignore BroadcastChannel errors
  }
}

function loadCachedLocation(localPhone: string): { latitude: number; longitude: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${LAST_LOCATION_STORAGE_KEY}_${localPhone}`) ||
      localStorage.getItem(LAST_LOCATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const lat = Number(parsed?.latitude ?? parsed?.lat)
    const lng = Number(parsed?.longitude ?? parsed?.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng }
    }
  } catch {
    // Ignore
  }
  return null
}

function saveCachedLocation(localPhone: string, latitude: number, longitude: number): void {
  if (typeof window === "undefined") return
  try {
    const payload = JSON.stringify({
      latitude,
      longitude,
      lat: latitude,
      lng: longitude,
      updatedAt: Date.now(),
    })
    localStorage.setItem(LAST_LOCATION_STORAGE_KEY, payload)
    if (localPhone) {
      localStorage.setItem(`${LAST_LOCATION_STORAGE_KEY}_${localPhone}`, payload)
    }
  } catch {
    // Ignore
  }
}

/**
 * Set driver presence to online (`isOnline: true`, `status: 'active'`, `lastSeen: serverTimestamp()`)
 * in both Firestore (`drivers` & `users`) and Realtime Database (`drivers/{phone}`).
 */
export async function syncDriverOnlinePresence(
  driverPhone: string,
  extra?: { activeRoute?: string | null }
): Promise<void> {
  const { local, e164, driverDocIds, userDocIds } = await getTargetDocIds(driverPhone)
  if (!local) return

  const clientNow = Date.now()
  const fsTimestamp = serverTimestamp()

  const firestorePayload: Record<string, any> = {
    phone: local,
    Phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    role: "driver",
    isDriver: true,
    isAuthorized: true,
    isAuthorizedDriver: true,
    isOnline: true,
    online: true,
    status: "active",
    lastSeen: fsTimestamp,
    updatedAt: fsTimestamp,
    lastSeenClientAt: clientNow,
  }

  if (extra && "activeRoute" in extra) {
    firestorePayload.activeRoute = extra.activeRoute ?? null
    if (extra.activeRoute) {
      firestorePayload.line = extra.activeRoute
    }
  }

  const rtdbPayload: Record<string, any> = {
    phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    isOnline: true,
    online: true,
    status: "active",
    lastSeen: rtdbServerTimestamp(),
    updatedAt: rtdbServerTimestamp(),
    lastSeenClientAt: clientNow,
  }

  if (extra && "activeRoute" in extra) {
    rtdbPayload.activeRoute = extra.activeRoute ?? null
    if (extra.activeRoute) {
      rtdbPayload.line = extra.activeRoute
    }
  }

  broadcastPresenceEvent({
    phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    isOnline: true,
    status: "active",
    lastSeen: clientNow,
    updatedAt: clientNow,
    ...(extra && "activeRoute" in extra ? { activeRoute: extra.activeRoute } : {}),
  })

  const tasks: Promise<unknown>[] = []

  if (db) {
    for (const id of driverDocIds) {
      tasks.push(setDoc(doc(db, "drivers", id), firestorePayload, { merge: true }))
    }
    for (const id of userDocIds) {
      tasks.push(setDoc(doc(db, "users", id), firestorePayload, { merge: true }))
    }
  }

  if (rtdb) {
    try {
      const driverRef = ref(rtdb, `drivers/${local}`)
      tasks.push(update(driverRef, rtdbPayload))
    } catch {
      // Ignore RTDB errors
    }
  }

  await Promise.allSettled(tasks)
}

/**
 * Publish driver GPS coordinates (`latitude`, `longitude`, `updatedAt`) + active presence
 * to both Firestore (`drivers` & `users`) and Realtime Database (`drivers/{phone}`).
 */
export async function syncDriverLocationToFirebase(
  driverPhone: string,
  latitude: number,
  longitude: number,
  extra?: { activeRoute?: string | null }
): Promise<void> {
  const { local, e164, driverDocIds, userDocIds } = await getTargetDocIds(driverPhone)
  if (!local || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return

  saveCachedLocation(local, latitude, longitude)

  const clientNow = Date.now()
  const fsTimestamp = serverTimestamp()

  const locationObj = {
    lat: latitude,
    lng: longitude,
    latitude,
    longitude,
    updatedAt: clientNow,
    timestamp: clientNow,
  }

  const firestorePayload: Record<string, any> = {
    phone: local,
    Phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    role: "driver",
    isDriver: true,
    isAuthorized: true,
    isAuthorizedDriver: true,
    isOnline: true,
    online: true,
    status: "active",
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    location: locationObj,
    updatedAt: fsTimestamp,
    lastSeen: fsTimestamp,
    lastSeenClientAt: clientNow,
  }

  if (extra && "activeRoute" in extra && extra.activeRoute !== undefined) {
    firestorePayload.activeRoute = extra.activeRoute
    if (extra.activeRoute) {
      firestorePayload.line = extra.activeRoute
    }
  }

  const rtdbPayload: Record<string, any> = {
    phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    isOnline: true,
    online: true,
    status: "active",
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    location: locationObj,
    updatedAt: rtdbServerTimestamp(),
    lastSeen: rtdbServerTimestamp(),
    lastSeenClientAt: clientNow,
  }

  if (extra && "activeRoute" in extra && extra.activeRoute !== undefined) {
    rtdbPayload.activeRoute = extra.activeRoute
    if (extra.activeRoute) {
      rtdbPayload.line = extra.activeRoute
    }
  }

  broadcastPresenceEvent({
    phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    isOnline: true,
    status: "active",
    lastSeen: clientNow,
    updatedAt: clientNow,
    latitude,
    longitude,
    ...(extra && "activeRoute" in extra ? { activeRoute: extra.activeRoute } : {}),
  })

  const tasks: Promise<unknown>[] = []

  if (db) {
    for (const id of driverDocIds) {
      tasks.push(setDoc(doc(db, "drivers", id), firestorePayload, { merge: true }))
    }
    for (const id of userDocIds) {
      tasks.push(setDoc(doc(db, "users", id), firestorePayload, { merge: true }))
    }
  }

  if (rtdb) {
    try {
      const driverRef = ref(rtdb, `drivers/${local}`)
      tasks.push(update(driverRef, rtdbPayload))
    } catch {
      // Ignore RTDB errors
    }
  }

  await Promise.allSettled(tasks)
}

/**
 * Set driver presence to offline (`isOnline: false`, `status: 'idle'`) on disconnect,
 * page unload, or explicit sign-out.
 */
export async function syncDriverOfflinePresence(driverPhone: string | null | undefined): Promise<void> {
  if (!driverPhone) return
  const { local, e164, driverDocIds, userDocIds } = await getTargetDocIds(driverPhone)
  if (!local) return

  const clientNow = Date.now()
  const fsTimestamp = serverTimestamp()

  const firestorePayload: Record<string, any> = {
    isOnline: false,
    online: false,
    status: "idle",
    lastSeen: fsTimestamp,
    updatedAt: fsTimestamp,
    lastSeenClientAt: clientNow,
  }

  const rtdbPayload: Record<string, any> = {
    isOnline: false,
    online: false,
    status: "idle",
    lastSeen: rtdbServerTimestamp(),
    updatedAt: rtdbServerTimestamp(),
    lastSeenClientAt: clientNow,
  }

  broadcastPresenceEvent({
    phone: local,
    phoneE164: e164 || `+213${local.slice(1)}`,
    isOnline: false,
    status: "idle",
    lastSeen: clientNow,
    updatedAt: clientNow,
  })

  const tasks: Promise<unknown>[] = []

  if (db) {
    for (const id of driverDocIds) {
      tasks.push(setDoc(doc(db, "drivers", id), firestorePayload, { merge: true }))
    }
    for (const id of userDocIds) {
      tasks.push(setDoc(doc(db, "users", id), firestorePayload, { merge: true }))
    }
  }

  if (rtdb) {
    try {
      const driverRef = ref(rtdb, `drivers/${local}`)
      tasks.push(update(driverRef, rtdbPayload))
    } catch {
      // Ignore RTDB errors
    }
  }

  await Promise.allSettled(tasks)
}

export interface UseDriverLocationTrackingOptions {
  activeRoute?: string | null
}

export function useDriverLocationTracking(
  driverPhone: string | null,
  isDriverActive: boolean,
  options?: UseDriverLocationTrackingOptions
) {
  const watchIdRef = useRef<number | null>(null)
  const isTrackingRef = useRef(false)
  const lastLocationRef = useRef<DriverLocation | null>(null)
  const lastPublishedAtRef = useRef<number>(0)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fallbackLocationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRouteRef = useRef<string | null | undefined>(options?.activeRoute)

  const [isTracking, setIsTracking] = useState(false)
  const [lastLocation, setLastLocation] = useState<DriverLocation | null>(null)

  activeRouteRef.current = options?.activeRoute

  const getDriverPath = useCallback((phone: string) => {
    return toLocalPhone(phone)
  }, [])

  // Publish a coordinate pair immediately to Firestore & RTDB
  const publishPosition = useCallback(
    async (latitude: number, longitude: number, force = false) => {
      if (!driverPhone) return
      const now = Date.now()
      const prev = lastLocationRef.current

      const movedEnough =
        !prev ||
        Math.abs(prev.lat - latitude) > 0.00001 ||
        Math.abs(prev.lng - longitude) > 0.00001
      const staleTime = now - lastPublishedAtRef.current >= HEARTBEAT_INTERVAL_MS

      if (!force && !movedEnough && !staleTime) return

      const nextLoc: DriverLocation = {
        lat: latitude,
        lng: longitude,
        latitude,
        longitude,
        updatedAt: now,
        timestamp: now,
      }
      lastLocationRef.current = nextLoc
      lastPublishedAtRef.current = now
      setLastLocation(nextLoc)

      try {
        await syncDriverLocationToFirebase(driverPhone, latitude, longitude, {
          activeRoute: activeRouteRef.current,
        })
      } catch (error) {
        console.error("[driver-presence] Failed to sync location:", error)
      }
    },
    [driverPhone]
  )

  // Request an immediate GPS fix and write (latitude, longitude, updatedAt) to Firebase
  const triggerImmediateLocationUpdate = useCallback(() => {
    if (!driverPhone || typeof window === "undefined") return
    const local = getDriverPath(driverPhone)

    // 1. Immediately mark driver online & active with fresh lastSeen
    void syncDriverOnlinePresence(driverPhone, {
      activeRoute: activeRouteRef.current,
    })

    // 2. If we already have a cached location, publish it right away so
    //    updatedAt/coordinates are immediately live while hardware GPS resolves
    const cached = lastLocationRef.current ?? loadCachedLocation(local)
    if (cached) {
      void publishPosition(cached.latitude, cached.longitude, true)
    }

    // 3. Fallback timer: if geolocation permission is pending/denied or unavailable
    //    after 1.5s, ensure initial coordinates are written so the driver never stays
    //    stuck on "No live location"
    if (fallbackLocationTimerRef.current) {
      clearTimeout(fallbackLocationTimerRef.current)
    }
    fallbackLocationTimerRef.current = setTimeout(() => {
      if (!lastLocationRef.current && driverPhone) {
        const fallback = loadCachedLocation(local) ?? DEFAULT_KHENCHELA_COORDS
        void publishPosition(fallback.latitude, fallback.longitude, true)
      }
    }, 1500)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const fallback = cached ?? DEFAULT_KHENCHELA_COORDS
      void publishPosition(fallback.latitude, fallback.longitude, true)
      return
    }

    // 4. Request immediate high-accuracy position, falling back to coarse accuracy on error
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (fallbackLocationTimerRef.current) {
          clearTimeout(fallbackLocationTimerRef.current)
          fallbackLocationTimerRef.current = null
        }
        void publishPosition(
          position.coords.latitude,
          position.coords.longitude,
          true
        )
      },
      () => {
        // Retry with low accuracy (works on desktop / indoor Wi-Fi)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (fallbackLocationTimerRef.current) {
              clearTimeout(fallbackLocationTimerRef.current)
              fallbackLocationTimerRef.current = null
            }
            void publishPosition(
              position.coords.latitude,
              position.coords.longitude,
              true
            )
          },
          () => {
            const fallback =
              lastLocationRef.current ??
              loadCachedLocation(local) ??
              DEFAULT_KHENCHELA_COORDS
            void publishPosition(fallback.latitude, fallback.longitude, true)
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 10000,
      }
    )
  }, [driverPhone, getDriverPath, publishPosition])

  // Continuous geolocation watcher
  const startWatching = useCallback(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      watchIdRef.current !== null
    ) {
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (fallbackLocationTimerRef.current) {
          clearTimeout(fallbackLocationTimerRef.current)
          fallbackLocationTimerRef.current = null
        }
        const isFirst = lastLocationRef.current === null
        void publishPosition(
          position.coords.latitude,
          position.coords.longitude,
          isFirst
        )
      },
      () => {
        // Keep last known position; heartbeat continues updating presence
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    )
  }, [publishPosition])

  // Start location tracking + presence
  const startTracking = useCallback(async () => {
    if (!driverPhone || !isDriverActive) return
    isTrackingRef.current = true
    setIsTracking(true)

    triggerImmediateLocationUpdate()
    startWatching()
  }, [driverPhone, isDriverActive, triggerImmediateLocationUpdate, startWatching])

  // Stop location tracking (clears watcher, optionally sets offline when driver logs out/disconnects)
  const stopTracking = useCallback(
    async (markOffline = false) => {
      isTrackingRef.current = false
      setIsTracking(false)

      if (fallbackLocationTimerRef.current) {
        clearTimeout(fallbackLocationTimerRef.current)
        fallbackLocationTimerRef.current = null
      }

      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }

      if (markOffline && driverPhone) {
        await syncDriverOfflinePresence(driverPhone)
      }
    },
    [driverPhone]
  )

  // Main presence, heartbeat, onDisconnect, and unload lifecycle
  useEffect(() => {
    if (typeof window === "undefined") return
    // Never run mobile driver presence/disconnect hooks from /admin pages
    if (window.location.pathname.startsWith("/admin")) return

    if (!isDriverActive || !driverPhone) {
      void stopTracking(false)
      return
    }

    const local = getDriverPath(driverPhone)
    if (!local) return

    // 1. Start tracking & immediate presence + GPS sync
    void startTracking()

    // 2. Register Firebase RTDB onDisconnect handler + .info/connected listener
    let connectedUnsub = () => {}
    if (rtdb) {
      const driverRtdbRef = ref(rtdb, `drivers/${local}`)
      const registerDisconnect = () => {
        try {
          onDisconnect(driverRtdbRef)
            .update({
              isOnline: false,
              online: false,
              status: "idle",
              lastSeen: rtdbServerTimestamp(),
              updatedAt: rtdbServerTimestamp(),
              lastSeenClientAt: Date.now(),
            })
            .catch(() => {})
        } catch {
          // Ignore onDisconnect errors
        }
      }

      registerDisconnect()

      try {
        const connectedRef = ref(rtdb, ".info/connected")
        connectedUnsub = onValue(
          connectedRef,
          (snap) => {
            if (snap.val() === true) {
              registerDisconnect()
              void syncDriverOnlinePresence(driverPhone, {
                activeRoute: activeRouteRef.current,
              })
            }
          },
          () => {}
        )
      } catch {
        // Ignore
      }
    }

    // 3. Periodic heartbeat every 25s
    heartbeatIntervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        void publishPosition(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          true
        )
      } else {
        void syncDriverOnlinePresence(driverPhone, {
          activeRoute: activeRouteRef.current,
        })
      }
    }, HEARTBEAT_INTERVAL_MS)

    // 4. Refresh presence & location when app tab becomes visible or regains network/focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        triggerImmediateLocationUpdate()
      }
    }
    const handleOnline = () => {
      triggerImmediateLocationUpdate()
    }

    // 5. Handle page unload / disconnect to set isOnline: false
    const handlePageUnload = () => {
      void syncDriverOfflinePresence(driverPhone)
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)
    window.addEventListener("online", handleOnline)
    window.addEventListener("beforeunload", handlePageUnload)
    window.addEventListener("pagehide", handlePageUnload)

    return () => {
      connectedUnsub()
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      if (fallbackLocationTimerRef.current) {
        clearTimeout(fallbackLocationTimerRef.current)
        fallbackLocationTimerRef.current = null
      }
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("beforeunload", handlePageUnload)
      window.removeEventListener("pagehide", handlePageUnload)
    }
  }, [
    isDriverActive,
    driverPhone,
    getDriverPath,
    startTracking,
    stopTracking,
    publishPosition,
    triggerImmediateLocationUpdate,
  ])

  // Sync activeRoute changes immediately
  useEffect(() => {
    if (!isDriverActive || !driverPhone) return
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) return
    void syncDriverOnlinePresence(driverPhone, {
      activeRoute: options?.activeRoute,
    })
  }, [options?.activeRoute, isDriverActive, driverPhone])

  return {
    startTracking,
    stopTracking,
    triggerImmediateLocationUpdate,
    isTracking,
    lastLocation,
  }
}
