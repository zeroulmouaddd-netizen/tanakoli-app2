"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Timestamp } from "firebase/firestore"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { TripsBackground } from "@/components/trips-background"
import { Clock, Bus, ArrowLeft, Ticket, Calendar, History, MapPin, QrCode, Navigation, ArrowUpCircle, ArrowDownCircle, Wallet, Search } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import { TripCardSkeleton } from "@/components/skeleton-loader"
import { useTripsCache, type Trip } from "@/hooks/use-trips-cache"
import { usePassengerTransactions, type PassengerTransaction } from "@/hooks/use-passenger-transactions"
import { PageTransition } from "@/components/page-transition"
import { Button } from "@/components/ui/button"
import { useTracking } from "@/lib/tracking-context"
import { useDemoMode } from "@/lib/demo-mode-context"
import { useRoutesByCategory } from "@/hooks/use-routes"
import { calculateNextArrival, generateSchedule } from "@/lib/schedule-utils"

// Animation variants for tab content
const tabContentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: {
      duration: 0.15,
    }
  },
}

// Staggered list animation
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    }
  },
}

const demoHistoryListVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.035 } },
}

const demoHistoryItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
}

// Mock active trip data
const mockActiveTrip = {
  id: "active-1",
  lineName: "خط الجامعة",
  lineNumber: "01",
  from: "الجامعة",
  to: "وسط المدينة",
  remainingMinutes: 5,
  progress: 75,
}

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState<"schedule" | "history">("schedule")
  const [scheduleSearch, setScheduleSearch] = useState("")
  const [hasActiveTrip, setHasActiveTrip] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [step6Focus, setStep6Focus] = useState<"track" | "past" | "current" | "next" | "history">("track")
  const router = useRouter()
  const { startTracking } = useTracking()
  const { isActive: isDemoActive, step: demoStep, setStep6Phase } = useDemoMode()
  const prefersReducedMotion = useReducedMotion()
  const isDemoTripsStep = isDemoActive && demoStep === 6
  const isDemoTripsHistoryStep = isDemoTripsStep && step6Focus === "history"
  
  const { trips, isLoading: loading } = useTripsCache()
  const { transactions, isLoading: transactionsLoading } = usePassengerTransactions("0775453629")
  const { routes: urbanRoutes, isLoading: routesLoading } = useRoutesByCategory("urban")
  const demoHistoryTransactions = useMemo<PassengerTransaction[]>(() => {
    const now = Date.now()
    return [
      {
        id: "demo-fare-1",
        type: "fare_deduction",
        amount: 1000,
        previousBalance: 5000,
        newBalance: 4000,
        passengerName: "مسافر تجريبي",
        driverTimestamp: Timestamp.fromDate(new Date(now - 8 * 60_000)),
        status: "completed",
      },
      {
        id: "demo-recharge-1",
        type: "balance_recharge",
        amount: 2000,
        previousBalance: 4000,
        newBalance: 6000,
        passengerName: "مسافر تجريبي",
        driverTimestamp: Timestamp.fromDate(new Date(now - 58 * 60_000)),
        status: "completed",
      },
      {
        id: "demo-fare-2",
        type: "fare_deduction",
        amount: 1000,
        previousBalance: 6000,
        newBalance: 5000,
        passengerName: "مسافر تجريبي",
        driverTimestamp: Timestamp.fromDate(new Date(now - 3 * 60 * 60_000)),
        status: "completed",
      },
    ]
  }, [])
  const historyTransactions = transactions.length > 0
    ? transactions
    : isDemoTripsStep
    ? demoHistoryTransactions
    : []
  const historySpotlightTransactionId = historyTransactions.find((transaction) => transaction.type === "fare_deduction")?.id
    ?? historyTransactions[0]?.id
  const historyIsLoading = transactionsLoading && historyTransactions.length === 0
  const searchTerm = scheduleSearch.trim().toLowerCase()
  const filteredUrbanRoutes = searchTerm
    ? urbanRoutes.filter((route) => {
        const searchableText = [
          route.name,
          route.nameEn,
          route.lineNumber,
          ...route.stops.flatMap((stop) => [stop.name, stop.nameEn]),
          ...(route.sub_stations ?? []).flatMap((station) => [station.name, station.nameEn]),
        ].join(" ").toLowerCase()
        return searchableText.includes(searchTerm)
      })
    : urbanRoutes
  
  const handleTrackBus = (lineId: string, lineName: string) => {
    startTracking(lineId, lineName)
    router.push("/")
  }
  
  useEffect(() => {
    setHasMounted(true)
    const storedActiveTrip = typeof window !== 'undefined' && localStorage.getItem('activeTrip')
    setHasActiveTrip(!!storedActiveTrip)
  }, [])

  useEffect(() => {
    if (!isDemoTripsStep) {
      setStep6Focus("track")
      setStep6Phase("past")
      return
    }

    setStep6Focus("track")
    setStep6Phase("past")
    if (routesLoading) return

    const pastDepartureTimer = window.setTimeout(() => setStep6Focus("past"), 700)
    const upcomingPhaseTimer = window.setTimeout(() => {
      setStep6Focus("current")
      setStep6Phase("upcoming")
    }, 1_500)
    const nextDepartureTimer = window.setTimeout(() => setStep6Focus("next"), 2_250)
    const historyTabTimer = window.setTimeout(() => {
      setActiveTab("history")
      setStep6Focus("history")
      setStep6Phase("history")
    }, 3_000)
    return () => {
      window.clearTimeout(pastDepartureTimer)
      window.clearTimeout(upcomingPhaseTimer)
      window.clearTimeout(nextDepartureTimer)
      window.clearTimeout(historyTabTimer)
    }
  }, [isDemoTripsStep, routesLoading, setStep6Phase])

  const formatDate = (trip: Trip) => {
    if (trip.timestamp) {
      const date = new Date(trip.timestamp.seconds * 1000)
      return date.toLocaleDateString("ar-DZ", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
    if (trip.createdAt) {
      const date = new Date(trip.createdAt)
      return date.toLocaleDateString("ar-DZ", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
    return "غير معروف"
  }

  const formatTime = (trip: Trip) => {
    if (trip.timestamp) {
      const date = new Date(trip.timestamp.seconds * 1000)
      return date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
    }
    if (trip.createdAt) {
      const date = new Date(trip.createdAt)
      return date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
    }
    return "--:--"
  }

  return (
    <ErrorBoundary>
      <PageTransition>
        <main className={`relative min-h-screen bg-background pb-32 sm:pb-40${isDemoTripsStep ? " demo-trips-demo-active" : ""}`}>
          {/* Animated Background */}
          <TripsBackground />
          
          {/* Content */}
          <div className="relative z-10">
          <AppHeader />
        
          <div className="px-3 sm:px-4 md:px-6 pt-16 sm:pt-20 demo-trips-content">
            {/* Page Header */}
            <motion.div
              className="mb-4 flex items-center gap-2 sm:gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary">
                <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">الرحلات</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">مواعيد وسجل الرحلات</p>
              </div>
            </motion.div>

            {/* Schedule search */}
            <motion.div
              data-demo-target={isDemoTripsStep ? "trip-search-card" : undefined}
              className="relative mb-4 rounded-xl border border-border/70 bg-card/80 px-3 py-2.5 shadow-sm backdrop-blur-md"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.04 }}
            >
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                value={scheduleSearch}
                onChange={(event) => setScheduleSearch(event.target.value)}
                placeholder="ابحث عن خط أو محطة..."
                aria-label="ابحث عن خط أو محطة"
                dir="auto"
                className="w-full bg-transparent py-1 pr-7 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </motion.div>

            {/* Active Trip Section */}
            <motion.div
              className={`mb-4${isDemoTripsStep ? " demo-trip-active-section" : ""}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs sm:text-sm font-medium text-foreground">الرحلة النشطة</span>
              </div>
              
              {hasMounted && hasActiveTrip ? (
                <motion.div
                  className="overflow-hidden rounded-lg sm:rounded-2xl bg-primary shadow-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4">
                    <div className="relative flex-shrink-0">
                      <div className="absolute -inset-1 animate-pulse rounded-full bg-primary-foreground/20" />
                      <div className="relative flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-full bg-primary-foreground">
                        <Bus className="h-5 sm:h-6 w-5 sm:w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="font-bold text-xs sm:text-base text-primary-foreground">{mockActiveTrip.lineName}</span>
                        <span className="rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-xs text-primary-foreground">
                          خط {mockActiveTrip.lineNumber}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-primary-foreground/80 mt-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{mockActiveTrip.from}</span>
                        <ArrowLeft className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{mockActiveTrip.to}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                      <div className="text-center flex-1 sm:flex-none">
                        <div className="flex items-baseline justify-center gap-0.5 text-primary-foreground">
                          <span className="text-lg sm:text-xl font-bold">{mockActiveTrip.remainingMinutes}</span>
                          <span className="text-xs">د</span>
                        </div>
                        <span className="text-xs text-primary-foreground/70">متبقية</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-7 sm:h-8 gap-1 rounded-full bg-primary-foreground px-2 sm:px-3 text-xs text-primary hover:bg-primary-foreground/90 flex-1 sm:flex-none"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        تتبع
                      </Button>
                    </div>
                  </div>
                  
                  <div className="h-1 w-full bg-primary-foreground/20">
                    <motion.div 
                      className="h-full bg-primary-foreground"
                      initial={{ width: 0 }}
                      animate={{ width: `${mockActiveTrip.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 rounded-lg sm:rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-3 sm:p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-full bg-muted flex-shrink-0">
                    <QrCode className="h-5 sm:h-6 w-5 sm:w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-center sm:text-right">
                    <p className="font-medium text-foreground text-sm sm:text-base">لا توجد رحلة نشطة</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      امسح رمزك مع السائق لبدء الرحلة
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Tab Switcher */}
            <motion.div
              className="mb-4 flex gap-2 rounded-lg sm:rounded-xl bg-muted p-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.button
                onClick={() => setActiveTab("schedule")}
                className={`relative flex-1 rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "schedule"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === "schedule" && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-card shadow-sm"
                    layoutId="activeTabBg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                  <Clock className="h-3 sm:h-4 w-3 sm:w-4" />
                  <span>المواعيد</span>
                </div>
              </motion.button>
              <motion.button
                onClick={() => setActiveTab("history")}
                className={`relative flex-1 rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "history"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === "history" && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-card shadow-sm"
                    layoutId="activeTabBg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                  <History className="h-3 sm:h-4 w-3 sm:w-4" />
                  <span>السجل</span>
                  {transactions.length > 0 && (
                    <span className="flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                      {transactions.length}
                    </span>
                  )}
                </div>
              </motion.button>
            </motion.div>

            {/* Tab Content with AnimatePresence */}
            <AnimatePresence mode="wait">
              {/* Schedule Tab */}
              {activeTab === "schedule" && (
                <motion.div
                  key="schedule"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div
                    className="space-y-4"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {routesLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse rounded-2xl bg-card p-4">
                            <div className="h-16 bg-muted rounded-xl" />
                          </div>
                        ))}
                      </div>
                    ) : filteredUrbanRoutes.length === 0 ? (
                      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-8 text-center text-sm text-muted-foreground">
                        لا توجد مواعيد مطابقة للبحث
                      </div>
                    ) : (
                      filteredUrbanRoutes.map((route, routeIndex) => {
                        const subStations = route.sub_stations || route.stops.map(s => ({ id: s.id, name: s.name }))
                        const firstStop = subStations[0]?.name || route.stops[0]?.name || ""
                        const lastStop = subStations[subStations.length - 1]?.name || route.stops[route.stops.length - 1]?.name || ""
                        const schedule = generateSchedule(route.workingHours, route.frequency)
                        const lastDepartedIndex = schedule.reduce(
                          (lastIndex, slot, index) => slot.status === "departed" ? index : lastIndex,
                          -1,
                        )
                        const currentDepartureIndex = schedule.findIndex((slot) => slot.status === "current")
                        const firstUpcomingIndex = schedule.findIndex((slot, index) =>
                          slot.status === "upcoming" && (currentDepartureIndex < 0 || index > currentDepartureIndex),
                        )
                        const currentFocusIndex = currentDepartureIndex >= 0
                          ? currentDepartureIndex
                          : firstUpcomingIndex >= 0
                          ? firstUpcomingIndex
                          : Math.max(0, schedule.length - 1)
                        const nextUpcomingIndex = schedule.findIndex((slot, index) =>
                          index > currentFocusIndex && slot.status === "upcoming",
                        )
                        const nextFocusIndex = nextUpcomingIndex >= 0 ? nextUpcomingIndex : currentFocusIndex
                        const nextArrival = calculateNextArrival(route.workingHours, route.frequency)
                        const isTrackFocus = isDemoTripsStep && routeIndex === 0 && step6Focus === "track"
                        
                        return (
                          <motion.div
                            key={route.id}
                            className="overflow-hidden rounded-2xl bg-card shadow-sm"
                            variants={itemVariants}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="border-b border-border bg-primary/5 px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: route.color }}
                                  >
                                    <Bus className="h-5 w-5 text-primary-foreground" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-foreground">{route.name}</h3>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <span>{firstStop}</span>
                                      <ArrowLeft className="h-3 w-3" />
                                      <span>{lastStop}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-left">
                                    <div className="text-lg font-bold text-primary">{nextArrival}</div>
                                    <div className="text-xs text-muted-foreground">القادمة</div>
                                  </div>
                                  <Button
                                    size="sm"
                                    data-demo-focus-target={isTrackFocus ? "trip-track-button" : undefined}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTrackBus("line-" + route.lineNumber, route.name)
                                    }}
                                    className={`h-9 gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90${isTrackFocus ? " demo-step6-ring-focus" : ""}`}
                                  >
                                    <Navigation className="h-3.5 w-3.5" />
                                    تتبع
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>كل {route.frequency} دقيقة</span>
                                <span className="text-xs">({route.workingHours.start} - {route.workingHours.end})</span>
                              </div>
                              
                              <div className="mb-3">
                                <div className="mb-2 text-xs font-medium text-muted-foreground">المحطات الفرعية:</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {subStations.map((station, index) => (
                                    <div key={station.id} className="flex items-center">
                                      <span 
                                        className="rounded-md px-2 py-1 text-xs text-foreground"
                                        style={{ 
                                          backgroundColor: index === 0 || index === subStations.length - 1 
                                            ? `${route.color}20` 
                                            : 'hsl(var(--muted))',
                                          border: index === 0 || index === subStations.length - 1 
                                            ? `1px solid ${route.color}` 
                                            : 'none'
                                        }}
                                      >
                                        {station.name}
                                      </span>
                                      {index < subStations.length - 1 && (
                                        <ArrowLeft className="mx-1 h-3 w-3 text-muted-foreground" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <div className="mb-2 text-xs font-medium text-muted-foreground">أوقات اليوم:</div>
                                <div className="flex flex-wrap gap-2">
                                  {schedule.map((slot, index) => {
                                    const isPastFocus = isDemoTripsStep
                                      && routeIndex === 0
                                      && step6Focus === "past"
                                      && index === lastDepartedIndex
                                    const isCurrentFocus = isDemoTripsStep
                                      && routeIndex === 0
                                      && step6Focus === "current"
                                      && index === currentFocusIndex
                                    const isNextFocus = isDemoTripsStep
                                      && routeIndex === 0
                                      && step6Focus === "next"
                                      && index === nextFocusIndex
                                    const isDepartureFocus = isPastFocus || isCurrentFocus || isNextFocus
                                    const isDepartedDuringDemo = isDemoTripsStep
                                      && routeIndex === 0
                                      && slot.status === "departed"
                                      && !isDepartureFocus
                                    const animateDeparture = isDepartureFocus && !prefersReducedMotion
                                    const focusTargetName = isPastFocus
                                      ? "past-departure"
                                      : isCurrentFocus
                                      ? "current-departure"
                                      : isNextFocus
                                      ? "next-departure"
                                      : undefined

                                    return (
                                      <motion.span
                                        key={index}
                                        data-demo-focus-target={focusTargetName}
                                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                                          slot.status === "departed"
                                            ? "bg-muted text-muted-foreground line-through"
                                            : slot.status === "current"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-primary/10 text-primary"
                                        }${isDepartedDuringDemo ? " demo-trip-time--departed" : ""}${isDepartureFocus ? " demo-step6-ring-focus demo-step6-time-zoom-focus" : ""}`}
                                        animate={animateDeparture ? { y: -2, scale: 1.2 } : { y: 0, scale: 1 }}
                                        transition={prefersReducedMotion
                                          ? { duration: 0 }
                                          : animateDeparture
                                          ? { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
                                          : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                                        transformTemplate={({ y = 0, scale = 1 }) => `translate3d(0, ${y}px, 0) scale3d(${scale}, ${scale}, 1)`}
                                        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                                      >
                                        {slot.time}
                                      </motion.span>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </motion.div>
                </motion.div>
              )}

              {/* History Tab */}
              {activeTab === "history" && (
                <motion.div
                  key="history"
                  className={isDemoTripsHistoryStep ? "demo-step6-history-panel" : undefined}
                  variants={prefersReducedMotion ? undefined : tabContentVariants}
                  initial={prefersReducedMotion ? false : "hidden"}
                  animate={prefersReducedMotion ? { opacity: 1, x: 0 } : "visible"}
                  exit={prefersReducedMotion ? undefined : "exit"}
                  transformTemplate={({ x = 0, scale = 1 }) => `translate3d(${x}px, 0, 0) scale3d(${scale}, ${scale}, 1)`}
                >
                  <div className="space-y-3">
                    {historyIsLoading ? (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {[1, 2, 3].map((i) => (
                          <TripCardSkeleton key={i} />
                        ))}
                      </motion.div>
                    ) : historyTransactions.length === 0 ? (
                      <motion.div
                        className="flex flex-col items-center justify-center rounded-2xl bg-card px-6 py-12 shadow-sm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="relative mb-6">
                          <motion.div
                            className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-primary/5"
                            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.3, 0.5] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          />
                          <motion.div
                            className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-primary/10"
                            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                          />
                          <motion.div 
                            className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <Wallet className="h-12 w-12 text-primary" />
                            <motion.div
                              className="absolute -bottom-3 left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-full bg-primary/30"
                              animate={{ scaleY: [1, 0.5, 1], opacity: [0.5, 0.2, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                              className="absolute -bottom-5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/40"
                              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                            />
                          </motion.div>
                        </div>
                        
                        <h3 className="mb-2 text-xl font-bold text-foreground">سجلك فارغ</h3>
                        <p className="mb-4 max-w-[250px] text-center text-sm leading-relaxed text-muted-foreground">
                          ابدأ رحلتك الأولى بمسح رمزك للسائق!
                        </p>
                        
                        <motion.div 
                          className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Ticket className="h-5 w-5 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            اضغط على زر الدفع لعرض رمزك
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="space-y-3"
                        variants={prefersReducedMotion ? undefined : isDemoTripsHistoryStep ? demoHistoryListVariants : listVariants}
                        initial={prefersReducedMotion ? false : "hidden"}
                        animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      >
                        {historyTransactions.map((transaction) => {
                          const isRecharge = transaction.type === "balance_recharge"
                          const isHistorySpotlight = isDemoTripsHistoryStep && transaction.id === historySpotlightTransactionId
                          const timestamp = transaction.driverTimestamp?.toDate?.()
                          const dateString = timestamp 
                            ? timestamp.toLocaleDateString("ar-DZ", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "غير معروف"
                          const timeString = timestamp 
                            ? timestamp.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
                            : "--:--"
                          
                          return (
                            <motion.div
                              key={transaction.id}
                              data-demo-focus-target={isHistorySpotlight ? "history-transaction" : undefined}
                              data-demo-target={isHistorySpotlight ? "trip-history-first-card" : undefined}
                              className={`flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm${isHistorySpotlight ? " demo-step6-history-card" : ""}`}
                              variants={prefersReducedMotion ? undefined : isDemoTripsHistoryStep ? demoHistoryItemVariants : itemVariants}
                              initial={prefersReducedMotion
                                ? false
                                : isHistorySpotlight
                                ? { opacity: 0, y: 10, scale: 1 }
                                : undefined}
                              animate={prefersReducedMotion
                                ? { opacity: 1, y: 0 }
                                : isHistorySpotlight
                                ? { opacity: 1, y: 0, scale: [1, 1.08, 1.08, 1] }
                                : undefined}
                              transition={isHistorySpotlight && !prefersReducedMotion
                                ? {
                                    opacity: { duration: 0.22 },
                                    y: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                                    scale: { duration: 1.45, times: [0, 0.2, 0.56, 1], ease: [0.22, 1, 0.36, 1] },
                                  }
                                : undefined}
                              transformTemplate={({ y = 0, scale = 1 }) => `translate3d(0, ${y}px, 0) scale3d(${scale}, ${scale}, 1)`}
                              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                            >
                              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                isRecharge ? "bg-green-500/10" : "bg-red-500/10"
                              }`}>
                                {isRecharge ? (
                                  <ArrowUpCircle className="h-6 w-6 text-green-500" />
                                ) : (
                                  <ArrowDownCircle className="h-6 w-6 text-red-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">
                                    {isRecharge ? "شحن رصيد" : "أجرة حافلة"}
                                  </span>
                                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                    isRecharge 
                                      ? "bg-green-500/10 text-green-600" 
                                      : "bg-red-500/10 text-red-600"
                                  }`}>
                                    {isRecharge ? "Recharge" : "Deduction"}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{dateString}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{timeString}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className={`text-lg font-bold ${
                                  isRecharge ? "text-green-500" : "text-destructive"
                                }`} dir="ltr">
                                  {isRecharge ? "+" : "-"}{transaction.amount} د.ج
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  الرصيد: {transaction.newBalance} د.ج
                                </p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <BottomNav />
        </main>
      </PageTransition>
    </ErrorBoundary>
  )
}
