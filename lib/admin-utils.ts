import { db, rtdb } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  getDocs,
  where,
  runTransaction,
} from "firebase/firestore"
import { registerAuthorizedDriverPhone } from "@/lib/driver-config"
import {
  PRESENCE_BROADCAST_KEY,
  PRESENCE_CHANNEL_NAME,
  type DriverPresenceBroadcast,
} from "@/hooks/use-driver-location-tracking"
import { ref, onValue } from "firebase/database"

export interface DriverLocation {
  lat: number
  lng: number
  timestamp?: number
}

export interface ActiveDriver {
  phone: string
  line: string
  location: DriverLocation | null
}

export interface Transaction {
  id: string
  timestamp: any
  userId: string
  userName?: string
  type: string
  amount: number
  status: string
  driverPhone?: string
  previousBalance?: number
  newBalance?: number
}

export interface DriverRecord {
  id: string
  phone: string
  name: string
  balance: number
  isLive: boolean
  lat: number | null
  lng: number | null
  lastSeen: number | null
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Normalise any phone format to local "0XXXXXXXXX" (preserves non-phone IDs). */
function localPhone(raw: string): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d+]/g, "")
  const digitCount = digits.replace(/\+/g, "").length
  if (digitCount < 8) return trimmed
  if (digits.startsWith("+213")) return "0" + digits.slice(4)
  if (digits.startsWith("00213")) return "0" + digits.slice(5)
  if (digits.startsWith("213") && digits.length === 12) return "0" + digits.slice(3)
  if (/^[567]\d{8}$/.test(digits)) return "0" + digits
  return digits
}

/** Extract the phone field regardless of casing */
function extractPhone(data: Record<string, any>): string {
  return (
    data.Phone ||
    data.phone ||
    data.phoneNumber ||
    data.PhoneNumber ||
    data.mobile ||
    data.phoneE164 ||
    ""
  )
}

/** Extract balance regardless of field name */
function extractBalance(data: Record<string, any>): number {
  return (
    data.balance ??
    data.walletBalance ??
    data.wallet ??
    data.Balance ??
    0
  )
}

/** Return true if the Firestore doc looks like a driver */
function isDriverDoc(data: Record<string, any>): boolean {
  if (data.isDriver === true)           return true
  if (data.isAuthorized === true)       return true
  if (data.isAuthorizedDriver === true) return true
  if (data.authorized === true)         return true
  if (data.role === "driver")           return true
  if (data.userType === "driver")       return true
  if (data.type === "driver")           return true
  if (data.accountType === "driver")    return true
  return false
}

/** Return true when a `drivers`/`users` record carries authorized-driver privileges. */
function isAuthorizedDriverRecord(data: Record<string, any> | undefined | null): boolean {
  if (!data) return false
  return isDriverDoc(data)
}

/** Normalise any phone format to E.164 "+213XXXXXXXXX" */
export function normalizeE164Phone(raw: string): string {
  const local = localPhone(raw)
  if (!local || !/^0\d{9}$/.test(local)) return ""
  return "+213" + local.slice(1)
}

