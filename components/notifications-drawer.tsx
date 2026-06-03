"use client"

import { useState, useEffect } from "react"
import { Bell, X, Trash2, Check, CheckCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
  Timestamp,
} from "firebase/firestore"

interface Notification {
  id: string
  userId: string
  type: "trip" | "system" | "reminder" | "alert"
  title: string
  body: string
  createdAt: Timestamp
  isRead: boolean
}

const notificationConfig = {
  trip: { bg: "bg-emerald-500/20", border: "border-emerald-500/30", icon: "bg-emerald-500/30", dot: "bg-emerald-400" },
  system: { bg: "bg-blue-500/20", border: "border-blue-500/30", icon: "bg-blue-500/30", dot: "bg-blue-400" },
  reminder: { bg: "bg-yellow-500/20", border: "border-yellow-500/30", icon: "bg-yellow-500/30", dot: "bg-yellow-400" },
  alert: { bg: "bg-red-500/20", border: "border-red-500/30", icon: "bg-red-500/30", dot: "bg-red-400" },
}

const typeIcons = {
  trip: "🚌",
  system: "⚙️",
  reminder: "🔔",
  alert: "⚠️",
}

export function NotificationsDrawer() {
  const { firestoreUserId } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "trip" | "system">("all")
  const [isLoading, setIsLoading] = useState(true)

  // Real-time Firebase listener
  useEffect(() => {
    if (!firestoreUserId) return

    setIsLoading(true)
    const notificationsRef = collection(db, "notifications")
    const q = query(
      notificationsRef,
      where("userId", "==", firestoreUserId),
      orderBy("createdAt", "desc")
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Notification[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Notification)
        })
        setNotifications(data)
        setIsLoading(false)
        console.log("[v0] Loaded notifications from Firebase:", data.length)
      },
      (error) => {
        console.error("[v0] Error loading notifications:", error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [firestoreUserId])

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.isRead
    if (activeFilter === "trip") return n.type === "trip"
    if (activeFilter === "system") return n.type === "system"
    return true
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, "notifications", notificationId)
      await updateDoc(docRef, { isRead: true })
      console.log("[v0] Marked notification as read:", notificationId)
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!firestoreUserId || unreadCount === 0) return

    try {
      const batch = writeBatch(db)
      const unreadNotifications = notifications.filter((n) => !n.isRead)

      unreadNotifications.forEach((notification) => {
        const docRef = doc(db, "notifications", notification.id)
        batch.update(docRef, { isRead: true })
      })

      await batch.commit()
      console.log("[v0] Marked all notifications as read")
    } catch (error) {
      console.error("[v0] Error marking all as read:", error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId))
      console.log("[v0] Deleted notification:", notificationId)
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
    }
  }

  // Format time
  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "الآن"
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`
    if (diffHours < 24) return `قبل ${diffHours} ساعة`
    if (diffDays < 7) return `قبل ${diffDays} أيام`
    return date.toLocaleDateString("ar-DZ")
  }

  return (
    <>
      {/* Bell Button in Header */}
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-card/80 backdrop-blur-sm relative flex-shrink-0 flex items-center justify-center hover:bg-card transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="absolute inset-x-0 top-0 h-[90vh] max-h-[90vh] flex flex-col bg-background rounded-b-3xl shadow-2xl"
              initial={{ y: -500, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -500, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="shrink-0 border-b border-border bg-card p-4 sm:p-6 flex items-center justify-between">
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-10 w-10 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg sm:text-xl font-bold text-foreground">الإشعارات</h2>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="h-4 w-4" />
                    تحديد الكل كمقروء
                  </button>
                )}
                {unreadCount === 0 && <div className="w-10" />}
              </div>

              {/* Filter Tabs */}
              <div className="shrink-0 border-b border-border bg-card/50 p-2 sm:p-3 flex gap-2 overflow-x-auto">
                {["all", "unread", "trip", "system"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as typeof activeFilter)}
                    className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {filter === "all" && "الكل"}
                    {filter === "unread" && `غير مقروء (${unreadCount})`}
                    {filter === "trip" && "الرحلات"}
                    {filter === "system" && "النظام"}
                  </button>
                ))}
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
                      <p className="text-muted-foreground">جارٍ تحميل الإشعارات...</p>
                    </div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground">لا توجد إشعارات</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <AnimatePresence>
                      {filteredNotifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-3 sm:p-4 border-l-4 ${
                            notificationConfig[notification.type].border
                          } ${
                            !notification.isRead
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/30"
                          } transition-colors cursor-pointer group`}
                          onClick={() =>
                            !notification.isRead && markAsRead(notification.id)
                          }
                        >
                          <div className="flex gap-3 sm:gap-4">
                            {/* Icon */}
                            <div className="shrink-0 pt-0.5">
                              <div
                                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${
                                  notificationConfig[notification.type].icon
                                } flex items-center justify-center text-lg`}
                              >
                                {typeIcons[notification.type]}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h3
                                    className={`text-sm sm:text-base font-bold ${
                                      !notification.isRead
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {notification.title}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    {notification.body}
                                  </p>
                                  <p className="text-xs text-muted-foreground/60 mt-2">
                                    {formatTime(notification.createdAt)}
                                  </p>
                                </div>

                                {/* Unread Dot */}
                                {!notification.isRead && (
                                  <div
                                    className={`shrink-0 h-2 w-2 rounded-full ${
                                      notificationConfig[notification.type].dot
                                    } mt-1.5`}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
