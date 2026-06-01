"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { AccountBackground } from "@/components/account-background"
import {
  User, Phone, Wallet, QrCode, X, Loader2, Mail, MapPin,
  Pencil, Save, CreditCard, LogOut,
} from "lucide-react"
import { useDriverMode } from "@/lib/driver-mode-context"
import { db, auth } from "@/lib/firebase"
import { doc, updateDoc, increment } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"
import { useUserCache } from "@/hooks/use-user-cache"
import { useAuth } from "@/lib/auth-context"
import { BalanceCardSkeleton, ProfileInfoSkeleton } from "@/components/skeleton-loader"
import { PageTransition } from "@/components/page-transition"
import { QRRechargeModal } from "@/components/qr-recharge-modal"

export default function AccountPage() {
  const { userData, isLoading } = useUserCache()
  const { firestoreUserId } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpMethod, setTopUpMethod] = useState<"code" | "driver">("code")
  const [topUpCode, setTopUpCode] = useState("")
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [topUpError, setTopUpError] = useState("")

  const [showQRCode, setShowQRCode] = useState(false)
  const [showQRRecharge, setShowQRRecharge] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [displayBalance, setDisplayBalance] = useState(userData?.balance ?? 0)

  const { toast } = useToast()
  const { exitDriverMode } = useDriverMode()

  const VALID_TOPUP_CODE = "KHENCHELA2026"
  const TOPUP_AMOUNT = 500

  useEffect(() => {
    if (userData) {
      setEditFullName(userData.fullName || "")
      setEditEmail(userData.email || "")
      setEditAddress(userData.address || "")
      setDisplayBalance(userData.balance ?? 0)
    }
  }, [userData])

  const handleSaveProfile = async () => {
    if (!firestoreUserId) return
    setIsSaving(true)
    try {
      await updateDoc(doc(db, "users", firestoreUserId), {
        fullName: editFullName,
        email: editEmail,
        address: editAddress,
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTopUp = async () => {
    if (!firestoreUserId) return
    setTopUpError("")
    if (topUpCode.trim().toUpperCase() !== VALID_TOPUP_CODE) {
      setTopUpError("رمز الشحن غير صحيح")
      return
    }
    setTopUpLoading(true)
    try {
      await updateDoc(doc(db, "users", firestoreUserId), { balance: increment(TOPUP_AMOUNT) })
      toast({ title: "تم شحن رصيدك بنجاح", description: `تمت إضافة ${TOPUP_AMOUNT} د.ج إلى رصيدك`, duration: 5000 })
      setShowTopUp(false)
      setTopUpCode("")
    } catch (error) {
      console.error("Error topping up:", error)
      setTopUpError("حدث خطأ أثناء الشحن. حاول مرة أخرى")
    } finally {
      setTopUpLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      exitDriverMode()
      await signOut(auth)
      try {
        localStorage.removeItem("tanoukli_user_cache")
        localStorage.removeItem("tanoukli_trips_cache")
        localStorage.removeItem("tanoukli_transactions_cache")
        localStorage.removeItem("tanoukli_driver_mode")
        sessionStorage.removeItem("splashShown")
        sessionStorage.removeItem("tanakoli_is_driver")
      } catch {}
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutConfirm(false)
    }
  }

  const qrCodeData = JSON.stringify({
    userId: firestoreUserId || "",
    name: userData?.fullName || "",
    phone: userData?.Phone || firestoreUserId || "",
    timestamp: Date.now(),
  })

  if (isLoading && !userData) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-background pb-40">
          <AppHeader />
          <div className="px-4 pt-20">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">حسابي</h1>
                <p className="text-sm text-muted-foreground">جاري التحميل...</p>
              </div>
            </div>
            <div className="space-y-4">
              <BalanceCardSkeleton />
              <ProfileInfoSkeleton />
            </div>
          </div>
          <BottomNav />
        </main>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-background pb-40">
        {/* Animated Background */}
        <AccountBackground />
        
        {/* Content Overlay */}
        <div className="relative z-10">
          <AppHeader />

        <div className="px-4 pt-20">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">حسابي</h1>
              <p className="text-sm text-muted-foreground">
                {userData ? `مرحباً، ${userData.fullName}` : "حسابي"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Balance Card with Enhanced Design */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary/80 p-5 shadow-lg">
              {/* Shine Effect */}
              <div className="absolute inset-0 shine-effect"></div>
              
              {/* Watermark - Bus/Road Icon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground">
                  {/* Bus Icon */}
                  <path d="M8 6h8M6 6h12v10H6zM6 16h12v1H6z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="15" r="1.5" fill="currentColor" />
                  <circle cx="15.5" cy="15" r="1.5" fill="currentColor" />
                  {/* Road Lines */}
                  <line x1="8" y1="18" x2="16" y2="18" strokeLinecap="round" />
                  <line x1="8" y1="20" x2="16" y2="20" strokeLinecap="round" />
                </svg>
              </div>

              {/* Glow Gradient Layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

              {/* Content */}
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary-foreground" />
                    <h3 className="font-bold text-primary-foreground">محفظتي</h3>
                  </div>
                  <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-medium text-primary-foreground">نشط</span>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-primary-foreground/80">الرصيد الحالي</p>
                  <div className="text-3xl font-bold text-primary-foreground" dir="ltr">
                    {displayBalance.toLocaleString("ar-DZ")} <span className="text-lg">د.ج</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowQRCode(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-foreground py-3 font-medium text-primary transition-colors hover:bg-primary-foreground/90"
                  >
                    <QrCode className="h-5 w-5" />
                    <span>رمز الدفع</span>
                  </button>
                  <button
                    onClick={() => setShowTopUp(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-foreground/20 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/30"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span>شحن الرصيد</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">المعلومات الشخصية</h3>
                    <p className="text-sm text-muted-foreground">بيانات حسابك</p>
                  </div>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>تعديل</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsEditing(false); if (userData) { setEditFullName(userData.fullName || ""); setEditEmail(userData.email || ""); setEditAddress(userData.address || "") } }}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >إلغاء</button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>حفظ</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {[
                  { icon: User, label: "الاسم الكامل", value: userData?.fullName, field: "fullName", editValue: editFullName, onChange: setEditFullName, type: "text" },
                  { icon: Mail, label: "البريد الإلكتروني", value: userData?.email, field: "email", editValue: editEmail, onChange: setEditEmail, type: "email", dir: "ltr" as const },
                  { icon: MapPin, label: "العنوان", value: userData?.address, field: "address", editValue: editAddress, onChange: setEditAddress, type: "text" },
                ].map(({ icon: Icon, label, value, editValue, onChange, type, dir }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      {isEditing ? (
                        <input
                          type={type}
                          value={editValue}
                          onChange={(e) => onChange(e.target.value)}
                          dir={dir}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground" dir={dir}>{value || "—"}</p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                    <p className="text-sm font-medium text-foreground" dir="ltr">
                      {userData?.Phone || firestoreUserId || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-4 font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Logout Confirm */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-bold text-foreground">تسجيل الخروج</h3>
              <p className="mb-6 text-sm text-muted-foreground">هل أنت متأكد من تسجيل الخروج من حسابك؟</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">إلغاء</button>
                <button onClick={handleLogout} disabled={isLoggingOut} className="flex-1 rounded-xl bg-destructive py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
                  {isLoggingOut ? <div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>جاري الخروج...</span></div> : "تسجيل الخروج"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Modal */}
        {showQRCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">رمز الدفع</h3>
                <button onClick={() => setShowQRCode(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="mb-4 flex justify-center">
                <div className="rounded-2xl bg-white p-4 shadow-inner">
                  <QRCodeSVG value={qrCodeData} size={180} level="H" bgColor="#ffffff" fgColor="#000000" />
                </div>
              </div>
              <div className="mb-4 text-center">
                <p className="text-sm text-muted-foreground">قم بمسح الرمز للدفع</p>
                <p className="mt-1 text-lg font-bold text-primary">30.00 د.ج</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">صالح لمدة 5 دقائق | المستخدم: {userData?.fullName || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* QR Recharge Modal */}
        <QRRechargeModal 
          isOpen={showQRRecharge}
          onClose={() => setShowQRRecharge(false)}
          currentBalance={displayBalance}
          onBalanceUpdate={(newBalance) => setDisplayBalance(newBalance)}
        />

        {/* Top-up Modal */}
        {showTopUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">شحن الرصيد</h3>
                <button onClick={() => { setShowTopUp(false); setTopUpCode(""); setTopUpError("") }} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="mb-6 flex gap-2 rounded-xl bg-muted p-1">
                {(["code", "driver"] as const).map((m) => (
                  <button key={m} onClick={() => setTopUpMethod(m)} className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${topUpMethod === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {m === "code" ? "شحن برمز" : "شحن عبر السائق"}
                  </button>
                ))}
              </div>
              {topUpMethod === "code" ? (
                <>
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-muted-foreground">أدخل رمز الشحن للحصول على</p>
                    <p className="mt-1 text-2xl font-bold text-primary">500 د.ج</p>
                  </div>
                  <input
                    type="text"
                    value={topUpCode}
                    onChange={(e) => { setTopUpCode(e.target.value.toUpperCase()); setTopUpError("") }}
                    placeholder="أدخل رمز الشحن"
                    className="mb-1 w-full rounded-xl border border-border bg-input py-3 px-4 text-center text-lg font-bold tracking-widest text-foreground placeholder:text-muted-foreground placeholder:font-normal placeholder:tracking-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    dir="ltr"
                  />
                  {topUpError && <p className="mb-3 text-center text-sm text-destructive">{topUpError}</p>}
                  <button
                    onClick={handleTopUp}
                    disabled={!topUpCode.trim() || topUpLoading}
                    className="mt-3 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {topUpLoading ? <div className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><span>جاري الشحن...</span></div> : "تأكيد الشحن"}
                  </button>
                  <p className="mt-4 text-center text-xs text-muted-foreground">للتجربة، استخدم الرمز: KHENCHELA2026</p>
                </>
              ) : (
                <div className="py-6 text-center">
                  <button
                    onClick={() => { setShowTopUp(false); setShowQRRecharge(true) }}
                    className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    شحن عبر السائق
                  </button>
                  <p className="mt-4 text-xs text-muted-foreground">اطلب من السائق مسح رمز الاستجابة السريعة (QR) لشحن رصيدك</p>
                </div>
              )}
            </div>
          </div>
        )}

        </div>

        <BottomNav />
      </main>
    </PageTransition>
  )
}