/** Public wrapper around {@link localPhone}. */
export function normalizeLocalPhone(raw: string): string {
  return localPhone(raw)
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Normalise any timestamp representation (Firestore Timestamp, ISO string,
 * epoch ms / s) to epoch milliseconds. Returns null when unparseable.
 */
function toMillis(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) {
    // Values below 1e11 are epoch seconds (epoch ms in 2001+ exceeds 1e12).
    return value > 1e11 ? value : value * 1000
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  const v = value as any
  if (typeof v?.toMillis === "function") {
    try { return v.toMillis() } catch { /* fall through */ }
  }
  if (typeof v?.toDate === "function") {
    try {
      const d = v.toDate()
      return d instanceof Date ? d.getTime() : null
    } catch { /* fall through */ }
  }
  if (typeof v?.seconds === "number") {
    return v.seconds * 1000 + Math.round((v.nanoseconds ?? 0) / 1e6)
  }
  return null
}

// ─── Fetch all registered drivers (real-time via onSnapshot + RTDB) ──────────

/**
 * Returns a live-updating list of all drivers from Firestore (`drivers` + `users`)
 * and Realtime Database (`drivers/*`) using real-time `onSnapshot` listeners.
 * Calls `callback` immediately on every change.
 */
export function fetchAllDrivers(
  callback: (drivers: DriverRecord[]) => void
): () => void {
  const usersMap = new Map<string, { id: string; phone: string; name: string; balance: number }>()
  const driversMetaMap = new Map<string, { id: string; phone: string; name: string; balance?: number }>()
  let activeSnapshot: DriversPanelSnapshot = { rows: [], mode: "empty", activeCount: 0 }

  function emit() {
    const activeByKey = new Map<string, DriverPanelRow>()
    for (const row of activeSnapshot.rows) {
      activeByKey.set(row.key, row)
    }

    const allKeys = new Set<string>([
      ...usersMap.keys(),
      ...driversMetaMap.keys(),
      ...activeByKey.keys(),
    ])

    const records: DriverRecord[] = []
    for (const key of allKeys) {
      const u = usersMap.get(key)
      const d = driversMetaMap.get(key)
      const panelRow = activeByKey.get(key)
      const phone = u?.phone || d?.phone || panelRow?.phone || key
      if (!phone) continue

      records.push({
        id: u?.id || d?.id || key,
        phone,
        name: d?.name || u?.name || panelRow?.name || phone,
        balance: u?.balance ?? d?.balance ?? 0,
        isLive: panelRow?.isActive ?? false,
        lat: panelRow?.location?.lat ?? null,
        lng: panelRow?.location?.lng ?? null,
        lastSeen: panelRow?.lastSeen ?? null,
      })
    }

    records.sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1
      return (a.name || a.phone).localeCompare(b.name || b.phone)
    })

    callback(records)
  }

  let unsubUsers = () => {}
  let unsubDrivers = () => {}
  const unsubActive = subscribeActiveDrivers((snap) => {
    activeSnapshot = snap
    emit()
  })

  if (db) {
    try {
      unsubUsers = onSnapshot(
        collection(db, "users"),
        (snap) => {
          usersMap.clear()
          snap.forEach((docSnap) => {
            const data = docSnap.data({ serverTimestamps: "estimate" }) as Record<string, any>
            if (!isDriverDoc(data)) return
            const phone = localPhone(extractPhone(data) || docSnap.id)
            if (!phone) return
            usersMap.set(phone, {
              id: docSnap.id,
              phone,
              name: data.fullName || data.name || data.displayName || phone,
              balance: extractBalance(data),
            })
          })
          emit()
        },
        () => { emit() }
      )
    } catch {
      // Ignore
    }

    try {
      unsubDrivers = onSnapshot(
        collection(db, "drivers"),
        (snap) => {
          driversMetaMap.clear()
          snap.forEach((docSnap) => {
            const data = docSnap.data({ serverTimestamps: "estimate" }) as Record<string, any>
            const phone = localPhone(extractPhone(data) || docSnap.id)
            if (!phone) return
            driversMetaMap.set(phone, {
              id: docSnap.id,
              phone,
              name: data.fullName || data.name || data.displayName || phone,
              balance: data.balance !== undefined ? extractBalance(data) : undefined,
            })
          })
          emit()
        },
        () => { emit() }
      )
    } catch {
      // Ignore
    }
  }

  return () => {
    unsubUsers()
    unsubDrivers()
    unsubActive()
  }
}

// ─── Send money ──────────────────────────────────────────────────────────────

/**
 * Transfer `amount` DZD from admin to driver's wallet.
 * Finds the Firestore user doc by phone (tries all known phone field names),
 * atomically increments the balance, and logs a transaction record.
 */
export async function sendMoneyToDriver(
  driverPhone: string,
  amount: number,
  note: string = "Admin transfer"
): Promise<{ success: boolean; newBalance?: number; driverName?: string; error?: string }> {
  try {
    const local = localPhone(driverPhone)
    const international = driverPhone.startsWith("+213")
      ? driverPhone
      : "+213" + local.slice(1)

    // Try direct doc lookup first (`users/{local}`)
    let driverDocId: string | null = null
    let currentBalance = 0
    let driverName = ""

    try {
      const directSnap = await getDoc(doc(db, "users", local))
      if (directSnap.exists()) {
        driverDocId = directSnap.id
        currentBalance = extractBalance(directSnap.data())
        driverName =
          directSnap.data().fullName ||
          directSnap.data().name ||
          directSnap.data().displayName ||
          local
      }
    } catch {
      // Fall through to query search
    }

    // Try every phone field / format variant
    const phoneVariants = [local, international, driverPhone]
    const phoneFields = ["Phone", "phone", "phoneNumber", "PhoneNumber", "mobile"]

    if (!driverDocId) {
      for (const field of phoneFields) {
        for (const variant of phoneVariants) {
          if (!variant) continue
          try {
            const qs = await getDocs(
              query(collection(db, "users"), where(field, "==", variant))
            )
            if (!qs.empty) {
              const d = qs.docs[0]
              driverDocId = d.id
              currentBalance = extractBalance(d.data())
              driverName = d.data().fullName || d.data().name || d.data().displayName || local
              break
            }
          } catch {
            // Index may not exist for this field — skip
          }
        }
        if (driverDocId) break
      }
    }

    if (!driverDocId) {
      return { success: false, error: `Driver not found for phone ${driverPhone}` }
    }

    const driverRef = doc(db, "users", driverDocId)
    const newBalance = currentBalance + amount

    // Atomic update
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(driverRef)
      if (!snap.exists()) throw new Error("Driver document disappeared")
      const bal = extractBalance(snap.data())
      tx.update(driverRef, {
        balance: increment(amount),
        walletBalance: increment(amount),
      })
      return bal + amount
    }).catch(async () => {
      await updateDoc(driverRef, { balance: increment(amount) })
    })

    // Log transaction
    await addDoc(collection(db, "transactions"), {
      userId: driverDocId,
      userName: driverName,
      driverPhone: driverPhone,
      type: "admin_transfer",
      amount,
      previousBalance: currentBalance,
      newBalance,
      status: "completed",
      note,
      timestamp: serverTimestamp(),
    })

    return { success: true, newBalance, driverName }
  } catch (error) {
    console.error("[admin-utils] sendMoneyToDriver:", error)
    return { success: false, error: (error as Error).message }
  }
}

