"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Home, MapPin, Clock, User, QrCode, X, Wallet, ScanLine } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { useUserCache } from "@/hooks/use-user-cache"
import { useAuth } from "@/lib/auth-context"

// Dynamic import with SSR disabled for QR code
const QRCodeDisplay = dynamic(
  () => import("@/components/qr-code-display").then(mod => ({ default: mod.QRCodeDisplay })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex h-[180px] w-[180px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </div>
        </div>
        <div className="w-full">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">صلاحية الرمز</span>
            <span className="font-bold tabular-nums text-primary">-- ثانية</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full rounded-full bg-primary/30" />
          </div>
        </div>
      </div>
    )
  }
)

// All nav items in order (RTL: right to left visually)
const navItems = [
  { icon: Home, label: "الرئيسية", href: "/", type: "link" as const },
  { icon: MapPin, label: "المحطات", href: "/stations", type: "link" as const },
  { icon: QrCode, label: "ادفع", href: "", type: "button" as const },
  { icon: Clock, label: "الرحلات", href: "/trips", type: "link" as const },
  { icon: User, label: "حسابي", href: "/account", type: "link" as const },
]

export function BottomNav() {
  const pathname = usePathname()
  const [showModal, setShowModal] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleOpenModal = () => {
    setIsPulsing(true)
    setTimeout(() => setIsPulsing(false), 300)
    setShowModal(true)
  }

  return (
    <>
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-[999]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      >
        {/* Glassmorphism nav bar */}
        <div
          className="relative pb-safe backdrop-blur-2xl"
          style={{
            background: "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(10,16,32,0.95) 100%)",
            borderTop: "1px solid rgba(16,185,129,0.18)",
            boxShadow: "0 -1px 0 0 rgba(16,185,129,0.08), 0 -8px 32px rgba(0,0,0,0.35)",
          }}
        >
          {/* Top glow line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          {/* Nav content - 5 equal slots */}
          <div className="flex h-14 sm:h-16 items-stretch">
            {navItems.map((item, index) => {
              const isActive = item.type === "link" && pathname === item.href
              const isCenter = index === 2

              // Center QR button
              if (isCenter) {
                return (
                  <div key={item.label} className="flex flex-1 items-center justify-center">
                    {hasMounted && (
                      <motion.button
                        onClick={handleOpenModal}
                        onTouchStart={() => {}}
                        className="flex flex-col items-center gap-0.5 sm:gap-1"
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        aria-label="دفع سريع"
                      >
                        {/* Circular green container with neon glow */}
                        <motion.div
                          className={`qr-button-glow flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground ${isPulsing ? 'button-pulse' : ''}`}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <QrCode className="h-4 sm:h-5 w-4 sm:w-5" strokeWidth={2} />
                        </motion.div>
                        <span className="text-[9px] sm:text-[10px] font-medium text-primary">{item.label}</span>
                      </motion.button>
                    )}
                  </div>
                )
              }

              // Regular nav items
              return (
                <Link key={item.label} href={item.href} onTouchStart={() => {}} className="flex flex-1 items-center justify-center">
                  <motion.div
                    className="relative flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2"
                    whileTap={{ scale: 0.90 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {/* Active pill bubble behind icon + label */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        layoutId="activeTabBubble"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        style={{
                          background: "rgba(16,185,129,0.12)",
                          boxShadow: "0 0 12px rgba(16,185,129,0.2), inset 0 1px 0 rgba(16,185,129,0.15)",
                        }}
                      />
                    )}

                    {/* Icon */}
                    <motion.div
                      className="relative z-10"
                      animate={
                        isActive
                          ? { scale: 1.12, filter: "drop-shadow(0 0 6px rgba(16,185,129,0.8))" }
                          : { scale: 1,    filter: "drop-shadow(0 0 0px transparent)" }
                      }
                      transition={{ type: "spring", stiffness: 380, damping: 20 }}
                    >
                      <item.icon
                        className="h-4 sm:h-5 w-4 sm:w-5 transition-colors duration-200"
                        style={{ color: isActive ? "#10B981" : "rgba(148,163,184,0.6)" }}
                      />
                    </motion.div>

                    {/* Label */}
                    <span
                      className="relative z-10 text-[9px] sm:text-[10px] font-medium transition-colors duration-200"
                      style={{ color: isActive ? "#10B981" : "rgba(148,163,184,0.5)" }}
                    >
                      {item.label}
                    </span>

                    {/* Small pill indicator dot beneath label when active */}
                    <motion.div
                      animate={isActive ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute -bottom-0.5 h-0.5 w-4 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #10B981, #38BDF8)",
                        boxShadow: "0 0 6px rgba(16,185,129,0.8)",
                      }}
                    />
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      </motion.nav>

      {/* Payment QR Modal Portal */}
      {hasMounted && createPortal(
        <PaymentQRModal isOpen={showModal} onClose={() => setShowModal(false)} />,
        document.body
      )}
    </>
  )
}

interface PaymentQRModalProps {
  isOpen: boolean
  onClose: () => void
}

function PaymentQRModal({ isOpen, onClose }: PaymentQRModalProps) {
  const { userData, isLoading } = useUserCache()
  const { firestoreUserId } = useAuth()

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    const handlePopState = () => {
      onClose()
    }

    window.history.pushState({ modal: "qr-payment" }, "")
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("popstate", handlePopState)
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("popstate", handlePopState)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ zIndex: 9999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Close button - top right on mobile, top left on larger screens */}
          <motion.button
            onClick={onClose}
            onTouchStart={() => {}}
            className="absolute right-3 top-3 sm:right-auto sm:left-4 sm:top-4 flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-full bg-card/90 text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-card"
            style={{ zIndex: 10000 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.1 }}
            aria-label="إغلاق"
          >
            <X className="h-5 sm:h-6 w-5 sm:w-6" />
          </motion.button>
          
          {/* Modal Content */}
          <motion.div
            className="relative w-full sm:w-full mx-0 sm:mx-4 max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ zIndex: 9999 }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-t-3xl sm:rounded-3xl bg-card shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-br from-primary to-primary/80 p-4 sm:p-6 text-primary-foreground">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 sm:h-5 w-4 sm:w-5" />
                    <span className="text-xs sm:text-sm font-medium opacity-90">محفظتي</span>
                  </div>
                  <span className="rounded-full bg-primary-foreground/20 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium">
                    نشط
                  </span>
                </div>
                
                <div className="mb-2">
                  <p className="text-xs sm:text-sm opacity-80">الرصيد الحالي</p>
                  <div className="text-2xl sm:text-3xl font-bold" dir="ltr">
                    {isLoading ? "..." : (userData?.balance ?? 0).toLocaleString("ar-DZ")} <span className="text-sm sm:text-lg">د.ج</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-medium">
                  {isLoading ? "جاري التحميل..." : userData?.fullName || "مستخدم"}
                </p>
              </div>

              {/* QR Code Section */}
              <div className="p-4 sm:p-6">
                <div className="mb-4 text-center">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">رمز الدفع السريع</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">أظهر هذا الكود للسائق للدفع</p>
                </div>

                <QRCodeDisplay 
                  userId={firestoreUserId || ""}
                  userName={userData?.fullName || ""}
                  userPhone={userData?.Phone || firestoreUserId || ""}
                />

                {/* Scan Instruction */}
                <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-muted/50 p-3 sm:p-4">
                  <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 flex-shrink-0">
                    <ScanLine className="h-5 sm:h-6 w-5 sm:w-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-medium text-foreground">امسح وانطلق</p>
                    <p className="text-xs text-muted-foreground">Scan & Go</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
