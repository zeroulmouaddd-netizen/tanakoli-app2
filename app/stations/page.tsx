"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { StopsBackground } from "@/components/stops-background"
import { MapPin, Bus, Search, Clock, X, ArrowLeft, Wallet, Navigation } from "lucide-react"
import { useRouter } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/skeleton-loader"
import { PageTransition } from "@/components/page-transition"
import { useRouteSearch } from "@/hooks/use-routes"
import type { BusRoute, RouteCategory } from "@/lib/types/routes"

// Animation variants
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    }
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    }
  },
}

// Route Card Skeleton
function RouteCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

// Category Tab Component - Urban only
function CategoryTabs({ 
  activeCategory, 
  onCategoryChange 
}: { 
  activeCategory: RouteCategory
  onCategoryChange: (category: RouteCategory) => void 
}) {
  return null // Hidden since only urban routes exist
}

// Expanded Route View Component - Urban only
function RouteDetailView({ route, onClose }: { route: BusRoute; onClose: () => void }) {
  const router = useRouter()
  
  const handleShowOnMap = (stationName: string) => {
    router.push(`/?station=${encodeURIComponent(stationName)}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg rounded-t-3xl bg-card pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        
        {/* Header */}
        <div className="px-4 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${route.color}20` }}
              >
                <Bus className="h-6 w-6" style={{ color: route.color }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{route.name}</h2>
                <p className="text-sm text-muted-foreground">{route.nameEn}</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </motion.button>
          </div>
          
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="font-medium">{route.price} دج</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{route.workingHours.start} - {route.workingHours.end}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Bus className="h-4 w-4" />
                <span>كل {route.frequency} د</span>
              </div>
            </div>
        </div>
        
        {/* Stops List */}
        <div className="max-h-[50vh] overflow-y-auto px-4 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            المحطات ({route.stops.length})
          </h3>
          <div className="space-y-1">
            {route.stops.sort((a, b) => a.order - b.order).map((stop, index) => (
              <motion.div
                key={stop.id}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div 
                      className={`h-4 w-4 rounded-full border-2 ${
                        index === 0 || index === route.stops.length - 1 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground/60 bg-card"
                      }`}
                      style={index === 0 || index === route.stops.length - 1 ? { borderColor: route.color, backgroundColor: route.color } : {}}
                    />
                    {index < route.stops.length - 1 && (
                      <div className="h-8 w-0.5 bg-muted-foreground/30" />
                    )}
                  </div>
                
                {/* Stop Info */}
                <motion.button
                  onClick={() => handleShowOnMap(stop.name)}
                  className="flex flex-1 items-center justify-between rounded-xl p-2 hover:bg-muted/50 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <div>
                    <p className="font-semibold text-foreground">{stop.name}</p>
                    <p className="text-xs text-muted-foreground">{stop.nameEn}</p>
                  </div>
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Urban Route Card Component
function UrbanRouteCard({ route, onSelect }: { route: BusRoute; onSelect: () => void }) {
  return (
    <motion.div
      className="overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
      variants={itemVariants}
      layout
    >
      <motion.button
        className="w-full p-4 text-right"
        onClick={onSelect}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${route.color}20` }}
            >
              <Bus className="h-6 w-6" style={{ color: route.color }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{route.name}</h3>
              <p className="text-sm text-muted-foreground">{route.stops.length} محطات</p>
            </div>
          </div>
          
          {/* Price Badge */}
          <div 
            className="rounded-lg px-3 py-1.5"
            style={{ backgroundColor: `${route.color}15` }}
          >
            <span className="text-sm font-bold" style={{ color: route.color }}>
              {route.price} دج
            </span>
          </div>
        </div>
        
        {/* Quick Info */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{route.workingHours.start} - {route.workingHours.end}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bus className="h-3.5 w-3.5" />
            <span>كل {route.frequency} دقيقة</span>
          </div>
        </div>
        
        {/* First and Last Stop Preview */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {route.stops[0]?.name}
          </span>
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {route.stops[route.stops.length - 1]?.name}
          </span>
        </div>
      </motion.button>
    </motion.div>
  )
}

export default function StationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null)
  const [activeCategory, setActiveCategory] = useState<RouteCategory>("urban")
  
  const { matchedRoutes, isLoading } = useRouteSearch(searchQuery, "urban")

  return (
    <ErrorBoundary>
      <PageTransition>
        <main className="relative min-h-screen bg-background pb-28 md:pb-32">
          {/* Animated Background */}
          <StopsBackground />
          
          {/* Content */}
          <div className="relative z-10">
            <AppHeader />
          
            <div className="px-4 pt-20">
            {/* Header */}
            <motion.div
              className="mb-4 flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">خطوط ولاية خنشلة</h1>
                <p className="text-sm text-muted-foreground">
                  {matchedRoutes.length} خط متوفر
                </p>
              </div>
            </motion.div>

            {/* Category Tabs */}
            {/* Hidden - Urban routes only */}

            {/* Search Bar */}
            <motion.div
              className="relative mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن خط أو محطة... مثال: الجامعة"
                className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Search Results Count */}
            <AnimatePresence>
              {searchQuery && (
                <motion.p
                  className="mb-3 text-sm text-muted-foreground"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {matchedRoutes.length === 0 
                    ? "لا توجد نتائج" 
                    : `${matchedRoutes.length} خط مطابق`}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Loading State */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <RouteCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {/* Routes List */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key="urban"
                    className="space-y-3"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    {matchedRoutes.map((route) => (
                      <UrbanRouteCard 
                        key={route.id} 
                        route={route} 
                        onSelect={() => setSelectedRoute(route)}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>

                {/* Empty State */}
                <AnimatePresence>
                  {matchedRoutes.length === 0 && (
                    <motion.div
                      className="flex flex-col items-center justify-center py-12"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Bus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-lg font-medium text-foreground">
                        {searchQuery ? "لا توجد خطوط مطابقة" : "لا توجد خطوط"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {searchQuery 
                          ? "جرب البحث بكلمات مختلفة" 
                          : "لا توجد خطوط داخلية حاليا"
                        }
                      </p>
                      {searchQuery && (
                        <motion.button
                          onClick={() => setSearchQuery("")}
                          className="mt-4 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
                          whileTap={{ scale: 0.95 }}
                        >
                          عرض جميع ال��طوط
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
          </div>

          <BottomNav />
        </main>
      </PageTransition>
      
      {/* Route Detail Modal */}
      <AnimatePresence>
        {selectedRoute && (
          <RouteDetailView 
            route={selectedRoute} 
            onClose={() => setSelectedRoute(null)} 
          />
        )}
      </AnimatePresence>
    </ErrorBoundary>
  )
}