// ─── Transactions feed ────────────────────────────────────────────────────────

export function fetchRecentTransactions(
  callback: (transactions: Transaction[]) => void,
  limitCount = 50
): () => void {
  const usersMap = new Map<string, string>()

  let unsubUsers = () => {}
  if (db) {
    try {
      unsubUsers = onSnapshot(
        collection(db, "users"),
        (usersSnap) => {
          usersSnap.forEach((d) => {
            const data = d.data()
            const name = data.fullName || data.name || data.displayName || ""
            if (name) usersMap.set(d.id, name)
          })
        },
        () => {}
      )
    } catch {}
  }

  const q = query(
    collection(db, "transactions"),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  )

  const unsubTx = onSnapshot(
    q,
    (snapshot) => {
      const transactions: Transaction[] = []
      snapshot.forEach((d) => {
        const data = d.data({ serverTimestamps: "estimate" })
        transactions.push({
          id: d.id,
          timestamp: data.timestamp,
          userId: data.userId || "",
          userName: data.userName || usersMap.get(data.userId) || data.driverPhone || "Unknown",
          type: data.type || "payment",
          amount: data.amount || 0,
          status: data.status || "completed",
          driverPhone: data.driverPhone,
          previousBalance: data.previousBalance,
          newBalance: data.newBalance,
        })
      })
      callback(transactions)
    },
    () => {}
  )

  return () => {
    unsubUsers()
    unsubTx()
  }
}

// ─── Legacy helpers (kept for back-compat, now powered by real-time onSnapshot) ──

export async function fetchActiveDrivers(callback: (drivers: ActiveDriver[]) => void) {
  const unsubscribe = subscribeActiveDrivers((snapshot) => {
    const activeDrivers: ActiveDriver[] = snapshot.rows
      .filter((r) => r.isActive)
      .map((r) => ({
        phone: r.phone,
        line: r.activeRoute || r.line || "Unknown",
        location: r.location ? { lat: r.location.lat, lng: r.location.lng } : null,
      }))
    callback(activeDrivers)
  })
  return unsubscribe
}

export async function getAllDrivers() {
  return new Promise<Array<{ phone: string; name: string; balance: number }>>((resolve) => {
    let settled = false
    const unsub = fetchAllDrivers((drivers) => {
      if (settled) return
      settled = true
      setTimeout(() => unsub(), 0)
      resolve(
        drivers.map((d) => ({
          phone: d.phone,
          name: d.name,
          balance: d.balance,
        }))
      )
    })
  })
}

// ─── Active drivers panel (multi-source real-time listener) ──────────────────

/** A driver row as rendered by the Admin "Active Drivers" panel. */
export interface DriverPanelRow {
  /** Canonical key — local phone format "0XXXXXXXXX" when known. */
  key: string
  phone: string
  name: string
  line: string
  activeRoute: string | null
  status: "active" | "idle"
  isActive: boolean
  /** Mock / test driver seeded in Firebase. */
  isMock: boolean
  location: { lat: number; lng: number; timestamp?: number } | null
  /** Most recent heartbeat (lastSeen / updatedAt / location timestamp), epoch ms. */
  lastSeen: number | null
}

export interface DriversPanelSnapshot {
  rows: DriverPanelRow[]
  /** Number of drivers currently online / active. */
  activeCount: number
  /** "active": live drivers present · "fallback": registered drivers only · "empty": nothing found */
  mode: "active" | "fallback" | "empty"
}

/** Heartbeat window for considering a driver "active" (5 minutes). */
const FRESH_MS = 5 * 60 * 1000

interface RawDriver {
  key: string
  phone: string
  name: string
  line: string
  activeRoute: string | null
  explicitOnline: boolean
  explicitOffline: boolean
  hasActiveRoute: boolean
  isMock: boolean
  heartbeat: number | null
  presenceHeartbeat: number | null
  location: { lat: number; lng: number; timestamp?: number } | null
  fromRtdb: boolean
}

