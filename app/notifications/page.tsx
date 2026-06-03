"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { PageTransition } from "@/components/page-transition"
import { Bell, Trash2, Check, X as CloseIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type NotificationType = "trip" | "system" | "reminder" | "alert"
type FilterTab = "all" | "unread" | "system" | "trips"

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  time: string
  isRead: boolean
  timestamp: number
}

const notificationColors: Record<NotificationType, { bg: string; dot: string; icon: string }> = {
  trip: { bg: "bg-green-500/10", dot: "bg-green-500", icon: "text-green-500" },
  system: { bg: "bg-blue-500/10", dot: "bg-blue-500", icon: "text-blue-500" },
  reminder: { bg: "bg-yellow-500/10", dot: "bg-yellow-500", icon: "text-yellow-500" },
  alert: { bg: "bg-red-500/10", dot: "bg-red-500", icon: "text-red-500" },
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "trip":
      return "🚌"
    case "system":
      return "⚙️"
    case "reminder":
      return "⏰"
    case "alert":
      return "⚠️"
  }
}

const getTitleArabic = (type: NotificationType) => {
  switch (type) {
    case "trip":
      return "رحلة"
    case "system":
      return "نظام"
    case "reminder":
      return "تذكير"
    case "alert":
      return "تنبيه"
  }
}

const sampleNotifications: Notification[] = [
  {
    id: "1",
    type: "trip",
    title: "حافلتك على الطريق",
    body: "حافلتك على بعد محطتين من موقعك الحالي",
    time: "منذ 5 دقائق",
    isRead: false,
    timestamp: Date.now() - 5 * 60 * 1000,
  },
  {
    id: "2",
    type: "alert",
    title: "تأخر غير متوقع",
    body: "تأخر الخط 1 بسبب الازدحام المروري - 15 دقيقة تقريباً",
    time: "منذ 12 دقيقة",
    isRead: false,
    timestamp: Date.now() - 12 * 60 * 1000,
  },
  {
    id: "3",
    type: "system",
    title: "تحديث جديد متاح",
    body: "يتوفر تحديث جديد للتطبيق يتضمن تحسينات الأداء والميزات الجديدة",
    time: "منذ ساعة",
    isRead: true,
    timestamp: Date.now() - 60 * 60 * 1000,
  },
  {
    id: "4",
    type: "reminder",
    title: "تذكير بالرحلة",
    body: "لا تنسَ رحلتك غداً الساعة 8:00 صباحاً إلى محطة الشمال",
    time: "منذ ساعتين",
    isRead: true,
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "5",
    type: "trip",
    title: "وصول الحافلة",
    body: "وصلت الحافلة إلى محطة الوجهة النهائية",
    time: "منذ 3 ساعات",
    isRead: true,
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    id: "6",
    type: "system",
    title: "رصيدك منخفض",
    body: "رصيدك في المحفظة منخفض. شحّن الآن لتجنب الانقطاع عن الخدمة",
    time: "أمس",
    isRead: true,
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
  },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications)
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "all") return true
    if (filterTab === "unread") return !n.isRead
    if (filterTab === "system") return n.type === "system"
    if (filterTab === "trips") return n.type === "trip" || n.type === "alert" || n.type === "reminder"
    return true
  })

  return (
    <PageTransition>
      <main className="min-h-screen w-full bg-background pb-24">
        {/* Header */}
        <AppHeader />

        {/* Content */}
        <div className="w-full">
          {/* Page Header */}
          <div className="sticky top-16 sm:top-20 z-20 border-b border-border/30 bg-background/95 backdrop-blur-md">
            <div className="mx-auto max-w-2xl px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">الإشعارات</h1>
                {unreadCount > 0 && (
                  <motion.button
                    onClick={markAllAsRead}
                    className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    تحديد الكل كمقروء
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-border/30 bg-card/50">
            <div className="mx-auto max-w-2xl px-4 sm:px-6">
              <div className="flex gap-2 sm:gap-4 py-3 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all ${
                    filterTab === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setFilterTab("unread")}
                  className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all ${
                    filterTab === "unread"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  غير مقروء
                </button>
                <button
                  onClick={() => setFilterTab("system")}
                  className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all ${
                    filterTab === "system"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  النظام
                </button>
                <button
                  onClick={() => setFilterTab("trips")}
                  className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all ${
                    filterTab === "trips"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الرحلات
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-12 sm:py-16 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted">
                    <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg sm:text-xl font-semibold text-foreground">
                    {filterTab === "unread" ? "لا توجد إشعارات جديدة" : "لا توجد إشعارات"}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {filterTab === "unread" ? "أنت لم تفت أي شيء!" : "ستظهر الإشعارات هنا"}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 100 }}
                      transition={{ delay: mounted ? index * 0.05 : 0 }}
                      onClick={() => markAsRead(notification.id)}
                      className={`group relative rounded-lg sm:rounded-2xl border border-border/20 p-3 sm:p-4 transition-all cursor-pointer hover:border-primary/30 ${
                        !notification.isRead
                          ? "bg-primary/5 hover:bg-primary/8"
                          : "bg-card/40 hover:bg-card/60"
                      }`}
                    >
                      {/* Unread Indicator */}
                      <AnimatePresence>
                        {!notification.isRead && (
                          <motion.div
                            className={`absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${
                              notificationColors[notification.type].dot
                            }`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          />
                        )}
                      </AnimatePresence>

                      <div className="flex gap-3 sm:gap-4 pr-6 sm:pr-8">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl ${
                            notificationColors[notification.type].bg
                          }`}
                        >
                          <span className="text-lg sm:text-xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-start gap-2 mb-1">
                            <span className={`text-xs sm:text-sm font-medium px-2 py-0.5 rounded-md ${
                              notificationColors[notification.type].bg
                            } ${notificationColors[notification.type].icon}`}>
                              {getTitleArabic(notification.type)}
                            </span>
                            <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                              {notification.title}
                            </h3>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.body}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                            {notification.time}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <div className="flex-shrink-0 flex items-center justify-end gap-2">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </main>
    </PageTransition>
  )
}
