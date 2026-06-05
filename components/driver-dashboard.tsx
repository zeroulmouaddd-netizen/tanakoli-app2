"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  QrCode, 
  LogOut, 
  Camera, 
  X, 
  Check, 
  AlertCircle, 
  Bus,
  Wallet,
  ScanLine,
  Loader2,
  RotateCcw,
  PlusCircle,
  Banknote,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  MapPin
} from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, getDoc, doc, updateDoc, increment, addDoc, serverTimestamp, orderBy, limit, onSnapshot, Timestamp, runTransaction } from "firebase/firestore"
import { addNotification, LOW_BALANCE_THRESHOLD } from "@/lib/notifications"
import { useDriverMode } from "@/lib/driver-mode-context"
import { useAuth } from "@/lib/auth-context"
import { useDriverLocationTracking } from "@/hooks/use-driver-location-tracking"
import { BrowserMultiFormatReader } from "@zxing/browser"

const FARE_OPTIONS = [
  { amount: 20, label: "20 د.ج", description: "داخل المدينة" },
  { amount: 30, label: "30 د.ج", description: "ضواحي" },
  { amount: 50, label: "50 د.ج", description: "بين المدن" },
]

interface ScanResult {
  success: boolean
  passengerName?: string
  newBalance?: number
  amount?: number
  message?: string
  isRecharge?: boolean
  rawData?: string
  parsedData?: Record<string, unknown>
  error?: string
}

type ScanMode = "deduction" | "recharge"

// Preset recharge amounts
const RECHARGE_PRESETS = [100, 200, 500, 1000]

// Transaction interface for history
interface Transaction {
  id: string
  type: "fare_deduction" | "balance_recharge"
  amount: number
  passengerName: string
  driverTimestamp: Timestamp
  newBalance: number
}

interface DailyStats {
  total: number
  trips: number
  date: string
}

const STORAGE_KEY = "driver_daily_stats"

// Get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Load stats from localStorage, reset if it's a new day
function loadDailyStats(): DailyStats {
  if (typeof window === 'undefined') {
    return { total: 0, trips: 0, date: getTodayDate() }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const stats: DailyStats = JSON.parse(stored)
      // Check if it's still today
      if (stats.date === getTodayDate()) {
        return stats
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  // Return fresh stats for new day
  return { total: 0, trips: 0, date: getTodayDate() }
}

// Save stats to localStorage
function saveDailyStats(stats: DailyStats): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Ignore storage errors
  }
}