function extractName(data: Record<string, any>): string {
  return data.name || data.fullName || data.displayName || ""
}

function extractLine(data: Record<string, any>): string {
  return data.line || data.busLine || data.route || data.bus_line || ""
}

function extractActiveRoute(data: Record<string, any>): string | null {
  const r = data.activeRoute ?? data.currentRoute
  if (typeof r === "string" && r.trim() && r !== "none" && r !== "idle" && r !== "false") {
    return r.trim()
  }
  return null
}

function extractPresenceHeartbeat(data: Record<string, any>): number | null {
  const candidates = [
    toMillis(data.lastSeen),
    toMillis(data.lastHeartbeat),
    toMillis(data.heartbeat),
    toMillis(data.location?.updatedAt),
    toMillis(data.location?.timestamp),
    toMillis(data.lastSeenClientAt),
  ].filter((t): t is number => t !== null && t > 0)
  return candidates.length > 0 ? Math.max(...candidates) : null
}

function extractHeartbeat(data: Record<string, any>): number | null {
  const candidates = [
    extractPresenceHeartbeat(data),
    toMillis(data.updatedAt),
    toMillis(data.timestamp),
  ].filter((t): t is number => t !== null && t > 0)
  return candidates.length > 0 ? Math.max(...candidates) : null
}

function extractLocation(
  data: Record<string, any>
): { lat: number; lng: number; timestamp?: number } | null {
  const loc = data.location && typeof data.location === "object" ? data.location : null
  const coords = data.coords && typeof data.coords === "object" ? data.coords : null

  const lat = toFiniteNumber(
    data.latitude ??
      data.lat ??
      loc?.latitude ??
      loc?.lat ??
      coords?.latitude ??
      coords?.lat
  )
  const lng = toFiniteNumber(
    data.longitude ??
      data.lng ??
      loc?.longitude ??
      loc?.lng ??
      coords?.longitude ??
      coords?.lng
  )

  if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
    const ts = toMillis(
      loc?.updatedAt ??
        loc?.timestamp ??
        loc?.ts ??
        data.locationTimestamp ??
        data.updatedAt ??
        data.lastSeen ??
        data.lastSeenClientAt
    )
    return ts != null ? { lat, lng, timestamp: ts } : { lat, lng }
  }
  return null
}

function parseDriverEntry(
  data: Record<string, any>,
  fallbackId: string,
  fromRtdb: boolean
): RawDriver {
  const phone =
    localPhone(extractPhone(data)) || localPhone(fallbackId) || fallbackId
  const statusStr =
    typeof data.status === "string" ? data.status.toLowerCase().trim() : ""

  // Handle explicit boolean `isOnline` / `online` first so `isOnline: false` on
  // disconnect always overrides an older `status: "active"` field.
  let explicitOnline = false
  let explicitOffline = false

  if (data.isOnline === false || data.online === false) {
    explicitOffline = true
  } else if (data.isOnline === true || data.online === true) {
    explicitOnline = true
  } else if (
    statusStr === "active" ||
    statusStr === "online" ||
    statusStr === "live"
  ) {
    explicitOnline = true
  } else if (
    statusStr === "idle" ||
    statusStr === "offline" ||
    statusStr === "inactive"
  ) {
    explicitOffline = true
  }

  const activeRoute = extractActiveRoute(data)
  const hasActiveRoute =
    activeRoute !== null ||
    data.activeRoute === true

  const presenceHeartbeat = extractPresenceHeartbeat(data)
  const heartbeat = extractHeartbeat(data)
  const location = extractLocation(data)

  return {
    key: phone,
    phone,
    name: extractName(data),
    line: extractLine(data),
    activeRoute,
    explicitOnline,
    explicitOffline,
    hasActiveRoute,
    isMock:
      data.isMock === true ||
      data.isTest === true ||
      data.isTestDriver === true ||
      data.testDriver === true ||
      data.mock === true,
    heartbeat,
    presenceHeartbeat,
    location,
    fromRtdb,
  }
}

function combineSameCollectionRaw(a: RawDriver, b: RawDriver): RawDriver {
  const aTs = a.presenceHeartbeat ?? a.heartbeat ?? 0
  const bTs = b.presenceHeartbeat ?? b.heartbeat ?? 0
  const primary = bTs >= aTs ? b : a
  const secondary = bTs >= aTs ? a : b

  const locA = a.location
  const locB = b.location
  const pickedLoc =
    locA && locB
      ? (locB.timestamp ?? bTs) >= (locA.timestamp ?? aTs)
        ? locB
        : locA
      : locB ?? locA

  return {
    ...primary,
    name: primary.name || secondary.name,
    line: primary.line || secondary.line,
    activeRoute: primary.activeRoute ?? secondary.activeRoute,
    hasActiveRoute: primary.hasActiveRoute || secondary.hasActiveRoute,
    isMock: primary.isMock || secondary.isMock,
    heartbeat: Math.max(a.heartbeat ?? 0, b.heartbeat ?? 0) || null,
    presenceHeartbeat:
      Math.max(a.presenceHeartbeat ?? 0, b.presenceHeartbeat ?? 0) || null,
    location: pickedLoc,
  }
}

