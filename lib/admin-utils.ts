import { db, rtdb } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  getDocs,
  where,
  runTransaction,
} from "firebase/firestore"
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
