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

// Fetch all active drivers with their locations
export async function fetchActiveDrivers(callback: (drivers: ActiveDriver[]) => void) {
  try {
    console.log("[v0] Starting fetchActiveDrivers")
    const driversRef = ref(rtdb, "drivers")
    console.log("[v0] Created reference to drivers:", driversRef)

    const unsubscribe = onValue(
      driversRef,
      async (snapshot) => {
        console.log("[v0] onValue callback fired")
        console.log("[v0] Snapshot exists:", snapshot.exists())

        if (!snapshot.exists()) {
          console.log("[v0] No drivers data in Realtime Database")
          callback([])
          return
        }

        const driversData = snapshot.val()
        console.log("[v0] Raw drivers data:", driversData)
        const drivers: ActiveDriver[] = []

        // Get all users to map phone numbers to bus lines
        try {
          const usersSnapshot = await getDocs(collection(db, "users"))
          const usersMap = new Map()

          usersSnapshot.forEach((doc) => {
            usersMap.set(doc.data().phone, doc.data().line || "Unknown")
          })

          // Process drivers data
          for (const [phone, driverData] of Object.entries(driversData)) {
            const data = driverData as any
            console.log(`[v0] Processing driver ${phone}:`, data)
            
            // Check if location exists and has lat/lng
            if (data && data.location && typeof data.location.lat === "number" && typeof data.location.lng === "number") {
              drivers.push({
                phone,
                line: usersMap.get(phone) || "Unknown",
                location: {
                  lat: data.location.lat,
                  lng: data.location.lng,
                },
              })
              console.log(`[v0] Added driver ${phone} with location:`, data.location)
            } else {
              console.log(`[v0] Driver ${phone} has no valid location`)
            }
          }

          console.log(`[v0] Total active drivers: ${drivers.length}`)
          callback(drivers)
        } catch (error) {
          console.error("[v0] Error processing drivers:", error)
          callback(drivers)
        }
      },
      (error) => {
        console.error("[v0] Firebase onValue error:", error)
        console.error("[v0] Error code:", error.code)
        console.error("[v0] Error message:", error.message)
      }
    )

    return unsubscribe
  } catch (error) {
    console.error("[v0] Error in fetchActiveDrivers setup:", error)
    // Return a dummy unsubscribe function
    return () => {}
  }
}

// Send money to driver
export async function sendMoneyToDriver(
  driverPhone: string,
  amount: number,
  adminMessage: string = "Admin transfer"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find driver user document by phone
    const usersQuery = query(collection(db, "users"), where("phone", "==", driverPhone))
    const usersSnapshot = await getDocs(usersQuery)

    if (usersSnapshot.empty) {
      return { success: false, error: "Driver not found" }
    }

    const driverDoc = usersSnapshot.docs[0]
    const driverId = driverDoc.id
    const currentBalance = driverDoc.data().balance || 0

    // Update driver balance
    await updateDoc(doc(db, "users", driverId), {
      balance: increment(amount),
    })

    // Record transaction
    await addDoc(collection(db, "transactions"), {
      userId: driverId,
      type: "admin_transfer",
      amount: amount,
      previousBalance: currentBalance,
      newBalance: currentBalance + amount,
      timestamp: serverTimestamp(),
      status: "completed",
      adminMessage: adminMessage,
      driverPhone: driverPhone,
    })

    return { success: true }
  } catch (error) {
    console.error("[v0] Error sending money to driver:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Fetch recent transactions
export function fetchRecentTransactions(
  callback: (transactions: Transaction[]) => void,
  limitCount: number = 50
) {
  const transactionsQuery = query(
    collection(db, "transactions"),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  )

  const unsubscribe = onSnapshot(transactionsQuery, async (snapshot) => {
    const transactions: Transaction[] = []

    // Get users map for names
    const usersSnapshot = await getDocs(collection(db, "users"))
    const usersMap = new Map()

    usersSnapshot.forEach((doc) => {
      usersMap.set(doc.id, doc.data().name || "Unknown")
    })

    snapshot.forEach((doc) => {
      const data = doc.data()
      transactions.push({
        id: doc.id,
        timestamp: data.timestamp,
        userId: data.userId,
        userName: usersMap.get(data.userId),
        type: data.type,
        amount: data.amount || 0,
        status: data.status || "pending",
        driverPhone: data.driverPhone,
        previousBalance: data.previousBalance,
        newBalance: data.newBalance,
      })
    })

    callback(transactions)
  })

  return unsubscribe
}

// Get all drivers for dropdown
export async function getAllDrivers(): Promise<
  Array<{ phone: string; name: string; balance: number }>
> {
  try {
    const usersSnapshot = await getDocs(
      query(collection(db, "users"), where("isDriver", "==", true))
    )

    const drivers: Array<{ phone: string; name: string; balance: number }> = []

    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      drivers.push({
        phone: data.phone,
        name: data.name || data.phone,
        balance: data.balance || 0,
      })
    })

    return drivers
  } catch (error) {
    console.error("[v0] Error fetching drivers:", error)
    return []
  }
}