function resolveDriverRowFromSources(
  key: string,
  sources: RawDriver[]
): DriverPanelRow {
  // Sort sources by most recent presence heartbeat / general heartbeat descending
  const sorted = [...sources].sort((a, b) => {
    const aTs = a.presenceHeartbeat ?? a.heartbeat ?? 0
    const bTs = b.presenceHeartbeat ?? b.heartbeat ?? 0
    return bTs - aTs
  })

  const newest = sorted[0]
  // Prefer `drivers` collection metadata for name/line when present
  const name =
    sources.find((s) => !s.fromRtdb && s.name)?.name ||
    sources.find((s) => s.name)?.name ||
    ""
  const line =
    sources.find((s) => !s.fromRtdb && s.line)?.line ||
    sources.find((s) => s.line)?.line ||
    ""
  const activeRoute =
    sorted.find((s) => s.activeRoute)?.activeRoute ?? null
  const isMock = sources.some((s) => s.isMock)

  // Pick freshest non-null location across all sources
  let bestLocation: { lat: number; lng: number; timestamp?: number } | null = null
  let bestLocTs = -1
  for (const s of sorted) {
    if (!s.location) continue
    const ts = s.location.timestamp ?? s.presenceHeartbeat ?? s.heartbeat ?? 0
    if (!bestLocation || ts >= bestLocTs) {
      bestLocation = s.location
      bestLocTs = ts
    }
  }

  const maxPresenceHb =
    Math.max(...sources.map((s) => s.presenceHeartbeat ?? 0), 0) || null
  const maxGeneralHb =
    Math.max(...sources.map((s) => s.heartbeat ?? 0), 0) || null
  const lastSeen = maxPresenceHb ?? maxGeneralHb

  // Determine whether the driver is currently active / online:
  // 1. If the most recently updated source has an explicit online/offline signal, honour it.
  // 2. Otherwise check if any source has explicitOnline, activeRoute, fresh presence heartbeat, or live RTDB GPS.
  const now = Date.now()
  let isActive = false

  // Find the most recent source that explicitly declared online or offline
  const explicitSources = sorted.filter(
    (s) => s.explicitOnline || s.explicitOffline
  )
  if (explicitSources.length > 0) {
    const latestExplicit = explicitSources[0]
    if (latestExplicit.explicitOnline) {
      isActive = true
    } else if (latestExplicit.explicitOffline) {
      // Only override explicitOffline if another source has a strictly newer explicitOnline
      isActive = false
    }
  } else {
    const hasActiveRoute = sources.some((s) => s.hasActiveRoute)
    const presenceFresh =
      maxPresenceHb !== null && now - maxPresenceHb < FRESH_MS
    const rtdbSource = sources.find((s) => s.fromRtdb)
    const rtdbLive =
      rtdbSource?.location != null &&
      (rtdbSource.location.timestamp == null ||
        now - rtdbSource.location.timestamp < FRESH_MS)

    isActive = hasActiveRoute || presenceFresh || rtdbLive
  }

  return {
    key,
    phone: newest.phone || key,
    name,
    line,
    activeRoute,
    status: isActive ? "active" : "idle",
    isActive,
    isMock,
    location: bestLocation,
    lastSeen,
  }
}

/**
 * Live "Active Drivers" panel feed.
 *
 * Aggregates every place driver records/status live in Firebase in real-time:
 *   1. Firestore `drivers` collection  — `onSnapshot` (driver records, incl. mock/test drivers)
 *   2. Firestore `users` collection    — `onSnapshot` (registered users flagged as drivers)
 *   3. Realtime Database `drivers/*`   — `onValue` (live GPS + heartbeat + onDisconnect)
 *   4. Same-origin broadcast channel   — instant 0ms cross-tab sync
 *
 * All driver accounts are rendered with Active / Online drivers first (glowing green
 * status badge + live coordinates / active route), followed by Idle registered drivers.
 */