export function DriverDashboard() {
  const { exitDriverMode } = useDriverMode()
  const { currentUser, firestoreUserId } = useAuth()
  const [selectedFare, setSelectedFare] = useState(30)
  const [isScanning, setIsScanning] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dailyStats, setDailyStats] = useState<DailyStats>({ total: 0, trips: 0, date: getTodayDate() })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isLocationTracking, setIsLocationTracking] = useState(false)
  
  // Recharge mode state
  const [scanMode, setScanMode] = useState<ScanMode>("deduction")
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState<string>("")
  const [isAuthorizedDriver, setIsAuthorizedDriver] = useState(true) // TODO: Check from Firebase auth
  
  // Transaction history state
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Ref-based flag so the scanLoop closure always reads the current value,
  // not a stale snapshot captured at the time the closure was created.
  const isScanningRef = useRef(false)

  // Initialize location tracking for driver
  useDriverLocationTracking(currentUser?.phoneNumber || null, true)

  // Stop scanner helper (defined early for cleanup)
  const stopScanner = useCallback(() => {
    // Signal the scanLoop to exit before touching the stream
    isScanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (readerRef.current) {
      try { readerRef.current.reset() } catch {}
      readerRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraReady(false)
    setIsScanning(false)
  }, [])

  // Load stats on mount
  useEffect(() => {
    const stats = loadDailyStats()
    setDailyStats(stats)
  }, [])

  // Real-time transaction history listener
  useEffect(() => {
    const transactionsRef = collection(db, "transactions")
    const q = query(
      transactionsRef,
      orderBy("driverTimestamp", "desc"),
      limit(10)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions: Transaction[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: doc.data().type,
        amount: doc.data().amount,
        passengerName: doc.data().passengerName,
        driverTimestamp: doc.data().driverTimestamp,
        newBalance: doc.data().newBalance
      }))
      setRecentTransactions(transactions)
    }, (error) => {
      console.error("Error fetching transactions:", error)
    })

    return () => unsubscribe()
  }, [])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  // Update stats helper
  const updateStats = useCallback((amount: number) => {
    setDailyStats(prev => {
      const newStats = {
        total: prev.total + amount,
        trips: prev.trips + 1,
        date: getTodayDate()
      }
      saveDailyStats(newStats)
      return newStats
    })
  }, [])

  // Reset daily stats
  const handleResetStats = useCallback(() => {
    const freshStats = { total: 0, trips: 0, date: getTodayDate() }
    setDailyStats(freshStats)
    saveDailyStats(freshStats)
    setShowResetConfirm(false)
  }, [])

  // Handle recharge button click
  const handleRechargeClick = () => {
    setShowRechargeModal(true)
    setRechargeAmount("")
  }

  // Start recharge scan after entering amount
  const handleStartRechargeScan = () => {
    const amount = parseInt(rechargeAmount)
    if (!amount || amount <= 0) return
    
    setShowRechargeModal(false)
    setScanMode("recharge")
    startScanner("recharge", rechargeAmount)
  }

  // Handle preset amount selection
  const handlePresetClick = (amount: number) => {
    setRechargeAmount(amount.toString())
  }

  const startScanner = async (mode: ScanMode = "deduction", currentRechargeAmount: string = "") => {
    setScanMode(mode)
    isScanningRef.current = true
    setIsScanning(true)
    setScanResult(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCameraReady(true)
      }

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      // Start continuous scanning with frame capture.
      // mode and currentRechargeAmount are captured from the function parameters
      // (not from state) so they never go stale across async frames.
      const scanLoop = async () => {
        if (!isScanningRef.current || !videoRef.current || !streamRef.current) {
          return
        }

        try {
          const videoWidth = videoRef.current.videoWidth
          const videoHeight = videoRef.current.videoHeight

          // Skip this frame if video dimensions aren't ready yet
          if (!videoWidth || !videoHeight) {
            if (isScanningRef.current && streamRef.current) {
              requestAnimationFrame(scanLoop)
            }
            return
          }

          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) {
            if (isScanningRef.current && streamRef.current) {
              requestAnimationFrame(scanLoop)
            }
            return
          }

          canvas.width = videoWidth
          canvas.height = videoHeight
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

          try {
            const result = reader.decodeFromCanvas(canvas)
            // getText() can return null in some WebView environments — guard it
            const text = result?.getText?.() ?? null
            if (text && typeof text === "string" && text.length > 0) {
              console.log("[Scanner] QR code detected:", text)
              await processQRCode(text, mode, currentRechargeAmount)
              return
            }
          } catch {
            // No QR code found in this frame — continue scanning
          }

          if (isScanningRef.current && streamRef.current) {
            requestAnimationFrame(scanLoop)
          }
        } catch (error) {
          console.error("[Scanner] Frame capture error:", error)
          if (isScanningRef.current && streamRef.current) {
            requestAnimationFrame(scanLoop)
          }
        }
      }

      requestAnimationFrame(scanLoop)

    } catch (error) {
      console.error("[Scanner] Camera error:", error)
      setScanResult({
        success: false,
        message: "تعذر الوصول إلى الكاميرا"
      })
      stopScanner()
    }
  }

  const processQRCode = async (qrData: string | null | undefined, mode: ScanMode, currentRechargeAmount: string) => {
    // Guard: reject null/non-string input immediately — avoids indexOf crash
    if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
      console.warn("[Scanner] processQRCode called with empty/null data — ignoring")
      return
    }

    stopScanner()
    setIsProcessing(true)

    try {
      console.log("[Scanner] Raw QR Data:", qrData)

      let parsedData: Record<string, unknown>
      try {
        parsedData = JSON.parse(qrData)
        console.log("[v0] Parsed QR Data:", parsedData)
      } catch (parseError) {
        console.error("[v0] QR Parse Error:", parseError)
        setScanResult({
          success: false,
          message: "فشل في قراءة رمز QR - صيغة غير صحيحة",
          rawData: qrData,
          error: `Parse error: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
        })
        setIsProcessing(false)
        return
      }

      const { userId, phone, name, type } = parsedData

      console.log("[v0] QR Type:", type, "User ID:", userId, "Phone:", phone)

      if (!userId && !phone) {
        setScanResult({
          success: false,
          message: "رمز QR غير صالح - بيانات المستخدم مفقودة",
          rawData: qrData,
          parsedData,
          error: "Missing userId and phone in QR data"
        })
        setIsProcessing(false)
        return
      }

      // Find user in Firestore by phone number or userId
      const usersRef = collection(db, "users")
      let userDoc = null
      let userDocId = ""

      if (userId) {
        // First: try to find by Phone field matching userId value
        const phoneSnap = await getDocs(query(usersRef, where("Phone", "==", userId)))
        if (!phoneSnap.empty) {
          userDoc = phoneSnap.docs[0]
          userDocId = userDoc.id
          console.log("[v0] Found user by Phone/userId:", userDocId)
        } else {
          // Fallback: treat userId as the Firestore document ID and fetch directly
          userDocId = userId as string
          const directSnap = await getDoc(doc(db, "users", userDocId))
          if (directSnap.exists()) {
            userDoc = directSnap
            console.log("[v0] Found user by doc ID:", userDocId)
          }
        }
      } else if (phone) {
        // Search by phone number field
        const q = query(usersRef, where("Phone", "==", phone))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0]
          userDocId = userDoc.id
          console.log("[v0] Found user by phone:", userDocId)
        } else {
          // Also try fetching by phone as doc ID
          userDocId = phone as string
          const directSnap = await getDoc(doc(db, "users", userDocId))
          if (directSnap.exists()) {
            userDoc = directSnap
            console.log("[v0] Found user by phone as doc ID:", userDocId)
          }
        }
      }

      if (!userDocId || !userDoc) {
        setScanResult({
          success: false,
          message: "المستخدم غير موجود - تحقق من رمز QR",
          rawData: qrData,
          parsedData,
          error: "User not found in database"
        })
        setIsProcessing(false)
        return
      }

      // Get user data
      const userData = userDoc.data()
      const currentBalance = userData?.balance ?? 0
      const userDocRef = doc(db, "users", userDocId)
      const passengerName = userData?.fullName || name || "راكب"

      console.log("[v0] Current balance:", currentBalance, "Passenger:", passengerName)

      if (mode === "recharge") {
        // RECHARGE MODE: Add balance to passenger, deduct from driver
        const rechargeAmountNum = parseInt(currentRechargeAmount)
        if (!rechargeAmountNum || rechargeAmountNum <= 0) {
          setScanResult({
            success: false,
            message: "مبلغ الشحن غير صالح - تحقق من المبلغ المدخل",
            rawData: qrData,
            parsedData,
            error: "Invalid recharge amount"
          })
          setIsProcessing(false)
          return
        }

        // Check if driver is authenticated
        if (!firestoreUserId) {
          setScanResult({
            success: false,
            message: "خطأ في التحقق من الهوية - أعد تسجيل الدخول",
            rawData: qrData,
            parsedData,
            error: "Driver not authenticated"
          })
          setIsProcessing(false)
          return
        }

        // Atomically read both balances, validate, and write in a single Firestore transaction
        const driverDocRef = doc(db, "users", firestoreUserId)
        let newPassengerBalance = 0
        let newDriverBalance = 0
        let insufficientBalance = false
        let insufficientAmount = 0

        try {
          await runTransaction(db, async (transaction) => {
            const driverSnap = await transaction.get(driverDocRef)
            const passengerSnap = await transaction.get(userDocRef)

            const currentDriverBalance = driverSnap.data()?.balance ?? 0
            const currentPassengerBalance = passengerSnap.data()?.balance ?? 0

            console.log("[v0] Driver balance (inside tx):", currentDriverBalance)

            if (currentDriverBalance < rechargeAmountNum) {
              // Signal the insufficient-balance case before aborting the transaction
              insufficientBalance = true
              insufficientAmount = currentDriverBalance
              throw new Error("ABORT_INSUFFICIENT_BALANCE")
            }

            newPassengerBalance = currentPassengerBalance + rechargeAmountNum
            newDriverBalance = currentDriverBalance - rechargeAmountNum

            console.log("[v0] Recharge: Passenger", currentPassengerBalance, "→", newPassengerBalance)
            console.log("[v0] Recharge: Driver", currentDriverBalance, "→", newDriverBalance)

            // Both balance updates happen atomically
            transaction.update(userDocRef, { balance: increment(rechargeAmountNum) })
            transaction.update(driverDocRef, { balance: increment(-rechargeAmountNum) })

            // Transaction log is also part of the same atomic write
            const txRef = doc(collection(db, "transactions"))
            transaction.set(txRef, {
              userId: userDocId,
              driverId: firestoreUserId,
              type: "balance_recharge",
              amount: rechargeAmountNum,
              previousBalance: currentPassengerBalance,
              newBalance: newPassengerBalance,
              driverPreviousBalance: currentDriverBalance,
              driverNewBalance: newDriverBalance,
              driverTimestamp: serverTimestamp(),
              passengerName: passengerName,
              status: "completed"
            })
          })
        } catch (txError) {
          if (insufficientBalance) {
            setScanResult({
              success: false,
              message: `رصيد غير كافٍ (لديك ${insufficientAmount} د.ج)`,
              rawData: qrData,
              parsedData,
              error: `Insufficient balance: ${insufficientAmount} < ${rechargeAmountNum}`
            })
            setIsProcessing(false)
            return
          }
          throw txError
        }

        // Notify passenger: recharge received
        await addNotification(userDocId, "recharge", `تم شحن رصيدك بمبلغ ${rechargeAmountNum} د.ج`, rechargeAmountNum)

        // Success!
        setScanResult({
          success: true,
          passengerName: passengerName,
          newBalance: newPassengerBalance,
          amount: rechargeAmountNum,
          message: "تم الشحن بنجاح",
          isRecharge: true,
          rawData: qrData,
          parsedData
        })

        console.log("[v0] Recharge successful")

        // Reset recharge amount
        setRechargeAmount("")
        setScanMode("deduction")

      } else {
        // DEDUCTION MODE: Subtract balance
        if (currentBalance < selectedFare) {
          setScanResult({
            success: false,
            message: `رصيد غير كافٍ (${currentBalance} د.ج) - المطلوب ${selectedFare} د.ج`,
            rawData: qrData,
            parsedData,
            error: `Insufficient balance: ${currentBalance} < ${selectedFare}`
          })
          setIsProcessing(false)
          return
        }

        // Calculate new balance
        const newBalance = currentBalance - selectedFare

        console.log("[v0] Deduction: Balance", currentBalance, "→", newBalance)

        // Deduct fare from balance
        await updateDoc(userDocRef, {
          balance: increment(-selectedFare)
        })

        // Record the transaction for passenger notification
        try {
          await addDoc(collection(db, "transactions"), {
            userId: userDocId,
            type: "fare_deduction",
            amount: selectedFare,
            previousBalance: currentBalance,
            newBalance: newBalance,
            driverTimestamp: serverTimestamp(),
            passengerName: passengerName,
            status: "completed"
          })
          console.log("[v0] Transaction logged successfully")
        } catch {
          // Transaction logging failed, but payment still went through
        }

        // Notify driver: payment received confirmation
        if (firestoreUserId) {
          await addNotification(firestoreUserId, "payment", `تم دفع أجرة بمبلغ ${selectedFare} د.ج`, selectedFare)
        }
        // Notify passenger if balance is now low
        if (newBalance < LOW_BALANCE_THRESHOLD) {
          await addNotification(userDocId, "low_balance", "رصيدك منخفض، يرجى الشحن")
        }

        // Success!
        setScanResult({
          success: true,
          passengerName: passengerName,
          newBalance: newBalance,
          amount: selectedFare,
          message: "تم الخصم بنجاح",
          isRecharge: false,
          rawData: qrData,
          parsedData
        })

        console.log("[v0] Deduction successful")

        // Update driver stats
        updateStats(selectedFare)
      }

    } catch (error) {
      console.error("[v0] Processing error:", error)
      setScanResult({
        success: false,
        message: "خطأ في معالجة الدفع - حاول مرة أخرى",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCloseResult = () => {
    setScanResult(null)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary flex-shrink-0">
              <Bus className="h-4 sm:h-5 w-4 sm:w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white">وضع السائق</h1>
              <p className="text-xs text-slate-400">Driver Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Location tracking status */}
            <div className="flex items-center gap-1.5 rounded-lg bg-green-500/20 px-2.5 sm:px-3 py-1.5 sm:py-2">
              <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">تتبع مباشر</span>
              <span className="text-xs text-green-400/70">Live</span>
            </div>
            <button
              onClick={exitDriverMode}
              className="flex items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl bg-red-500/20 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 flex-shrink-0"
            >
              <LogOut className="h-3 sm:h-4 w-3 sm:w-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-4 md:px-6 pt-16 sm:pt-20 pb-6 sm:pb-8">
        {/* Stats Card */}
        <motion.div
          className="mb-4 sm:mb-6 rounded-lg sm:rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 sm:p-5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 sm:h-5 w-4 sm:w-5 text-primary-foreground" />
              <span className="text-xs sm:text-sm font-medium text-primary-foreground/90">إحصائيات اليوم</span>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-2 py-1 text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/20 flex-shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">إعادة تعيين</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="rounded-lg sm:rounded-xl bg-primary-foreground/10 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-primary-foreground/80">المبلغ الكلي</p>
              <p className="text-lg sm:text-2xl font-bold text-primary-foreground" dir="ltr">
                {dailyStats.total.toLocaleString("ar-DZ")} <span className="text-xs sm:text-sm">د.ج</span>
              </p>
            </div>
            <div className="rounded-lg sm:rounded-xl bg-primary-foreground/10 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-primary-foreground/80">عدد الرحلات</p>
              <p className="text-lg sm:text-2xl font-bold text-primary-foreground">
                {dailyStats.trips}
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-primary-foreground/60">
            يتم إعادة التعيين تلقائياً كل يوم في منتصف الليل
          </p>
        </motion.div>

        {/* Fare Selector */}
        <motion.div
          className="mb-4 sm:mb-6 rounded-lg sm:rounded-2xl bg-slate-800 p-4 sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg font-bold text-white">
            <Wallet className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            سعر الرحلة
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {FARE_OPTIONS.map((fare) => (
              <button
                key={fare.amount}
                onClick={() => setSelectedFare(fare.amount)}
                className={`rounded-lg sm:rounded-xl p-2 sm:p-4 text-center transition-all ${
                  selectedFare === fare.amount
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-slate-800"
                    : "bg-slate-700 text-white hover:bg-slate-600"
                }`}
              >
                <p className="text-base sm:text-xl font-bold">{fare.amount}</p>
                <p className="text-xs opacity-80">د.ج</p>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[10px] opacity-60 truncate">{fare.description}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* QR Scanner Button */}
        <motion.div
          className="mb-3 sm:mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => startScanner("deduction")}
            disabled={isScanning || isProcessing}
            className="flex w-full flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 rounded-lg sm:rounded-2xl bg-primary py-4 sm:py-6 font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            <div className="flex h-12 sm:h-14 w-12 sm:w-14 items-center justify-center rounded-lg sm:rounded-xl bg-primary-foreground/20 flex-shrink-0">
              <QrCode className="h-6 sm:h-8 w-6 sm:w-8" />
            </div>
            <div className="text-right">
              <p className="text-base sm:text-xl">مسح رمز الدفع</p>
              <p className="text-xs sm:text-sm opacity-80">Scan QR Code</p>
            </div>
          </button>
        </motion.div>

        {/* Recharge Button - Only visible to authorized drivers */}
        {isAuthorizedDriver && (
          <motion.div
            className="mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <button
              onClick={handleRechargeClick}
              disabled={isScanning || isProcessing}
              className="flex w-full flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 rounded-lg sm:rounded-2xl bg-blue-600 py-4 sm:py-5 font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 flex-shrink-0">
                <PlusCircle className="h-6 sm:h-7 w-6 sm:w-7" />
              </div>
              <div className="text-right">
                <p className="text-base sm:text-lg">شحن رصيد للمسافر</p>
                <p className="text-xs sm:text-xs opacity-80">Mobile Recharge</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Recent Transactions Section */}
        <motion.div
          className="mb-4 sm:mb-6 rounded-lg sm:rounded-2xl bg-slate-800 p-4 sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-3 sm:mb-4 flex items-center gap-2">
            <History className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-white">سجل العمليات الأخير</h2>
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-slate-400">
              <History className="mb-2 h-8 sm:h-10 w-8 sm:w-10 opacity-50" />
              <p className="text-xs sm:text-sm">لا توجد عمليات بعد</p>
            </div>
          ) : (
            <div className="max-h-[300px] space-y-1 sm:space-y-2 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {recentTransactions.map((transaction, index) => {
                const isRecharge = transaction.type === "balance_recharge"
                const timestamp = transaction.driverTimestamp?.toDate?.()
                const timeString = timestamp 
                  ? timestamp.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
                  : "--:--"
                
                return (
                  <motion.div
                    key={transaction.id}
                    className="flex items-center gap-2 sm:gap-3 rounded-lg bg-slate-700/50 p-2 sm:p-3 text-xs sm:text-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isRecharge ? "bg-green-500/20" : "bg-red-500/20"
                    }`}>
                      {isRecharge ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-white">
                        {transaction.passengerName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isRecharge ? "شحن رصيد" : "خصم أجرة"} • {timeString}
                      </p>
                    </div>
                    
                    {/* Amount */}
                    <div className={`text-left font-bold ${
                      isRecharge ? "text-green-400" : "text-red-400"
                    }`}>
                      {isRecharge ? "+" : "-"}{transaction.amount} د.ج
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          className="rounded-2xl bg-slate-800/50 p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h3 className="mb-3 font-bold text-white">كيفية الاستخدام</h3>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</span>
              <span>اختر سعر الرحلة المناسب</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">2</span>
              <span>اضغط على زر المسح</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</span>
              <span>امسح رمز QR الخاص بالراكب</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">4</span>
              <span>سيتم خصم المبلغ تلقائياً</span>
            </li>
          </ol>
        </motion.div>
      </main>

      {/* Scanner Modal */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Close button */}
            <button
              onClick={stopScanner}
              className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Camera View */}
            <div className="relative h-full w-full">
              {/* Loading indicator — visible while stream isn't playing yet */}
              {!isCameraReady && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-primary" />
                  <span className="text-sm text-white/60">جاري تشغيل الكاميرا…</span>
                </div>
              )}
              <video
                ref={videoRef}
                className="h-full w-full object-cover transition-opacity duration-300"
                style={{ opacity: isCameraReady ? 1 : 0 }}
                autoPlay
                playsInline
                muted
              />
              
              {/* Scan Frame */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-64 w-64">
                  {/* Corner markers */}
                  <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-primary" />
                  <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-primary" />
                  <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-primary" />
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-primary" />
                  
                  {/* Scan line animation */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_20px_4px_rgba(0,166,81,0.6)]"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <div className="mx-auto flex items-center justify-center gap-2 rounded-full bg-black/60 px-6 py-3 backdrop-blur-sm">
                  <ScanLine className="h-5 w-5 text-primary" />
                  <span className="text-white">وجّه الكاميرا نحو رمز QR</span>
                </div>
              </div>

              {/* Selected amount badge */}
              <div className="absolute bottom-36 left-0 right-0 flex justify-center">
                <div className={`rounded-full px-6 py-2 ${scanMode === "recharge" ? "bg-blue-500" : "bg-primary"}`}>
                  <span className="font-bold text-white">
                    {scanMode === "recharge" 
                      ? `شحن: ${rechargeAmount} د.ج` 
                      : `خصم: ${selectedFare} د.ج`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium text-white">جاري معالجة الدفع...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseResult}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <motion.div
              className={`relative w-full max-w-sm overflow-hidden rounded-3xl ${
                scanResult.success
                  ? scanResult.isRecharge
                    ? "bg-gradient-to-br from-[#0f2557] via-[#1a3a8f] to-[#0d1f4a]"
                    : "bg-gradient-to-br from-[#0a3320] via-[#0f5132] to-[#072b1a]"
                  : "bg-gradient-to-br from-[#3b0a0a] via-[#7f1d1d] to-[#450a0a]"
              }`}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle top shimmer line */}
              <div className={`absolute inset-x-0 top-0 h-px ${
                scanResult.success
                  ? scanResult.isRecharge
                    ? "bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
                    : "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
                  : "bg-gradient-to-r from-transparent via-red-400/60 to-transparent"
              }`} />

              <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center text-white">

                {/* Icon with pulse ring */}
                <div className="relative mb-6">
                  {scanResult.success && (
                    <motion.div
                      className={`absolute inset-0 rounded-full ${
                        scanResult.isRecharge ? "bg-blue-400/30" : "bg-emerald-400/30"
                      }`}
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.4 }}
                    />
                  )}
                  <motion.div
                    className={`relative flex h-24 w-24 items-center justify-center rounded-full ${
                      scanResult.success
                        ? scanResult.isRecharge
                          ? "bg-blue-500/30 ring-2 ring-blue-400/50"
                          : "bg-emerald-500/30 ring-2 ring-emerald-400/50"
                        : "bg-red-500/30 ring-2 ring-red-400/50"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.05 }}
                  >
                    {scanResult.success ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
                      >
                        <Check
                          className={`h-12 w-12 ${
                            scanResult.isRecharge ? "text-blue-300" : "text-emerald-300"
                          }`}
                          strokeWidth={3}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
                      >
                        <AlertCircle className="h-12 w-12 text-red-300" strokeWidth={2.5} />
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                {/* Title */}
                <motion.h2
                  className="mb-1 text-2xl font-bold tracking-tight"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.35 }}
                >
                  {scanResult.success
                    ? scanResult.isRecharge ? "تم الشحن بنجاح" : "تم الخصم بنجاح"
                    : "فشلت العملية"}
                </motion.h2>

                {scanResult.success ? (
                  <>
                    {/* Passenger name */}
                    <motion.p
                      className="mb-6 text-base font-medium text-white/60 tracking-wide"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.32, duration: 0.3 }}
                    >
                      {scanResult.passengerName}
                    </motion.p>

                    {/* Amount card */}
                    <motion.div
                      className={`mb-4 w-full rounded-2xl px-6 py-5 ${
                        scanResult.isRecharge
                          ? "bg-blue-500/20 ring-1 ring-blue-400/20"
                          : "bg-emerald-500/20 ring-1 ring-emerald-400/20"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.42, duration: 0.3 }}
                    >
                      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">
                        {scanResult.isRecharge ? "المبلغ المشحون" : "المبلغ المخصوم"}
                      </p>
                      <p
                        className={`text-5xl font-extrabold tabular-nums ${
                          scanResult.isRecharge
                            ? "text-blue-200 drop-shadow-[0_0_18px_rgba(147,197,253,0.45)]"
                            : "text-emerald-200 drop-shadow-[0_0_18px_rgba(110,231,183,0.45)]"
                        }`}
                        dir="ltr"
                      >
                        {scanResult.amount}
                        <span className="ml-1 text-2xl font-semibold opacity-70">د.ج</span>
                      </p>
                    </motion.div>

                    {/* New balance */}
                    <motion.div
                      className="mb-8 flex items-center gap-2 rounded-xl bg-white/5 px-5 py-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.52, duration: 0.3 }}
                    >
                      <span className="text-sm text-white/40">الرصيد الجديد للراكب</span>
                      <span className="text-base font-semibold text-white/80" dir="ltr">
                        {scanResult.newBalance?.toLocaleString("ar-DZ")} د.ج
                      </span>
                    </motion.div>
                  </>
                ) : (
                  <motion.p
                    className="mb-8 mt-3 text-base leading-relaxed text-white/60"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.3 }}
                  >
                    {scanResult.message}
                  </motion.p>
                )}

                {/* Close pill button */}
                <motion.button
                  onClick={handleCloseResult}
                  className={`w-full rounded-full py-4 text-base font-semibold tracking-wide transition-all ${
                    scanResult.success
                      ? scanResult.isRecharge
                        ? "bg-blue-500/25 text-blue-200 hover:bg-blue-500/40 ring-1 ring-blue-400/30"
                        : "bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/40 ring-1 ring-emerald-400/30"
                      : "bg-red-500/25 text-red-200 hover:bg-red-500/40 ring-1 ring-red-400/30"
                  }`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: scanResult.success ? 0.6 : 0.34, duration: 0.3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  إغلاق
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recharge Amount Modal */}
      <AnimatePresence>
        {showRechargeModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRechargeModal(false)}
          >
            <motion.div
              className="mx-4 w-full max-w-sm rounded-2xl bg-slate-800 p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                  <Banknote className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <h3 className="mb-2 text-center text-lg font-bold text-white">
                شحن رصيد للمسافر
              </h3>
              <p className="mb-4 text-center text-sm text-slate-400">
                أدخل المبلغ النقدي المستلم
              </p>

              {/* Amount Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl bg-slate-700 px-4 py-4 text-center text-2xl font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">د.ج</span>
                </div>
              </div>

              {/* Preset Amounts */}
              <div className="mb-6 grid grid-cols-4 gap-2">
                {RECHARGE_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handlePresetClick(amount)}
                    className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                      rechargeAmount === amount.toString()
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRechargeModal(false)}
                  className="flex-1 rounded-xl bg-slate-700 py-3 font-medium text-white transition-colors hover:bg-slate-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleStartRechargeScan}
                  disabled={!rechargeAmount || parseInt(rechargeAmount) <= 0}
                  className="flex-1 rounded-xl bg-blue-500 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  مسح QR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              className="mx-4 w-full max-w-sm rounded-2xl bg-slate-800 p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                  <RotateCcw className="h-8 w-8 text-amber-500" />
                </div>
              </div>
              
              <h3 className="mb-2 text-center text-lg font-bold text-white">
                إعادة تعيين الإحصائيات؟
              </h3>
              <p className="mb-6 text-center text-sm text-slate-400">
                سيتم حذف جميع إحصائيات اليوم بشكل نهائي
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 rounded-xl bg-slate-700 py-3 font-medium text-white transition-colors hover:bg-slate-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleResetStats}
                  className="flex-1 rounded-xl bg-amber-500 py-3 font-medium text-white transition-colors hover:bg-amber-600"
                >
                  إعادة تعيين
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
