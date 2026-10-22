// Hardcoded list of phone numbers authorized to access Driver Mode.
// Format: E.164  (+213XXXXXXXXX — leading 0 replaced by +213)
// To add a driver: append their E.164 number to this set.
//
// The hardcoded set is only the baseline. Driver phones registered from the
// Admin Dashboard ("Add Driver") or stored in Firestore (`drivers` / `users`)
// are recognised through the registry below — so the app picks them up
// immediately upon login without a code change.
export const AUTHORIZED_DRIVER_PHONES = new Set<string>([
  "+213775453629",
  "+213666666666", // Play Store / test driver account
])

// ─── Firebase-backed authorized driver registry ──────────────────────────────
// Mirrors driver phones registered in Firebase (drivers / users collections)
// so `isAuthorizedDriverPhone` can recognise them at login time.

const AUTHORIZED_DRIVERS_CACHE_KEY = "tanakoli_authorized_driver_phones"
// Session cache owned by driver-mode-context. Cleared when a new authorized
// phone appears so a freshly registered driver is recognised without re-login.
const DRIVER_AUTH_SESSION_KEY = "tanakoli_is_driver"
export const AUTHENTICATED_PHONE_STORAGE_KEY = "tanakoli_auth_phone"

/** Phones authorized via Firebase (admin registration). Persisted per device. */
const firebaseAuthorizedPhones = new Set<string>()

function persistAuthorizedCache(): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(AUTHORIZED_DRIVERS_CACHE_KEY, JSON.stringify([...firebaseAuthorizedPhones]))
  } catch {
    // Ignore storage errors
  }
}

function hydrateAuthorizedCache(): void {
  if (typeof localStorage === "undefined") return
  try {
    const raw = localStorage.getItem(AUTHORIZED_DRIVERS_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const phone of parsed) {
        if (typeof phone === "string" && phone) firebaseAuthorizedPhones.add(phone)
      }
    }
  } catch {
    // Ignore storage errors
  }
}

hydrateAuthorizedCache()

/** Normalise any phone format to E.164 "+213XXXXXXXXX" */
export function toE164(phone: string | null | undefined): string {
  const s = (phone || "").trim().replace(/[^\d+]/g, "")
  if (!s) return ""
  if (s.startsWith("+213")) return "+213" + s.slice(4)
  if (s.startsWith("00213")) return "+213" + s.slice(5)
  if (s.startsWith("213") && s.length === 12) return "+" + s
  if (s.startsWith("0") && s.length === 10) return "+213" + s.slice(1)
  if (/^[567]\d{8}$/.test(s)) return "+213" + s
  return s.startsWith("+") ? s : ""
}

/** Normalise any phone format to local "0XXXXXXXXX" */
export function toLocalPhone(phone: string | null | undefined): string {
  const trimmed = (phone || "").trim()
  if (!trimmed) return ""
  const s = trimmed.replace(/[^\d+]/g, "")
  const digitCount = s.replace(/\+/g, "").length
  if (digitCount < 8) return trimmed
  if (s.startsWith("+213")) return "0" + s.slice(4)
  if (s.startsWith("00213")) return "0" + s.slice(5)
  if (s.startsWith("213") && s.length === 12) return "0" + s.slice(3)
  if (/^[567]\d{8}$/.test(s)) return "0" + s
  return s
}

/** Register an E.164 or local phone as an authorized driver for this device/session. */
export function registerAuthorizedDriverPhone(rawPhone: string | null | undefined): void {
  if (!rawPhone) return
  const e164 = toE164(rawPhone) || rawPhone.trim()
  if (!e164 || AUTHORIZED_DRIVER_PHONES.has(e164) || firebaseAuthorizedPhones.has(e164)) return
  firebaseAuthorizedPhones.add(e164)
  persistAuthorizedCache()
  // Invalidate the cached authorization flag so the driver mode gate re-checks.
  try {
    sessionStorage.removeItem(DRIVER_AUTH_SESSION_KEY)
  } catch {
    // Ignore storage errors
  }
}