export function subscribeActiveDrivers(
  callback: (snapshot: DriversPanelSnapshot) => void
): () => void {
  const firestoreDrivers = new Map<string, RawDriver>()
  const firestoreUsers = new Map<string, RawDriver>()
  const rtdbDrivers = new Map<string, RawDriver>()
  const broadcastDrivers = new Map<string, RawDriver>()

  if (!db && !rtdb) {
    callback({ rows: [], activeCount: 0, mode: "empty" })
    return () => {}
  }

  function merge() {
    const allKeys = new Set<string>([
      ...firestoreDrivers.keys(),
      ...firestoreUsers.keys(),
      ...rtdbDrivers.keys(),
      ...broadcastDrivers.keys(),
    ])

    const rows: DriverPanelRow[] = []
    for (const key of allKeys) {
      const sources: RawDriver[] = []
      const d = firestoreDrivers.get(key)
      const u = firestoreUsers.get(key)
      const r = rtdbDrivers.get(key)
      const b = broadcastDrivers.get(key)
      if (d) sources.push(d)
      if (u) sources.push(u)
      if (r) sources.push(r)
      if (b) sources.push(b)
      if (sources.length === 0) continue

      rows.push(resolveDriverRowFromSources(key, sources))
    }

    const active = rows
      .filter((r) => r.isActive)
      .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0))
    const registered = rows
      .filter((r) => !r.isActive)
      .sort((a, b) => (a.name || a.phone).localeCompare(b.name || b.phone))

    const mode: DriversPanelSnapshot["mode"] =
      active.length > 0
        ? "active"
        : registered.length > 0
          ? "fallback"
          : "empty"

    // Always include active drivers at the top followed by idle registered drivers
    // so every driver account remains visible and transitions Idle <-> Active in place.
    const list = [...active, ...registered]

    callback({
      rows: list,
      activeCount: active.length,
      mode,
    })
  }

  let driversUnsub = () => {}
  let usersUnsub = () => {}
  let rtdbUnsub = () => {}
  let broadcastClean = () => {}

  // ── 1. Firestore `drivers` collection (real-time onSnapshot) ──────────────
  if (db) {
    try {
      driversUnsub = onSnapshot(
        collection(db, "drivers"),
        { includeMetadataChanges: true },
        (snap) => {
          firestoreDrivers.clear()
          snap.forEach((d) => {
            const data = d.data({ serverTimestamps: "estimate" }) as Record<string, any>
            const raw = parseDriverEntry(data, d.id, false)
            if (!raw.key) return
            const existing = firestoreDrivers.get(raw.key)
            firestoreDrivers.set(
              raw.key,
              existing ? combineSameCollectionRaw(existing, raw) : raw
            )
          })
          merge()
        },
        () => { merge() }
      )
    } catch (error) {
      console.error("[admin-utils] subscribeActiveDrivers (drivers):", error)
    }

    // ── 2. Firestore `users` collection (real-time onSnapshot) ────────────────
    try {
      usersUnsub = onSnapshot(
        collection(db, "users"),
        { includeMetadataChanges: true },
        (snap) => {
          firestoreUsers.clear()
          snap.forEach((d) => {
            const data = d.data({ serverTimestamps: "estimate" }) as Record<string, any>
            if (!isDriverDoc(data)) return
            const raw = parseDriverEntry(data, d.id, false)
            if (!raw.key) return
            const existing = firestoreUsers.get(raw.key)
            firestoreUsers.set(
              raw.key,
              existing ? combineSameCollectionRaw(existing, raw) : raw
            )
          })
          merge()
        },
        () => { merge() }
      )
    } catch (error) {
      console.error("[admin-utils] subscribeActiveDrivers (users):", error)
    }
  }

  // ── 3. Realtime Database `drivers/*` (live GPS + heartbeat + onDisconnect) ─
  if (rtdb) {
    try {
      rtdbUnsub = onValue(
        ref(rtdb, "drivers"),
        (snap) => {
          rtdbDrivers.clear()
          if (snap.exists()) {
            const val = snap.val() as Record<string, any>
            for (const [key, entry] of Object.entries(val)) {
              const raw = parseDriverEntry((entry ?? {}) as Record<string, any>, key, true)
              if (!raw.key) continue
              const existing = rtdbDrivers.get(raw.key)
              rtdbDrivers.set(
                raw.key,
                existing ? combineSameCollectionRaw(existing, raw) : raw
              )
            }
          }
          merge()
        },
        () => { merge() }
      )
    } catch (error) {
      console.error("[admin-utils] subscribeActiveDrivers (rtdb):", error)
      merge()
    }
  }

  // ── 4. Same-origin cross-tab broadcast listener ───────────────────────────
  if (typeof window !== "undefined") {
    const ingestBroadcast = (payload: DriverPresenceBroadcast | null | undefined) => {
      if (!payload || !payload.phone) return
      const raw = parseDriverEntry(
        {
          phone: payload.phone,
          phoneE164: payload.phoneE164,
          isOnline: payload.isOnline,
          status: payload.status,
          lastSeen: payload.lastSeen,
          updatedAt: payload.updatedAt,
          latitude: payload.latitude,
          longitude: payload.longitude,
          activeRoute: payload.activeRoute,
        },
        payload.phone,
        true
      )
      if (!raw.key) return
      const prev = broadcastDrivers.get(raw.key)
      broadcastDrivers.set(raw.key, prev ? combineSameCollectionRaw(prev, raw) : raw)
      merge()
    }

    // Hydrate any existing active broadcast from localStorage
    try {
      const saved = localStorage.getItem(PRESENCE_BROADCAST_KEY)
      if (saved) {
        ingestBroadcast(JSON.parse(saved) as DriverPresenceBroadcast)
      }
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESENCE_BROADCAST_KEY && e.newValue) {
        try {
          ingestBroadcast(JSON.parse(e.newValue) as DriverPresenceBroadcast)
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)

    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(PRESENCE_CHANNEL_NAME)
        channel.onmessage = (event) => {
          ingestBroadcast(event.data as DriverPresenceBroadcast)
        }
      }
    } catch {}

    broadcastClean = () => {
      window.removeEventListener("storage", onStorage)
      try {
        channel?.close()
      } catch {}
    }
  }

  // Periodic staleness re-evaluation every 30s
  const stalenessTimer = setInterval(merge, 30_000)

  return () => {
    driversUnsub()
    usersUnsub()
    rtdbUnsub()
    broadcastClean()
    clearInterval(stalenessTimer)
  }
}

