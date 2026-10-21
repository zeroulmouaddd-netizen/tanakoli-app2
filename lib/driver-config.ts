// Hardcoded list of phone numbers authorized to access Driver Mode.
// Format: E.164  (+213XXXXXXXXX — leading 0 replaced by +213)
// To add a driver: append their E.164 number to this set.
//
// The hardcoded set is only the baseline. Driver phones registered from the
// Admin Dashboard ("Add Driver") are stored in Firebase with authorized-driver
// privileges and are recognised through the registry below — so the app picks
// them up immediately upon login without a code change.
export const AUTHORIZED_DRIVER_PHONES = new Set<string>([
  "+213775453629",
])

// ─── Firebase-backed authorized driver registry ──────────────────────────────
// Mirrors driver phones registered in Firebase (drivers / users collections)
// so `isAuthorizedDriverPhone` can recognise them at login time.

const AUTHORIZED_DRIVERS_CACHE_KEY = "tanakoli_authorized_driver_phones"
// Session cache owned by driver-mode-context. Cleared when a new authorized
// phone appears so a freshly registered driver is recognised without re-login.
const DRIVER_AUTH_SESSION_KEY = "tanakoli_is_driver"

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

/** Register an E.164 phone as an authorized driver for this device/session. */
export function registerAuthorizedDriverPhone(e164Phone: string | null | undefined): void {
  if (!e164Phone) return
  const e164 = e164Phone.trim()
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

/** Normalise any phone format to E.164 "+213XXXXXXXXX" */
function toE164(phone: string): string {
  const s = (phone || "").trim().replace(/[^\d+]/g, "")
  if (!s) return ""
  if (s.startsWith("+213")) return "+213" + s.slice(4)
  if (s.startsWith("213") && s.length === 12) return "+" + s
  if (s.startsWith("0") && s.length === 10) return "+213" + s.slice(1)
  return s.startsWith("+") ? s : ""
}

/** Normalise any phone format to local "0XXXXXXXXX" */
function toLocalPhone(phone: string): string {
  const s = (phone || "").trim().replace(/[^\d+]/g, "")
  if (!s) return ""
  if (s.startsWith("+213")) return "0" + s.slice(4)
  if (s.startsWith("213") && s.length === 12) return "0" + s.slice(3)
  return s
}

export function isAuthorizedDriverPhone(e164Phone: string | null | undefined): boolean {
  if (!e164Phone) return false
  return AUTHORIZED_DRIVER_PHONES.has(e164Phone) || firebaseAuthorizedPhones.has(e164Phone)
}

// ─── Firebase identification ────────────────────────────────────────────────

/** Return true when a driver/users record carries authorized driver privileges. */
function recordGrantsDriverRole(data: Record<string, any> | undefined | null): boolean {
  if (!data) return false
  return (
    data.isAuthorized === true ||
    data.isAuthorizedDriver === true ||
    data.authorized === true ||
    data.isDriver === true ||
    data.role === "driver"
  )
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

  const local = toLocalPhone(phone)
  try {
    const { db } = await import("@/lib/firebase")
    const { doc, getDoc } = await import("firebase/firestore")

    // 1. drivers collection — doc id may be local or E.164 phone
    for (const id of [local, e164]) {
      if (!id) continue
      try {
        const snap = await getDoc(doc(db, "drivers", id))
        if (snap.exists() && recordGrantsDriverRole(snap.data())) {
          registerAuthorizedDriverPhone(e164)
          return true
        }
      } catch {
        // drivers collection may not exist yet
      }
    }

    // 2. users collection — doc id convention is "0XXXXXXXXX"
    if (local) {
      try {
        const snap = await getDoc(doc(db, "users", local))
        if (snap.exists() && recordGrantsDriverRole(snap.data())) {
          registerAuthorizedDriverPhone(e164)
          return true
        }
      } catch {
        // Ignore lookup errors — fall through to "not authorized"
      }
    }
  } catch {
    // Firebase unavailable — keep the hardcoded whitelist as the only source
  }
  return false
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
        if (recordGrantsDriverRole(data)) {
          addPhone(data.phoneE164 || data.phone || data.Phone || data.phoneNumber || d.id)
        }
      })
    } catch {
      // drivers collection may not exist yet
    }

    // users collection — accounts flagged as drivers (targeted queries)
    for (const [field, value] of [["role", "driver"], ["isDriver", true], ["isAuthorized", true], ["isAuthorizedDriver", true]] as const) {
      try {
        const { query, where } = await import("firebase/firestore")
        const snap = await getDocs(query(collection(db, "users"), where(field, "==", value)))
        snap.forEach((d) => {
          const data = d.data()
          if (recordGrantsDriverRole(data)) {
            addPhone(data.phoneE164 || data.phone || data.Phone || data.phoneNumber || data.mobile || d.id)
          }
        })
      } catch {
        // Query may be rejected by rules — skip this strategy
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
