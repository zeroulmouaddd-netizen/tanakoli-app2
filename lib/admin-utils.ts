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
import { ref, onValue } from "firebase/database"

export interface DriverLocation {
  lat: number
  lng: number
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

/** Normalise any phone format to local "0XXXXXXXXX" */
function localPhone(raw: string): string {
  if (!raw) return ""
  const s = raw.trim()
  if (s.startsWith("+213")) return "0" + s.slice(4)
  if (s.startsWith("213") && s.length === 12) return "0" + s.slice(3)
  return s
}

/** Extract the phone field regardless of casing */
function extractPhone(data: Record<string, any>): string {
  return (
    data.Phone ||
    data.phone ||
    data.phoneNumber ||
    data.PhoneNumber ||
    data.mobile ||
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
  if (data.isDriver === true)        return true
  if (data.role === "driver")        return true
  if (data.userType === "driver")    return true
  if (data.type === "driver")        return true
  if (data.accountType === "driver") return true
  return false
}

/** Return true when a `drivers`/`users` record carries authorized-driver privileges. */
function isAuthorizedDriverRecord(data: Record<string, any> | undefined | null): boolean {
  if (!data) return false
  if (data.isAuthorized === true)       return true
  if (data.isAuthorizedDriver === true) return true
  if (data.authorized === true)         return true
  if (data.isDriver === true)           return true
  if (data.role === "driver")           return true
  return false
}

/** Normalise any phone format to E.164 "+213XXXXXXXXX" */
export function normalizeE164Phone(raw: string): string {
  const local = localPhone(raw)
  if (!local) return ""
  return "+213" + local.slice(1)
}

/** Public wrapper around {@link localPhone}. */
export function normalizeLocalPhone(raw: string): string {
  return localPhone(raw)
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

// ─── Fetch all registered drivers ────────────────────────────────────────────

/**
 * Returns a live-updating list of all drivers from Firestore.
 * Tries several role-field strategies; also merges RTDB live-status.
 * Calls `callback` immediately and on every change.
 */
export function fetchAllDrivers(
  callback: (drivers: DriverRecord[]) => void
): () => void {
  // We keep both the Firestore snapshot and the RTDB snapshot in memory
  // and merge them each time either changes.
  let firestoreUsers: Array<{ id: string; phone: string; name: string; balance: number }> = []
  let rtdbStatus: Record<string, { lat: number; lng: number; ts: number }> = {}

  function merge() {
    const now = Date.now()
    const rows: DriverRecord[] = firestoreUsers.map((u) => {
      const rtdbKey =
        rtdbStatus[u.phone] != null
          ? u.phone
          // also try "+213" variant
          : rtdbStatus["+213" + u.phone.slice(1)] != null
          ? "+213" + u.phone.slice(1)
          : null

      const live = rtdbKey ? rtdbStatus[rtdbKey] : null
      const isLive = live ? now - live.ts < 5 * 60 * 1000 : false

      return {
        id: u.id,
        phone: u.phone,
        name: u.name,
        balance: u.balance,
        isLive,
        lat: live?.lat ?? null,
        lng: live?.lng ?? null,
        lastSeen: live?.ts ?? null,
      }
    })
    callback(rows)
  }

  // ── Firestore: fetch ALL users, filter client-side for maximum recall ──────
  let firestoreUnsub = () => {}
  ;(async () => {
    try {
      // Strategy 1: query by known driver fields
      let snap = await getDocs(
        query(collection(db, "users"), where("isDriver", "==", true))
      )

      // Strategy 2: role == driver
      if (snap.empty) {
        snap = await getDocs(
          query(collection(db, "users"), where("role", "==", "driver"))
        )
      }

      // Strategy 3: fetch all and filter — handles any field name
      if (snap.empty) {
        snap = await getDocs(collection(db, "users"))
      }

      // Build initial list from whichever snap we got
      const list: typeof firestoreUsers = []
      snap.forEach((d) => {
        const data = d.data()
        // Include doc if it passed a driver query, or if client-side check passes
        if (isDriverDoc(data) || snap.query) {
          const phone = localPhone(extractPhone(data))
          if (phone) {
            list.push({
              id: d.id,
              phone,
              name: data.fullName || data.name || data.displayName || phone,
              balance: extractBalance(data),
            })
          }
        }
      })
      firestoreUsers = list
      merge()

      // Now set up a live listener for balance updates
      const liveQuery = query(collection(db, "users"), orderBy("__name__"))
      firestoreUnsub = onSnapshot(liveQuery, (liveSnap) => {
        const updated: typeof firestoreUsers = []
        liveSnap.forEach((d) => {
          const data = d.data()
          if (isDriverDoc(data)) {
            const phone = localPhone(extractPhone(data))
            if (phone) {
              updated.push({
                id: d.id,
                phone,
                name: data.fullName || data.name || data.displayName || phone,
                balance: extractBalance(data),
              })
            }
          }
        })
        firestoreUsers = updated
        merge()
      }, () => {})
    } catch {
      // Ignore — RTDB merge will still work
    }
  })()

  // ── RTDB: live GPS status ─────────────────────────────────────────────────
  const rtdbUnsub = onValue(ref(rtdb, "drivers"), (snap) => {
    rtdbStatus = {}
    if (snap.exists()) {
      const val = snap.val() as Record<string, any>
      for (const [key, entry] of Object.entries(val)) {
        const loc = entry?.location
        if (loc?.lat && loc?.lng) {
          rtdbStatus[key] = { lat: loc.lat, lng: loc.lng, ts: loc.timestamp ?? Date.now() }
        }
      }
    }
    merge()
  }, () => {})

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    firestoreUnsub()
    rtdbUnsub()
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

    // Try every phone field / format variant
    const phoneVariants = [local, international, driverPhone]
    const phoneFields = ["Phone", "phone", "phoneNumber", "PhoneNumber", "mobile"]

    let driverDocId: string | null = null
    let currentBalance = 0
    let driverName = ""

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
        walletBalance: increment(amount),  // update both if present
      })
      return bal + amount
    }).catch(async () => {
      // Fallback: plain updateDoc (if runTransaction fails due to missing field)
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
  const q = query(
    collection(db, "transactions"),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  )

  const unsub = onSnapshot(q, async (snapshot) => {
    const transactions: Transaction[] = []

    let usersMap: Map<string, string> = new Map()
    try {
      const usersSnap = await getDocs(collection(db, "users"))
      usersSnap.forEach((d) => {
        const data = d.data()
        const name = data.fullName || data.name || data.displayName || ""
        usersMap.set(d.id, name)
      })
    } catch {}

    snapshot.forEach((d) => {
      const data = d.data()
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
  }, () => {})

  return unsub
}

// ─── Legacy helpers (kept for back-compat) ────────────────────────────────────

export async function fetchActiveDrivers(callback: (drivers: ActiveDriver[]) => void) {
  const driversRef = ref(rtdb, "drivers")
  const unsubscribe = onValue(driversRef, async (snapshot) => {
    if (!snapshot.exists()) { callback([]); return }
    const driversData = snapshot.val()
    const drivers: ActiveDriver[] = []
    try {
      const usersSnap = await getDocs(collection(db, "users"))
      const usersMap = new Map<string, string>()
      usersSnap.forEach((d) => { usersMap.set(extractPhone(d.data()), d.data().line || "Unknown") })
      for (const [phone, driverData] of Object.entries(driversData)) {
        const data = driverData as any
        if (data.location) {
          drivers.push({ phone, line: usersMap.get(phone) || "Unknown", location: data.location })
        }
      }
    } catch {}
    callback(drivers)
  })
  return unsubscribe
}

export async function getAllDrivers() {
  const snap = await getDocs(collection(db, "users"))
  const result: Array<{ phone: string; name: string; balance: number }> = []
  snap.forEach((d) => {
    const data = d.data()
    if (isDriverDoc(data)) {
      const phone = localPhone(extractPhone(data))
      if (phone) {
        result.push({
          phone,
          name: data.fullName || data.name || data.displayName || phone,
          balance: extractBalance(data),
        })
      }
    }
  })
  return result
}

// ─── Active drivers panel (multi-source listener) ────────────────────────────

/** A driver row as rendered by the Admin "Active Drivers" panel. */
export interface DriverPanelRow {
  /** Canonical key — local phone format "0XXXXXXXXX" when known. */
  key: string
  phone: string
  name: string
  line: string
  isActive: boolean
  /** Mock / test driver seeded in Firebase. */
  isMock: boolean
  location: { lat: number; lng: number; timestamp?: number } | null
  /** Most recent heartbeat (lastSeen / updatedAt / location timestamp), epoch ms. */
  lastSeen: number | null
}

export interface DriversPanelSnapshot {
  rows: DriverPanelRow[]
  /** "active": live drivers · "fallback": registered drivers only · "empty": nothing found */
  mode: "active" | "fallback" | "empty"
}

/** Heartbeat window for considering a driver "active". */
const FRESH_MS = 5 * 60 * 1000

interface RawDriver {
  key: string
  phone: string
  name: string
  line: string
  isOnline: boolean
  hasActiveRoute: boolean
  isMock: boolean
  heartbeat: number | null
  location: { lat: number; lng: number; timestamp?: number } | null
  /** True when live GPS presence came from the Realtime Database. */
  rtdbLive: boolean
}

function extractName(data: Record<string, any>): string {
  return data.name || data.fullName || data.displayName || ""
}

function extractLine(data: Record<string, any>): string {
  return data.line || data.busLine || data.route || data.bus_line || ""
}

function extractHeartbeat(data: Record<string, any>): number | null {
  return toMillis(
    data.lastSeen ??
    data.updatedAt ??
    data.lastHeartbeat ??
    data.heartbeat ??
    data.location?.timestamp ??
    data.timestamp
  )
}

function extractLocation(data: Record<string, any>): { lat: number; lng: number; timestamp?: number } | null {
  const loc = data.location
  if (loc && typeof loc === "object" && typeof loc.lat === "number" && typeof loc.lng === "number") {
    const ts = toMillis(loc.timestamp ?? loc.ts ?? loc.updatedAt)
    return ts != null ? { lat: loc.lat, lng: loc.lng, timestamp: ts } : { lat: loc.lat, lng: loc.lng }
  }
  if (typeof data.lat === "number" && typeof data.lng === "number") {
    const ts = toMillis(data.locationTimestamp ?? data.updatedAt ?? data.lastSeen)
    return ts != null ? { lat: data.lat, lng: data.lng, timestamp: ts } : { lat: data.lat, lng: data.lng }
  }
  return null
}

function parseDriverEntry(data: Record<string, any>, fallbackId: string, fromRtdb: boolean): RawDriver {
  const phone = localPhone(extractPhone(data) || data.phoneE164 || "") || localPhone(fallbackId) || fallbackId
  return {
    key: phone,
    phone,
    name: extractName(data),
    line: extractLine(data),
    isOnline: data.isOnline === true || data.online === true || data.status === "online",
    hasActiveRoute:
      data.activeRoute !== undefined &&
      data.activeRoute !== null &&
      data.activeRoute !== false &&
      data.activeRoute !== "",
    isMock:
      data.isMock === true ||
      data.isTest === true ||
      data.isTestDriver === true ||
      data.testDriver === true ||
      data.mock === true,
    heartbeat: extractHeartbeat(data),
    location: extractLocation(data),
    rtdbLive: fromRtdb,
  }
}

/**
 * Live "Active Drivers" panel feed.
 *
 * Aggregates every place driver records/status live in Firebase:
 *   1. Firestore `drivers` collection  — driver records (incl. mock/test drivers)
 *   2. Firestore `users` collection    — registered users flagged as drivers
 *   3. Realtime Database `drivers/*`   — live GPS + heartbeat (isOnline / lastSeen / updatedAt)
 *
 * A driver is "active" when any status signal is present:
 * `isOnline: true`, an `activeRoute`, a recent heartbeat (lastSeen / updatedAt),
 * or a live GPS location in the Realtime Database.
 *
 * When no driver is currently active, the feed gracefully falls back to listing
 * registered drivers so the panel is never falsely empty.
 */
export function subscribeActiveDrivers(
  callback: (snapshot: DriversPanelSnapshot) => void
): () => void {
  const firestoreDrivers = new Map<string, RawDriver>()
  const firestoreUsers = new Map<string, RawDriver>()
  const rtdbDrivers = new Map<string, RawDriver>()

  function merge() {
    // Registered drivers: `drivers` collection wins over `users` metadata.
    const merged = new Map<string, RawDriver>()
    for (const [key, raw] of firestoreDrivers) {
      merged.set(key, { ...raw })
    }
    for (const [key, raw] of firestoreUsers) {
      const existing = merged.get(key)
      if (existing) {
        merged.set(key, {
          ...raw,
          name: existing.name || raw.name,
          line: existing.line || raw.line,
          heartbeat: Math.max(existing.heartbeat ?? 0, raw.heartbeat ?? 0) || null,
          isOnline: existing.isOnline || raw.isOnline,
          hasActiveRoute: existing.hasActiveRoute || raw.hasActiveRoute,
          isMock: existing.isMock || raw.isMock,
          location: existing.location ?? raw.location,
        })
      } else {
        merged.set(key, { ...raw })
      }
    }

    // Live RTDB status: location + heartbeat + presence flags.
    const rows: DriverPanelRow[] = []
    for (const [key, raw] of merged) {
      const live = rtdbDrivers.get(key)
      const location = live?.location ?? raw.location
      const heartbeat = Math.max(raw.heartbeat ?? 0, live?.heartbeat ?? 0) || null
      // RTDB presence means the driver app is in driver mode (the location node
      // is cleared on exit). Tracking currently writes no timestamp — treat a
      // present location without one as live.
      const rtdbLive =
        live?.location != null &&
        (live.location.timestamp == null || Date.now() - live.location.timestamp < FRESH_MS)

      const heartbeatFresh = heartbeat != null && Date.now() - heartbeat < FRESH_MS
      const isActive = raw.isOnline || live?.isOnline === true || raw.hasActiveRoute || heartbeatFresh || rtdbLive

      rows.push({
        key,
        phone: raw.phone || key,
        name: raw.name,
        line: raw.line,
        isActive,
        isMock: raw.isMock,
        location: location ?? null,
        lastSeen: heartbeat,
      })
    }

    // RTDB-only entries (live drivers with no Firestore record yet).
    for (const [key, live] of rtdbDrivers) {
      if (merged.has(key)) continue
      const rtdbLive =
        live.location != null &&
        (live.location.timestamp == null || Date.now() - live.location.timestamp < FRESH_MS)
      const heartbeatFresh = live.heartbeat != null && Date.now() - live.heartbeat < FRESH_MS
      rows.push({
        key,
        phone: live.phone || key,
        name: live.name,
        line: live.line,
        isActive: live.isOnline || live.hasActiveRoute || heartbeatFresh || rtdbLive,
        isMock: live.isMock,
        location: live.location,
        lastSeen: live.heartbeat,
      })
    }

    const active = rows
      .filter((r) => r.isActive)
      .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0))
    const registered = rows
      .filter((r) => !r.isActive)
      .sort((a, b) => (a.name || a.phone).localeCompare(b.name || b.phone))

    const mode: DriversPanelSnapshot["mode"] =
      active.length > 0 ? "active" : registered.length > 0 ? "fallback" : "empty"
    const list = active.length > 0 ? active : registered

    callback({ rows: list, mode })
  }

  // ── 1. Firestore `drivers` collection (driver records, incl. mock/test) ──
  const driversUnsub = onSnapshot(
    collection(db, "drivers"),
    (snap) => {
      firestoreDrivers.clear()
      snap.forEach((d) => {
        const data = d.data() as Record<string, any>
        const raw = parseDriverEntry(data, d.id, false)
        if (raw.key) firestoreDrivers.set(raw.key, raw)
      })
      merge()
    },
    () => { merge() }
  )

  // ── 2. Firestore `users` collection (registered drivers) ─────────────────
  const usersUnsub = onSnapshot(
    collection(db, "users"),
    (snap) => {
      firestoreUsers.clear()
      snap.forEach((d) => {
        const data = d.data() as Record<string, any>
        if (!isDriverDoc(data)) return
        const raw = parseDriverEntry(data, d.id, false)
        if (raw.key) firestoreUsers.set(raw.key, raw)
      })
      merge()
    },
    () => { merge() }
  )

  // ── 3. Realtime Database `drivers/*` (live GPS + heartbeat) ──────────────
  const rtdbUnsub = onValue(
    ref(rtdb, "drivers"),
    (snap) => {
      rtdbDrivers.clear()
      if (snap.exists()) {
        const val = snap.val() as Record<string, any>
        for (const [key, entry] of Object.entries(val)) {
          const raw = parseDriverEntry((entry ?? {}) as Record<string, any>, key, true)
          if (raw.key) rtdbDrivers.set(raw.key, raw)
        }
      }
      merge()
    },
    () => { merge() }
  )

  return () => {
    driversUnsub()
    usersUnsub()
    rtdbUnsub()
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
    await readDriverDoc(local)
    await readDriverDoc(e164)
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
      isAuthorizedDriverRecord(driverData) || isAuthorizedDriverRecord(userData),
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
    await setDoc(
      driverRef,
      {
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
        ...(lookup.driverDocId ? {} : { createdAt: now }),
      },
      { merge: true }
    )

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
    if (lookup.userDocId) {
      await setDoc(userRef, userPrivileges, { merge: true })
    } else {
      await setDoc(
        userRef,
        {
          Phone: local,
          phone: local,
          phoneE164: e164,
          balance: 0,
          createdAt: now,
          ...userPrivileges,
          fullName: resolvedName,
          name: resolvedName,
        },
        { merge: true }
      )
    }

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