// ─── Driver phone registration (admin) ──────────────────────────────────────

export interface DriverLookupResult {
  /** Local format "0XXXXXXXXX" */
  phone: string
  /** E.164 format "+213XXXXXXXXX" */
  phoneE164: string
  /** True when a driver/user record already exists in Firebase */
  exists: boolean
  driverDocId: string | null
  userDocId: string | null
  name: string
  line: string
  role: string | null
  /** True when the found record already carries driver privileges */
  isAuthorized: boolean
}

export interface RegisterDriverInput {
  phone: string
  name?: string
  line?: string
}

export interface RegisterDriverResult {
  success: boolean
  /** True when a brand-new driver record was created (false = existing record updated) */
  created: boolean
  phone?: string
  phoneE164?: string
  lookup?: DriverLookupResult
  error?: string
}

/** Validate + normalise a phone to local / E.164 pair. Returns null when invalid. */
function normalizePhonePair(raw: string): { local: string; e164: string } | null {
  const trimmed = (raw || "").trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[^\d+]/g, "")
  const local = localPhone(digits)
  // Algerian mobile: 0X XXXX XXXX (10 digits, leading 0)
  if (!/^0\d{9}$/.test(local)) return null
  return { local, e164: "+213" + local.slice(1) }
}

/**
 * Identify a driver in Firebase by phone number.
 *
 * Looks the phone up across the Firestore `drivers` and `users` collections
 * (doc ids and every known phone field variant). Firebase Auth phone sign-in
 * maps to the same `0XXXXXXXXX` document convention, so a record found here is
 * the account the driver will use when they log in.
 */
export async function findDriverInFirebase(
  rawPhone: string
): Promise<{ success: boolean; lookup?: DriverLookupResult; error?: string }> {
  const pair = normalizePhonePair(rawPhone)
  if (!pair) return { success: false, error: "invalid_phone" }
  const { local, e164 } = pair

  let driverDocId: string | null = null
  let driverData: Record<string, any> | null = null
  let userDocId: string | null = null
  let userData: Record<string, any> | null = null

  const readDriverDoc = async (id: string) => {
    try {
      const snap = await getDoc(doc(db, "drivers", id))
      if (snap.exists() && !driverDocId) {
        driverDocId = snap.id
        driverData = snap.data() as Record<string, any>
      }
    } catch { /* collection may not exist yet */ }
  }

  try {
    // 1. Firestore `drivers` collection — doc id may be local or E.164 phone
    await Promise.all([readDriverDoc(local), readDriverDoc(e164)])
    if (!driverDocId) {
      for (const field of ["phone", "phoneE164", "Phone", "phoneNumber"]) {
        for (const variant of [local, e164, rawPhone.trim()]) {
          if (!variant) continue
          try {
            const qs = await getDocs(query(collection(db, "drivers"), where(field, "==", variant)))
            if (!qs.empty) {
              driverDocId = qs.docs[0].id
              driverData = qs.docs[0].data() as Record<string, any>
              break
            }
          } catch { /* skip */ }
        }
        if (driverDocId) break
      }
    }

    // 2. Firestore `users` collection — doc id convention is `0XXXXXXXXX`
    try {
      const snap = await getDoc(doc(db, "users", local))
      if (snap.exists()) {
        userDocId = snap.id
        userData = snap.data() as Record<string, any>
      }
    } catch { /* skip */ }
    if (!userDocId) {
      for (const field of ["Phone", "phone", "phoneNumber", "PhoneNumber", "mobile"]) {
        for (const variant of [local, e164, rawPhone.trim()]) {
          if (!variant) continue
          try {
            const qs = await getDocs(query(collection(db, "users"), where(field, "==", variant)))
            if (!qs.empty) {
              userDocId = qs.docs[0].id
              userData = qs.docs[0].data() as Record<string, any>
              break
            }
          } catch { /* skip */ }
        }
        if (userDocId) break
      }
    }
  } catch (error) {
    console.error("[admin-utils] findDriverInFirebase:", error)
    return { success: false, error: (error as Error).message }
  }

  const primary = (driverData ?? userData ?? {}) as Record<string, any>
  const exists = Boolean(driverDocId || userDocId)
  const lookup: DriverLookupResult = {
    phone: local,
    phoneE164: e164,
    exists,
    driverDocId,
    userDocId,
    name: extractName(primary),
    line: extractLine(primary),
    role: primary.role ?? null,
    isAuthorized:
      Boolean(driverDocId) ||
      isAuthorizedDriverRecord(driverData) ||
      isAuthorizedDriverRecord(userData),
  }

  return { success: true, lookup }
}

