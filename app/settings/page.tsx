"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { SettingsBackground } from "@/components/settings-background"
import { Settings, Bell, Volume2, Globe, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { PageTransition } from "@/components/page-transition"

type Language = "ar" | "fr" | "en"

const languages = [
  { code: "ar" as Language, name: "العربية", nativeName: "العربية" },
  { code: "fr" as Language, name: "Français", nativeName: "Français" },
  { code: "en" as Language, name: "English", nativeName: "English" },
]

export default function SettingsPage() {
  const router = useRouter()
  
  // Settings state - persisted to localStorage
  const [tripNotifications, setTripNotifications] = useState(true)
  const [alertSounds, setAlertSounds] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("ar")
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    setHasMounted(true)
    try {
      const savedNotifications = localStorage.getItem("tripNotifications")
      const savedSounds = localStorage.getItem("alertSounds")
      const savedLanguage = localStorage.getItem("appLanguage") as Language
      
      if (savedNotifications !== null) setTripNotifications(savedNotifications === "true")
      if (savedSounds !== null) setAlertSounds(savedSounds === "true")
      if (savedLanguage) setSelectedLanguage(savedLanguage)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Save settings to localStorage when changed
  const handleTripNotificationsChange = (value: boolean) => {
    setTripNotifications(value)
    try {
      localStorage.setItem("tripNotifications", String(value))
    } catch {
      // Ignore
    }
  }

  const handleAlertSoundsChange = (value: boolean) => {
    setAlertSounds(value)
    try {
      localStorage.setItem("alertSounds", String(value))
    } catch {
      // Ignore
    }
  }

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLanguage(lang)
    setShowLanguageSelector(false)
    try {
      localStorage.setItem("appLanguage", lang)
    } catch {
      // Ignore
    }
  }

  const currentLanguage = languages.find(l => l.code === selectedLanguage)

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-background pb-40">
        {/* Animated Background */}
        <SettingsBackground />
        
        {/* Content */}
        <div className="relative z-10">
          <AppHeader />
        
        <div className="px-3 sm:px-4 md:px-6 pt-16 sm:pt-20">
          {/* Back Button */}
          <motion.button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 sm:h-5 w-4 sm:w-5" />
            <span>رجوع</span>
          </motion.button>

          {/* Page Header */}
          <motion.div
            className="mb-6 flex items-center gap-2 sm:gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex-shrink-0">
              <Settings className="h-5 sm:h-6 w-5 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">الإعدادات</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">تخصيص تجربتك</p>
            </div>
          </motion.div>

          {/* Settings Sections */}
          <div className="space-y-3 sm:space-y-4">
            {/* Notifications Section */}
            <motion.div
              className="rounded-lg sm:rounded-2xl bg-card p-3 sm:p-4 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                <Bell className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                الإشعارات
              </h2>
              
              <div className="space-y-3">
                {/* Trip Notifications */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg sm:rounded-xl bg-muted/50 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-1">
                    <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Bell className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-foreground">إشعارات الرحلات</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">تنبيهات وصول الحافلة</p>
                    </div>
                  </div>
                  {hasMounted && (
                    <Switch
                      checked={tripNotifications}
                      onCheckedChange={handleTripNotificationsChange}
                      className="data-[state=checked]:bg-primary order-1 sm:order-2"
                    />
                  )}
                </div>

                {/* Alert Sounds */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg sm:rounded-xl bg-muted/50 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-1">
                    <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Volume2 className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-foreground">صوت التنبيهات</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">تشغيل الأصوات</p>
                    </div>
                  </div>
                  {hasMounted && (
                    <Switch
                      checked={alertSounds}
                      onCheckedChange={handleAlertSoundsChange}
                      className="data-[state=checked]:bg-primary order-1 sm:order-2"
                    />
                  )}
                </div>
              </div>
            </motion.div>



            {/* Language Section */}
            <motion.div
              className="rounded-lg sm:rounded-2xl bg-card p-3 sm:p-4 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                <Globe className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                اللغة
              </h2>
              
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-muted/50 p-3 sm:p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-1">
                  <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Globe className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-medium text-foreground">لغة التطبيق</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{currentLanguage?.nativeName}</p>
                  </div>
                </div>
                <ChevronLeft className={`h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground transition-transform order-1 sm:order-2 flex-shrink-0 ${showLanguageSelector ? "rotate-90" : ""}`} />
              </button>

              {/* Language Options */}
              {showLanguageSelector && (
                <motion.div
                  className="mt-3 space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-lg sm:rounded-xl p-3 sm:p-4 transition-colors ${
                        selectedLanguage === lang.code
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 order-2 sm:order-1">
                        <span className="text-base sm:text-lg font-medium text-foreground">{lang.nativeName}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">({lang.name})</span>
                      </div>
                      {selectedLanguage === lang.code && (
                        <div className="flex h-5 sm:h-6 w-5 sm:w-6 items-center justify-center rounded-full bg-primary order-1 sm:order-2 flex-shrink-0">
                          <Check className="h-3 sm:h-4 w-3 sm:w-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        </div>

        <BottomNav />
      </main>
    </PageTransition>
  )
}