export function isAuthorizedDriverPhone(rawPhone: string | null | undefined): boolean {
  if (!rawPhone) return false
  const e164 = toE164(rawPhone) || rawPhone.trim()
  return AUTHORIZED_DRIVER_PHONES.has(e164) || firebaseAuthorizedPhones.has(e164)
}

// ─── Firebase identification ────────────────────────────────────────────────

/** Return true when a `users` record carries authorized driver privileges. */
export function recordGrantsDriverRole(data: Record<string, any> | undefined | null): boolean {
  if (!data) return false
  return (
    data.isAuthorized === true ||
    data.isAuthorizedDriver === true ||
    data.authorized === true ||
    data.isDriver === true ||
    data.role === "driver" ||
    data.userType === "driver" ||
    data.type === "driver" ||
    data.accountType === "driver"
  )
}

/** Return true when a document in the `drivers` collection represents a valid driver. */
export function isDriversCollectionRecord(data: Record<string, any> | undefined | null): boolean {
  if (!data) return false
  if (data.isAuthorized === false || data.isDriver === false) return false
  return true
}

function extractAnyPhone(data: Record<string, any> | undefined | null): string {
  if (!data) return ""
  return (
    data.phoneE164 ||
    data.Phone ||
    data.phone ||
    data.phoneNumber ||
    data.PhoneNumber ||
    data.mobile ||
    ""
  )
}

export interface ResolvedDriverRecords {
  authorized: boolean
  localPhone: string
  e164Phone: string
  driverDocIds: string[]
  userDocIds: string[]
  line: string
  activeRoute: string
  name: string
}

/**
 * Resolve a driver's authorization and matching document IDs across Firestore
 * `drivers` and `users` collections (plus RTDB `drivers`).
 */
export async function resolveDriverFirebaseRecords(
  phone: string | null | undefined
): Promise<ResolvedDriverRecords> {
  const local = toLocalPhone(phone)
  const e164 = toE164(phone)
  const driverDocIds = new Set<string>()
  const userDocIds = new Set<string>()
  let authorized = isAuthorizedDriverPhone(e164 || phone)
  let line = ""
  let activeRoute = ""
  let name = ""

  const absorbMeta = (data: Record<string, any> | undefined | null) => {
    if (!data) return
    if (!name) name = data.name || data.fullName || data.displayName || ""
    if (!line) line = data.line || data.busLine || data.route || data.bus_line || ""
    if (!activeRoute && typeof data.activeRoute === "string") activeRoute = data.activeRoute
  }

  if (!local && !e164) {
    return {
      authorized,
      localPhone: local,
      e164Phone: e164,
      driverDocIds: [],
      userDocIds: [],
      line,
      activeRoute,
      name,
    }
  }

  try {
    const { db } = await import("@/lib/firebase")
    const { collection, doc, getDoc, getDocs, query, where } = await import("firebase/firestore")

    // 1. Direct lookup in `drivers/{local}` and `drivers/{e164}`
    for (const id of [local, e164]) {
      if (!id) continue
      try {
        const snap = await getDoc(doc(db, "drivers", id))
        if (snap.exists() && isDriversCollectionRecord(snap.data())) {
          driverDocIds.add(snap.id)
          authorized = true
          absorbMeta(snap.data())
        }
      } catch {
        // Ignore
      }
    }

    // 2. Direct lookup in `users/{local}` and `users/{e164}`
    for (const id of [local, e164]) {
      if (!id) continue
      try {
        const snap = await getDoc(doc(db, "users", id))
        if (snap.exists()) {
          const data = snap.data()
          userDocIds.add(snap.id)
          absorbMeta(data)
          if (recordGrantsDriverRole(data)) {
            authorized = true
          }
        }
      } catch {
        // Ignore
      }
    }

    // 3. If not yet found in `drivers`, scan `drivers` collection by normalized phone
    if (driverDocIds.size === 0) {
      try {
        const snap = await getDocs(collection(db, "drivers"))
        snap.forEach((d) => {
          const data = d.data()
          const docLocal = toLocalPhone(extractAnyPhone(data) || d.id)
          if (docLocal && docLocal === local && isDriversCollectionRecord(data)) {
            driverDocIds.add(d.id)
            authorized = true
            absorbMeta(data)
          }
        })
      } catch {
        // Ignore
      }
    }

    // 4. If still not authorized, check `users` collection by phone fields
    if (!authorized) {
      for (const field of ["Phone", "phone", "phoneNumber", " phoneE164", "mobile"]) {
        for (const variant of [local, e164]) {
          if (!variant) continue
          try {
            const qs = await getDocs(query(collection(db, "users"), where(field.trim(), "==", variant)))
            qs.forEach((d) => {
              const data = d.data()
              userDocIds.add(d.id)
              absorbMeta(data)
              if (recordGrantsDriverRole(data)) {
                authorized = true
              }
            })
          } catch {
            // Ignore
          }
        }
        if (authorized) break
      }
    }
  } catch {
    // Firebase unavailable
  }

  if (authorized && e164) {
    registerAuthorizedDriverPhone(e164)
  }

  if (local) {
    driverDocIds.add(local)
    userDocIds.add(local)
  }

  return {
    authorized,
    localPhone: local,
    e164Phone: e164,
    driverDocIds: [...driverDocIds],
    userDocIds: [...userDocIds],
    line,
    activeRoute,
    name,
  }
}

