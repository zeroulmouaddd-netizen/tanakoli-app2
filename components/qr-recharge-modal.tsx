"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Check } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, Timestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"

interface QRRechargeModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  onBalanceUpdate?: (newBalance: number) => void
}

interface RechargeNotification {
  amount: number
  newBalance: number
  timestamp: number
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
    }
  },
}

const notificationVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export function QRRechargeModal({ 
  isOpen, 
  onClose, 
  currentBalance,
  onBalanceUpdate 
}: QRRechargeModalProps) {
  const { firestoreUserId } = useAuth()
  const [qrCodeData, setQrCodeData] = useState("")
  const [notification, setNotification] = useState<RechargeNotification | null>(null)
  const [displayBalance, setDisplayBalance] = useState(currentBalance)
  const lastTransactionRef = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Generate QR code data with actual user ID
  useEffect(() => {
    if (!firestoreUserId || !isOpen) return

    const data = JSON.stringify({
      action: "recharge",
      userId: firestoreUserId,
      timestamp: Date.now(),
    })
    setQrCodeData(data)

    // Set up real-time listener for recharge transactions
    const userDocRef = doc(db, "users", firestoreUserId)
    
    unsubscribeRef.current = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data()
          const newBalance = userData.balance || 0

          // Only show notification if balance increased
          if (newBalance > displayBalance && lastTransactionRef.current === null) {
            const amountAdded = newBalance - displayBalance
            setNotification({
              amount: amountAdded,
              newBalance: newBalance,
              timestamp: Date.now(),
            })

            // Update display balance immediately
            setDisplayBalance(newBalance)
            onBalanceUpdate?.(newBalance)

            // Auto-hide notification after 5 seconds
            setTimeout(() => {
              setNotification(null)
            }, 5000)
          } else if (newBalance !== displayBalance) {
            // Silent update if balance changed but less than expected
            setDisplayBalance(newBalance)
            onBalanceUpdate?.(newBalance)
          }
        }
      },
      (error) => {
        console.error("Error listening to balance updates:", error)
      }
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [firestoreUserId, isOpen, displayBalance, onBalanceUpdate])

  // Clean up listener when modal closes
  useEffect(() => {
    if (!isOpen && unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="glass-strong relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-muted/80 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-5 w-5" />
            </motion.button>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-foreground">شحن عبر السائق</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  أظهر هذا الرمز للسائق ليقوم بمسحه وشحن رصيدك
                </p>
              </div>

              {/* QR Code */}
              {qrCodeData ? (
                <motion.div
                  className="mb-6 flex justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="relative">
                    {/* Pulse effect */}
                    <div className="absolute -inset-3 animate-pulse rounded-2xl bg-primary/10" />
                    
                    {/* QR Code Container */}
                    <div className="relative rounded-2xl bg-white p-4 shadow-lg">
                      <QRCodeSVG
                        value={qrCodeData}
                        size={200}
                        level="H"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="mb-6 flex justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex h-[232px] w-[232px] items-center justify-center rounded-2xl bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </motion.div>
              )}

              {/* Current Balance Info */}
              <motion.div
                className="mb-6 rounded-2xl bg-muted/50 p-4 text-center"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-muted-foreground">رصيدك الحالي</p>
                <p className="mt-1 text-3xl font-bold text-foreground" dir="ltr">
                  {displayBalance.toLocaleString("ar-DZ")} <span className="text-lg">د.ج</span>
                </p>
              </motion.div>

              {/* Instructions */}
              <motion.div
                className="mb-6 rounded-2xl bg-primary/10 p-4 text-center"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm font-medium text-primary">
                  أظهر هذا الرمز للسائق ليقوم بمسحه وشحن رصيدك
                </p>
              </motion.div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                إغلاق
              </motion.button>
            </div>
          </motion.div>

          {/* Real-time Recharge Notification */}
          <AnimatePresence>
            {notification && (
              <motion.div
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-green-500"
                variants={notificationVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="flex flex-col items-center p-8 text-center text-white"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Success Icon */}
                  <motion.div
                    className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  >
                    <Check className="h-12 w-12" strokeWidth={3} />
                  </motion.div>
                  
                  <motion.h2
                    className="mb-2 text-3xl font-bold"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    تم الشحن بنجاح!
                  </motion.h2>
                  
                  <motion.div
                    className="mb-6 rounded-2xl bg-white/20 px-10 py-5"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p className="mb-1 text-sm opacity-80">المبلغ المضاف</p>
                    <p className="text-4xl font-bold" dir="ltr">{notification.amount} د.ج</p>
                  </motion.div>
                  
                  <motion.div
                    className="rounded-xl bg-white/10 px-8 py-3"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-sm opacity-70">رصيدك الجديد</p>
                    <p className="text-2xl font-bold" dir="ltr">{notification.newBalance.toLocaleString("ar-DZ")} د.ج</p>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
