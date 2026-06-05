"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, BellOff, CreditCard, ArrowDownCircle, AlertTriangle, X } from "lucide-react"
import { useNotifications, type AppNotification } from "@/hooks/use-notifications"

interface NotificationsDrawerProps {
  open: boolean
  onClose: () => void
}

function timeAgo(date: Date | null): string {
  if (!date) return ""
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "منذ لحظات"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    if (minutes === 1) return "منذ دقيقة"
    if (minutes <= 10) return `منذ ${minutes} دقائق`
    return `منذ ${minutes} دقيقة`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    if (hours === 1) return "منذ ساعة"
    if (hours <= 10) return `منذ ${hours} ساعات`
    return `منذ ${hours} ساعة`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return "منذ يوم"
  return `منذ ${days} أيام`
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "payment") {
    return (
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15">
        <CreditCard className="h-5 w-5 text-blue-400" />
      </div>
    )
  }
  if (type === "recharge") {
    return (
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
      <AlertTriangle className="h-5 w-5 text-amber-400" />
    </div>
  )
}

function NotifItem({ notif }: { notif: AppNotification }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${!notif.read ? "bg-primary/5" : ""}`}>
      <NotifIcon type={notif.type} />
      <div className="min-w-0 flex-1 text-right">
        <p className="text-sm font-medium leading-snug text-foreground">{notif.message}</p>
        {notif.createdAt && (
          <p className="mt-1 text-xs text-muted-foreground">{timeAgo(notif.createdAt)}</p>
        )}
      </div>
      {!notif.read && (
        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
      )}
    </div>
  )
}

export function NotificationsDrawer({ open, onClose }: NotificationsDrawerProps) {
  const { notifications, markAllRead } = useNotifications()

  useEffect(() => {
    if (open && notifications.some((n) => !n.read)) {
      const timer = setTimeout(() => markAllRead(), 600)
      return () => clearTimeout(timer)
    }
  }, [open, notifications, markAllRead])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[80dvh] flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">الإشعارات</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <BellOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-medium text-muted-foreground">لا توجد إشعارات</p>
                  <p className="text-sm text-muted-foreground/60">ستظهر إشعاراتك هنا</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notif, i) => (
                    <div key={notif.id}>
                      <NotifItem notif={notif} />
                      {i < notifications.length - 1 && (
                        <div className="mx-4 border-b border-border/50" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