/**
 * Identify a driver in Firebase and report whether they hold authorized
 * driver privileges (drivers / users Firestore collections — the records
 * Firebase Auth phone sign-in maps onto at login).
 *
 * Fast path: phones already known locally (hardlist / cache) resolve without
 * network access.
 */
export async function isAuthorizedDriverInFirebase(
  phone: string | null | undefined
): Promise<boolean> {
  if (!phone) return false
  const e164 = toE164(phone) || phone
  if (isAuthorizedDriverPhone(e164)) return true

  const resolved = await resolveDriverFirebaseRecords(phone)
  return resolved.authorized
}

/**
 * Refresh the local authorized-driver registry from Firebase.
 * Called on app start; failures are ignored (network / rules / offline).
 */
export async function syncAuthorizedDriverPhonesFromFirebase(): Promise<void> {
  try {
    const { db } = await import("@/lib/firebase")
    const { collection, getDocs } = await import("firebase/firestore")

    const addPhone = (raw: unknown) => {
      const e164 = typeof raw === "string" ? toE164(raw) : ""
      if (e164) registerAuthorizedDriverPhone(e164)
    }

    // drivers collection — admin-registered driver records
    try {
      const snap = await getDocs(collection(db, "drivers"))
      snap.forEach((d) => {
        const data = d.data()
        if (isDriversCollectionRecord(data)) {
          addPhone(extractAnyPhone(data) || d.id)
        }
      })
    } catch {
      // drivers collection may not exist yet
    }

    // users collection — accounts flagged as drivers
    try {
      const snap = await getDocs(collection(db, "users"))
      snap.forEach((d) => {
        const data = d.data()
        if (recordGrantsDriverRole(data)) {
          addPhone(extractAnyPhone(data) || d.id)
        }
      })
    } catch {
      // Fallback to targeted queries if full collection read is restricted
      for (const [field, value] of [
        ["role", "driver"],
        ["isDriver", true],
        ["isAuthorized", true],
        ["isAuthorizedDriver", true],
      ] as const) {
        try {
          const { query, where } = await import("firebase/firestore")
          const snap = await getDocs(query(collection(db, "users"), where(field, "==", value)))
          snap.forEach((d) => {
            const data = d.data()
            if (recordGrantsDriverRole(data)) {
              addPhone(extractAnyPhone(data) || d.id)
            }
          })
        } catch {
          // Skip
        }
      }
    }
  } catch {
    // Firebase unavailable
  }
}

// Auto-sync once per page load so registered drivers are known at login time.
if (typeof window !== "undefined") {
  setTimeout(() => {
    void syncAuthorizedDriverPhonesFromFirebase()
  }, 0)
}
