"use client"

import { useState } from "react"
import { Bell, Menu, Moon, Sun, MapPin, Clock, Settings, HelpCircle, Info, ChevronLeft, ScanLine, Loader2, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/lib/theme-context"
import { useDriverMode } from "@/lib/driver-mode-context"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationsDrawer } from "@/components/notifications-drawer"
import { TankoliLogoIcon } from "@/components/tanakoli-logo"

const menuItems = [
  { icon: MapPin, label: "المحطات القريبة", href: "/stations" },
  { icon: Clock, label: "سجل الرحلات", href: "/trips" },
  { icon: Settings, label: "الإعدادات", href: "/settings" },
  { icon: HelpCircle, label: "المساعدة", href: "/help" },
  { icon: Info, label: "حول التطبيق", href: "/about" },
]

export function AppHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { theme, toggleTheme, isDark } = useTheme()
  const { enterDriverMode, isAuthorizedDriver, isCheckingRole, roleError, clearRoleError } = useDriverMode()
  const { unreadCount } = useNotifications()

  const handleEnterDriverMode = async () => {
    const success = await enterDriverMode()
    if (success) {
      setIsOpen(false)
    }
    // If not successful, keep sidebar open to show error
  }

  return (
    <header
      className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-4 overflow-visible"
      style={{
        background: "linear-gradient(to bottom, rgba(7,20,40,0.72) 0%, rgba(7,20,40,0.0) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(16,185,129,0.10)",
      }}
    >
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-card/80 backdrop-blur-sm flex-shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full sm:w-[300px] lg:w-[320px] max-h-dvh flex-col border-l-0 bg-card/95 p-0 backdrop-blur-xl overflow-y-auto" style={{ zIndex: 9999 }}>
          <SheetHeader
            className="shrink-0 border-b p-4 sm:p-6"
            style={{
              background: "linear-gradient(135deg, #071428 0%, #0a2018 60%, #071428 100%)",
              borderColor: "rgba(16,185,129,0.18)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  border: "1px solid rgba(16,185,129,0.3)",
                  boxShadow: "0 0 20px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <img src="/logo-new.png" alt="تنقلي خنشلة" className="h-full w-full object-cover" />
              </div>
              <div className="text-right">
                <SheetTitle
                  className="text-base sm:text-lg font-bold"
                  style={{
                    background: "linear-gradient(90deg, #34D399, #ffffff 50%, #2DD4BF)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  تنقلي خنشلة
                </SheetTitle>
                <p className="text-xs text-emerald-400/70 tracking-wide">النقل الحضري</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-y-auto pb-10" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Dark Mode Toggle */}
            <div className="border-b border-border p-3 sm:p-4">
              <div className="flex items-center justify-between rounded-lg sm:rounded-xl bg-muted/50 p-2 sm:p-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg bg-primary/10">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={isDark ? "moon" : "sun"}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isDark ? (
                          <Moon className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                        ) : (
                          <Sun className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">الوضع الليلي</p>
                    <p className="text-xs text-muted-foreground">
                      {isDark ? "مفعّل" : "معطّل"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex flex-col p-2">
              {menuItems.map((item, index) => {
                // Define unique colors for each menu item
                const iconColors = [
                  { bg: "bg-gradient-to-br from-emerald-500/30 to-emerald-600/20", text: "text-emerald-400", glow: "group-hover:shadow-lg group-hover:shadow-emerald-500/50" },
                  { bg: "bg-gradient-to-br from-teal-500/30 to-teal-600/20", text: "text-teal-400", glow: "group-hover:shadow-lg group-hover:shadow-teal-500/50" },
                  { bg: "bg-gradient-to-br from-cyan-500/30 to-cyan-600/20", text: "text-cyan-400", glow: "group-hover:shadow-lg group-hover:shadow-cyan-500/50" },
                  { bg: "bg-gradient-to-br from-blue-500/30 to-blue-600/20", text: "text-blue-400", glow: "group-hover:shadow-lg group-hover:shadow-blue-500/50" },
                  { bg: "bg-gradient-to-br from-sky-500/30 to-sky-600/20", text: "text-sky-400", glow: "group-hover:shadow-lg group-hover:shadow-sky-500/50" },
                ]
                const color = iconColors[index]
                
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <motion.div
                      className={`group flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl p-2 sm:p-3 text-foreground transition-all hover:bg-muted/50 ${color.glow}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className={`flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg ${color.bg} transition-all duration-300 ${color.glow}`}
                        style={{
                          backdropFilter: 'blur(8px)',
                          borderWidth: '1px',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          boxShadow: `0 0 20px ${index === 0 ? 'rgba(16, 185, 129, 0.3)' : index === 1 ? 'rgba(20, 184, 166, 0.3)' : index === 2 ? 'rgba(34, 211, 238, 0.3)' : index === 3 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`
                        }}
                      >
                        <item.icon className={`h-4 sm:h-5 w-4 sm:w-5 ${color.text} transition-colors`} />
                      </div>
                      <span className="flex-1 font-medium text-sm sm:text-base">{item.label}</span>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </motion.div>
                  </Link>
                )
              })}
            </nav>

            {/* Driver Mode Switch — only visible to authorized driver phones */}
            {isAuthorizedDriver && (
              <div className="mt-auto border-t border-border p-3 sm:p-4">
                <AnimatePresence>
                  {roleError && (
                    <motion.div
                      className="mb-3 flex items-start gap-2 rounded-lg sm:rounded-xl bg-destructive/10 p-2 sm:p-3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AlertCircle className="mt-0.5 h-4 sm:h-5 w-4 sm:w-5 shrink-0 text-destructive" />
                      <p className="flex-1 text-xs sm:text-sm text-destructive">{roleError}</p>
                      <button
                        onClick={clearRoleError}
                        className="shrink-0 text-destructive/60 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleEnterDriverMode}
                  disabled={isCheckingRole}
                  className="flex w-full items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 p-3 sm:p-4 text-white text-sm sm:text-base transition-all hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg bg-white/20 flex-shrink-0">
                    {isCheckingRole ? (
                      <Loader2 className="h-4 sm:h-5 w-4 sm:w-5 animate-spin" />
                    ) : (
                      <ScanLine className="h-4 sm:h-5 w-4 sm:w-5" />
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-sm sm:text-base">
                      {isCheckingRole ? "جارٍ التحقق..." : "التبديل إلى وضع السائق"}
                    </p>
                    <p className="text-xs opacity-80">Driver Mode</p>
                  </div>
                  {!isCheckingRole && <ChevronLeft className="h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />}
                </button>
              </div>
            )}

            {/* Version info */}
            <div className="border-t border-border p-3 sm:p-4">
              <p className="text-center text-xs text-muted-foreground">
                الإصدار 1.0.0 - تنقلي خنشلة
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end overflow-visible">
        <div className="flex flex-col items-end min-w-0">
          <h1
            className="text-base sm:text-lg font-bold truncate"
            style={{
              background: "linear-gradient(90deg, #34D399, #ffffff 50%, #2DD4BF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px rgba(16,185,129,0.35))",
            }}
          >
            تنقلي خنشلة
          </h1>
          <span className="text-xs text-emerald-400/70 tracking-wide">النقل الحضري</span>
        </div>
        <div
          className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center overflow-hidden"
          style={{
            border: "1px solid rgba(16,185,129,0.25)",
            boxShadow: "0 0 18px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <img src="/logo-new.png" alt="تنقلي خنشلة" className="h-full w-full object-cover" />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-card/80 backdrop-blur-sm relative flex-shrink-0"
        onClick={() => setNotifOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  )
}