/**
 * Create or update a driver record with authorized-driver privileges.
 *
 * - Ensures `drivers/{phone}` exists with driver privileges (`role: "driver"`,
 *   `isDriver`, `isAuthorized`, …) so the app recognises the driver immediately
 *   upon login.
 * - Mirrors the privileges onto the matching `users/{phone}` record (created
 *   with the standard `0XXXXXXXXX` doc-id convention when missing).
 * - Returns `created: false` when an existing Firebase record was updated.
 */
export async function registerDriver(
  input: RegisterDriverInput
): Promise<RegisterDriverResult> {
  const pair = normalizePhonePair(input.phone)
  if (!pair) return { success: false, created: false, error: "invalid_phone" }
  const { local, e164 } = pair
  const name = (input.name || "").trim()
  const line = (input.line || "").trim()

  try {
    // Identify the driver in Firebase first (drivers + users collections)
    const found = await findDriverInFirebase(input.phone)
    const lookup = found.lookup
    if (!found.success || !lookup) {
      return { success: false, created: false, error: found.error || "lookup_failed" }
    }

    const now = serverTimestamp()
    const resolvedName = name || lookup.name || local
    const resolvedLine = line || lookup.line || ""

    // 1. Driver record — create or update with authorized driver privileges
    const driverRef = doc(db, "drivers", lookup.driverDocId ?? local)
    const driverPayload: Record<string, any> = {
      phone: local,
      phoneE164: e164,
      name: resolvedName,
      fullName: resolvedName,
      line: resolvedLine,
      busLine: resolvedLine,
      role: "driver",
      userType: "driver",
      type: "driver",
      accountType: "driver",
      isDriver: true,
      isAuthorized: true,
      isAuthorizedDriver: true,
      authorizedBy: "admin_dashboard",
      updatedAt: now,
      ...(lookup.driverDocId ? {} : { createdAt: now, isOnline: false, status: "idle" }),
    }

    // 2. Mirror privileges onto the `users` record (login / wallet identity)
    const userPrivileges: Record<string, any> = {
      role: "driver",
      isDriver: true,
      isAuthorizedDriver: true,
      updatedAt: now,
    }
    if (name) {
      userPrivileges.fullName = resolvedName
      userPrivileges.name = resolvedName
    }
    if (line) {
      userPrivileges.line = resolvedLine
      userPrivileges.busLine = resolvedLine
    }

    const userRef = doc(db, "users", lookup.userDocId ?? local)
    const userPayload = lookup.userDocId
      ? userPrivileges
      : {
          Phone: local,
          phone: local,
          phoneE164: e164,
          balance: 0,
          createdAt: now,
          isOnline: false,
          status: "idle",
          ...userPrivileges,
          fullName: resolvedName,
          name: resolvedName,
        }

    await Promise.all([
      setDoc(driverRef, driverPayload, { merge: true }),
      setDoc(userRef, userPayload, { merge: true }),
    ])

    // Make the current session recognise the driver right away
    registerAuthorizedDriverPhone(e164)

    return {
      success: true,
      created: !lookup.exists,
      phone: local,
      phoneE164: e164,
      lookup: {
        ...lookup,
        exists: true,
        driverDocId: lookup.driverDocId ?? local,
        userDocId: lookup.userDocId ?? local,
        name: resolvedName,
        line: resolvedLine,
        role: "driver",
        isAuthorized: true,
      },
    }
  } catch (error) {
    console.error("[admin-utils] registerDriver:", error)
    return { success: false, created: false, error: (error as Error).message }
  }
}
