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
  const driversRef = ref(rtdb, "drivers")

  const unsubscribe = onValue(driversRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const driversData = snapshot.val()
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
        if (data.location) {
          drivers.push({
            phone,
            line: usersMap.get(phone) || "Unknown",
            location: data.location,
          })
        }
      }

      callback(drivers)
    } catch (error) {
      console.error("[v0] Error fetching drivers:", error)
      callback(drivers)
    }
  })

  return unsubscribe
}

// Send money to driver
export async function sendMoneyToDriver(
  driverPhone: string,
  amount: number,
  adminMessage: string = "Admin transfer"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize phone number to "0XXXXXXXXX" format (matching Firestore Phone field)
    const normalizedPhone = driverPhone.startsWith("+213")
      ? "0" + driverPhone.slice(4)
      : driverPhone

    // Find driver user document by phone
    const usersQuery = query(collection(db, "users"), where("Phone", "==", normalizedPhone))
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
