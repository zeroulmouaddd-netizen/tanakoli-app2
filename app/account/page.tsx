"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import {
  User, Phone, LogIn, Check, Wallet, QrCode, X, Shield, ArrowRight,
  Loader2, Mail, MapPin, Pencil, Save, CreditCard, LogOut, ChevronLeft,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useDriverMode } from "@/lib/driver-mode-context"
import { db, auth } from "@/lib/firebase"
import { doc, updateDoc, increment, setDoc } from "firebase/firestore"
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  type ConfirmationResult,
} from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"
import { useUserCache } from "@/hooks/use-user-cache"
import { useAuth } from "@/lib/auth-context"
import { useApp } from "@/components/app-wrapper"
import { BalanceCardSkeleton, ProfileInfoSkeleton } from "@/components/skeleton-loader"
import { PageTransition } from "@/components/page-transition"

type LoginStep = "form" | "verification" | "success"

export default function AccountPage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [loginStep, setLoginStep] = useState<LoginStep>("form")
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""])
  const [codeError, setCodeError] = useState("")
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [loginError, setLoginError] = useState("")

  const confirmationResultRef = useRef<ConfirmationResult | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

  const { userData, isLoading: userDataLoading } = useUserCache()
  const { currentUser, firestoreUserId } = useAuth()
  const isLoggedIn = !!currentUser

  useEffect(() => {
    setHasMounted(true)
  }, [])

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { toast } = useToast()
  const { logout: appLogout } = useApp()
  const router = useRouter()
  const { enterDriverMode } = useDriverMode()

  const VALID_TOPUP_CODE = "KHENCHELA2026"
  const TOPUP_AMOUNT = 500

  useEffect(() => {
    if (userData) {
      setEditFullName(userData.fullName || "")
      setEditEmail(userData.email || "")
      setEditAddress(userData.address || "")
    }
  }, [userData])

  useEffect(() => {
    if (loginStep === "verification") {
      setResendTimer(60)
      setCanResend(false)
    }
  }, [loginStep])

  useEffect(() => {
    if (loginStep !== "verification" || canResend) return
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [loginStep, canResend])

  const formatPhoneForFirebase = (localPhone: string): string => {
    const digits = localPhone.replace(/\D/g, "")
    if (digits.startsWith("0")) return "+213" + digits.slice(1)
    if (digits.startsWith("213")) return "+" + digits
    return "+213" + digits
  }

  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear()
      recaptchaVerifierRef.current = null
    }
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible" }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) return

    setLoginError("")
    setIsSendingCode(true)

    try {
      initRecaptcha()
      const formattedPhone = formatPhoneForFirebase(phone)
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current!
      )
      confirmationResultRef.current = confirmationResult
      setLoginStep("verification")
    } catch (error: any) {
      console.error("Error sending verification code:", error)
      if (error.code === "auth/invalid-phone-number") {
        setLoginError("رقم الهاتف غير صحيح. تأكد من الصيغة الصحيحة.")
      } else if (error.code === "auth/too-many-requests") {
        setLoginError("تم إرسال طلبات كثيرة. يرجى المحاولة لاحقاً.")
      } else {
        setLoginError("حدث خطأ أثناء إرسال الرمز. حاول مرة أخرى.")
      }
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleResendCode = useCallback(async () => {
    if (!canResend) return
    setResendTimer(60)
    setCanResend(false)
    setCodeError("")
    setIsSendingCode(true)
    try {
      initRecaptcha()
      const formattedPhone = formatPhoneForFirebase(phone)
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current!
      )
      confirmationResultRef.current = confirmationResult
    } catch (error) {
      console.error("Error resending code:", error)
      setCodeError("حدث خطأ أثناء إعادة الإرسال. حاول مرة أخرى.")
    } finally {
      setIsSendingCode(false)
    }
  }, [canResend, phone])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return
    const newCode = [...verificationCode]
    newCode[index] = value
    setVerificationCode(newCode)
    setCodeError("")
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus()
    }
  }

  const handleVerifyCode = async () => {
    const code = verificationCode.join("")
    if (code.length < 6 || !confirmationResultRef.current) return

    setIsVerifying(true)
    setCodeError("")

    try {
      const result = await confirmationResultRef.current.confirm(code)
      const user = result.user

      if (user.phoneNumber) {
        const docId = user.phoneNumber.startsWith("+213")
          ? "0" + user.phoneNumber.slice(4)
          : user.phoneNumber

        const userDocRef = doc(db, "users", docId)
        try {
          await setDoc(
            userDocRef,
            {
              Phone: docId,
              fullName: name || "",
              email: "",
              address: "",
              balance: 0,
              role: "passenger",
            },
            { merge: true }
          )
        } catch (firestoreError) {
          console.error("Error creating user doc:", firestoreError)
        }
      }

      setLoginStep("success")
      setTimeout(() => {
        setLoginStep("form")
        setVerificationCode(["", "", "", "", "", ""])
        setName("")
        setPhone("")
      }, 1500)
    } catch (error: any) {
      console.error("Error verifying code:", error)
      if (error.code === "auth/invalid-verification-code") {
        setCodeError("رمز التحقق غير صحيح. تحقق من الرمز وحاول مرة أخرى.")
      } else if (error.code === "auth/code-expired") {
        setCodeError("انتهت صلاحية الرمز. اضغط على إعادة الإرسال.")
      } else {
        setCodeError("حدث خطأ أثناء التحقق. حاول مرة أخرى.")
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleBackToForm = () => {
    setLoginStep("form")
    setVerificationCode(["", "", "", "", "", ""])
    setCodeError("")
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear()
      recaptchaVerifierRef.current = null
    }
  }

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
    try {
      localStorage.removeItem("tanoukli_user_cache")
      localStorage.removeItem("tanoukli_trips_cache")
      localStorage.removeItem("tanoukli_transactions_cache")
      localStorage.removeItem("tanoukli_driver_mode")
    } catch {
      // Ignore
    }
    setShowLogoutConfirm(false)
    setIsLoggingOut(false)
    appLogout()
  }

  const handleStartEdit = () => {
    if (userData) {
      setEditFullName(userData.fullName || "")
      setEditEmail(userData.email || "")
      setEditAddress(userData.address || "")
    }
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (userData) {
      setEditFullName(userData.fullName || "")
      setEditEmail(userData.email || "")
      setEditAddress(userData.address || "")
    }
  }

  const handleSaveProfile = async () => {
    if (!firestoreUserId) return
    setIsSaving(true)
    try {
      const userDocRef = doc(db, "users", firestoreUserId)
      await updateDoc(userDocRef, {
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
      const userDocRef = doc(db, "users", firestoreUserId)
      await updateDoc(userDocRef, { balance: increment(TOPUP_AMOUNT) })
      toast({
        title: "تم شحن رصيدك بنجاح",
        description: `تمت إضافة ${TOPUP_AMOUNT} د.ج إلى رصيدك`,
        duration: 5000,
      })
      setShowTopUp(false)
      setTopUpCode("")
    } catch (error) {
      console.error("Error topping up:", error)
      setTopUpError("حدث خطأ أثناء الشحن. حاول مرة أخرى")
    } finally {
      setTopUpLoading(false)
    }
  }

  const handleCloseTopUp = () => {
    setShowTopUp(false)
    setTopUpCode("")
    setTopUpError("")
    setTopUpMethod("code")
  }

  const qrCodeData = JSON.stringify({
    userId: firestoreUserId || "",
    name: userData?.fullName || "",
    phone: userData?.Phone || firestoreUserId || "",
    timestamp: Date.now(),
  })

  if (!hasMounted || (userDataLoading && !userData && isLoggedIn)) {
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
      <main className="min-h-screen bg-background pb-40">
        <AppHeader />

        <div id="recaptcha-container" />

        <div className="px-4 pt-20">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">حسابي</h1>
              <p className="text-sm text-muted-foreground">
                {isLoggedIn && userData
                  ? `مرحباً، ${userData.fullName}`
                  : "تسجيل الدخول أو إنشاء حساب"}
              </p>
            </div>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <LogIn className="h-10 w-10 text-primary" />
                </div>
              </div>

              <h2 className="mb-2 text-center text-lg font-bold text-foreground">
                أهلاً بك في تنقلي خنشلة
              </h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                سجل دخولك لحفظ مساراتك المفضلة
              </p>

              {loginStep === "success" ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                    <Check className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">تم التحقق بنجاح!</p>
                </div>
              ) : loginStep === "verification" ? (
                <div className="space-y-6">
                  <button
                    onClick={handleBackToForm}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>رجوع</span>
                  </button>

                  <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">التحقق من رقم الهاتف</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      تم إرسال رمز التحقق (6 أرقام) إلى رقمك
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary" dir="ltr">{phone}</p>
                  </div>

                  <div className="flex justify-center gap-2" dir="ltr">
                    {verificationCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && index > 0) {
                            document.getElementById(`code-${index - 1}`)?.focus()
                          }
                        }}
                        className={`h-12 w-10 rounded-xl border-2 bg-input text-center text-xl font-bold text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          codeError ? "border-destructive" : "border-border"
                        }`}
                      />
                    ))}
                  </div>

                  {codeError && (
                    <p className="text-center text-sm text-destructive">{codeError}</p>
                  )}

                  <button
                    onClick={handleVerifyCode}
                    disabled={verificationCode.some((d) => !d) || isVerifying}
                    className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري التحقق...</span>
                      </div>
                    ) : (
                      "تأكيد الرمز"
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">لم تستلم الرمز؟</p>
                    <button
                      onClick={handleResendCode}
                      disabled={!canResend || isSendingCode}
                      className={`font-medium text-sm transition-colors ${
                        canResend
                          ? "text-primary hover:underline cursor-pointer"
                          : "text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {isSendingCode ? (
                        <div className="flex items-center justify-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>جاري الإرسال...</span>
                        </div>
                      ) : canResend ? (
                        "إعادة الإرسال"
                      ) : (
                        <span>
                          إعادة الإرسال بعد{" "}
                          <span className="inline-block w-8 text-center font-bold tabular-nums">
                            {resendTimer}
                          </span>{" "}
                          ثانية
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      الاسم الكامل
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أدخل اسمك"
                        className="w-full rounded-xl border border-border bg-input py-3 pr-10 pl-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      رقم الهاتف
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          setLoginError("")
                        }}
                        placeholder="07XX XXX XXX"
                        className="w-full rounded-xl border border-border bg-input py-3 pr-10 pl-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-center text-sm text-destructive">{loginError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingCode}
                    className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingCode ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري إرسال الرمز...</span>
                      </div>
                    ) : (
                      "تسجيل الدخول"
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Balance Card */}
              <div className="rounded-2xl bg-gradient-to-l from-primary to-primary/80 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary-foreground" />
                    <h3 className="font-bold text-primary-foreground">محفظتي</h3>
                  </div>
                  <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-medium text-primary-foreground">
                    نشط
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-primary-foreground/80">الرصيد الحالي</p>
                  <div className="text-3xl font-bold text-primary-foreground" dir="ltr">
                    {((userData?.balance ?? 0)).toLocaleString("ar-DZ")}{" "}
                    <span className="text-lg">د.ج</span>
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
                      onClick={handleStartEdit}
                      className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>تعديل</span>
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>حفظ</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">الاسم الكامل</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground">{userData?.fullName || "—"}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          dir="ltr"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground" dir="ltr">{userData?.email || "—"}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">العنوان</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground">{userData?.address || "—"}</p>
                      )}
                    </div>
                  </div>

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

              {/* Logout Button */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-4 font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-bold text-foreground">تسجيل الخروج</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                هل أنت متأكد من تسجيل الخروج من حسابك؟
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  disabled={isLoggingOut}
                  className="flex-1 rounded-xl bg-destructive py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري الخروج...</span>
                    </div>
                  ) : (
                    "تسجيل الخروج"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRCode && userData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">رمز الدفع</h3>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4 flex justify-center">
                <div className="rounded-2xl bg-white p-4 shadow-inner">
                  <QRCodeSVG
                    value={qrCodeData}
                    size={180}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>
              <div className="mb-4 text-center">
                <p className="text-sm text-muted-foreground">قم بمسح الرمز للدفع</p>
                <p className="mt-1 text-lg font-bold text-primary">30.00 د.ج</p>
                <p className="text-xs text-muted-foreground">سعر التذكرة الواحدة</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  صالح لمدة 5 دقائق | المستخدم: {userData.fullName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top-up Modal */}
        {showTopUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">شحن الرصيد</h3>
                <button
                  onClick={handleCloseTopUp}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 flex gap-2 rounded-xl bg-muted p-1">
                <button
                  onClick={() => setTopUpMethod("code")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    topUpMethod === "code"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  شحن برمز
                </button>
                <button
                  onClick={() => setTopUpMethod("driver")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    topUpMethod === "driver"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  شحن عبر السائق
                </button>
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
                  <div className="mb-4">
                    <input
                      type="text"
                      value={topUpCode}
                      onChange={(e) => {
                        setTopUpCode(e.target.value.toUpperCase())
                        setTopUpError("")
                      }}
                      placeholder="أدخل رمز الشحن"
                      className="w-full rounded-xl border border-border bg-input py-3 px-4 text-center text-lg font-bold tracking-widest text-foreground placeholder:text-muted-foreground placeholder:font-normal placeholder:tracking-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      dir="ltr"
                    />
                    {topUpError && (
                      <p className="mt-2 text-center text-sm text-destructive">{topUpError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleTopUp}
                    disabled={!topUpCode.trim() || topUpLoading}
                    className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {topUpLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري الشحن...</span>
                      </div>
                    ) : (
                      "تأكيد الشحن"
                    )}
                  </button>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    للتجربة، استخدم الرمز: KHENCHELA2026
                  </p>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    يمكنك شحن رصيدك عبر السائق عند ركوب الحافلة
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <BottomNav />
      </main>
    </PageTransition>
  )
}
