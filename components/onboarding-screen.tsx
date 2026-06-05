"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { User, Phone, Shield, ArrowRight, Loader2, Check, Mail } from "lucide-react"

type Step = "splash" | "step1" | "step2" | "otp"
type AuthMethod = "phone" | "email"



export function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("step1")
  const [showSplashButton, setShowSplashButton] = useState(false)
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>("phone")

  // Step 1 data
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Step 2 data
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")

  // OTP & Auth data
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)

  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    // Removed splash screen delay - go directly to phone login
  }, [])

  // Navigate to home immediately after successful authentication
  useEffect(() => {
    if (step === "success") {
      router.push("/")
      return
    }
  }, [step, router])

  useEffect(() => {
    if (step !== "otp") return
    setResendTimer(60)
    setCanResend(false)
  }, [step])

  useEffect(() => {
    if (step !== "otp" || canResend) return
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { setCanResend(true); clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step, canResend])

  // Converts any Algerian number format to E.164 (+213XXXXXXXXX)
  const formatPhone = (local: string): string => {
    const digits = local.replace(/\D/g, "")
    let e164: string
    if (digits.startsWith("213")) {
      e164 = "+" + digits
    } else if (digits.startsWith("0")) {
      e164 = "+213" + digits.slice(1)
    } else {
      e164 = "+213" + digits
    }
    console.log("[Auth] Raw input:", local, "→ E.164:", e164)
    return e164
  }

  // Validates the local number has enough digits (9 after stripping leading 0)
  const validatePhone = (local: string): string | null => {
    const digits = local.replace(/\D/g, "")
    const core = digits.startsWith("0") ? digits.slice(1) : digits.startsWith("213") ? digits.slice(3) : digits
    if (core.length < 9) return "يجب أن يتكوّن رقم الهاتف من 9 أرقام على الأقل."
    if (core.length > 9) return "رقم الهاتف طويل جداً."
    return null
  }

  // Formats and logs a raw Firebase error into a visible string
  const formatFirebaseError = (stage: string, err: any): string => {
    const code = err?.code ?? "no-code"
    const msg = err?.message ?? "no-message"
    // Log the full object so nothing is hidden
    console.error(`[Auth][${stage}] code=${code}`, `message=${msg}`, err)
    return `[${stage}] ${code}: ${msg}`
  }

  // Creates a fresh invisible RecaptchaVerifier and renders it
  const initRecaptcha = async (): Promise<void> => {
    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear()
        recaptchaRef.current = null
      }
    } catch (e) {
      console.warn("[Auth] clear() threw (non-fatal):", e)
    }

    console.log("[Auth] Creating RecaptchaVerifier on element #ob-recaptcha, auth:", auth)
    recaptchaRef.current = new RecaptchaVerifier(auth, "ob-recaptcha", {
      size: "invisible",
      callback: (token: string) => {
        console.log("[Auth] reCAPTCHA solved — token length:", token?.length ?? 0)
      },
      "expired-callback": () => {
        console.warn("[Auth] reCAPTCHA token expired")
        try { if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null } } catch {}
      },
    })

    console.log("[Auth] Calling render()...")
    const widgetId = await recaptchaRef.current.render()
    console.log("[Auth] render() resolved — widgetId:", widgetId)
  }

  const handleStep1Continue = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (authMethod === "phone" && !phone.trim()) return
    if (authMethod === "email" && !email.trim()) return

    const phoneToValidate = authMethod === "phone" ? phone : ""
    const validationError = phoneToValidate ? validatePhone(phoneToValidate) : null
    if (validationError) { setError(validationError); return }

    setError("")
    setStep("step2")
  }

  const handleStep2Continue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    // Validate phone if it's the secondary field
    if (authMethod === "email" && phone.trim()) {
      const validationError = validatePhone(phone)
      if (validationError) { setError(validationError); return }
    }

    // Validate phone if it's the primary field
    if (authMethod === "phone") {
      const validationError = validatePhone(phone)
      if (validationError) { setError(validationError); return }
    }

    setError("")
    setIsLoading(true)

    // Init reCAPTCHA
    try {
      await initRecaptcha()
    } catch (err: any) {
      setError(formatFirebaseError("RecaptchaVerifier.render", err))
      setIsLoading(false)
      return
    }

    // Send OTP using the selected phone number
    try {
      const phoneToUse = authMethod === "phone" ? phone : phone
      const formatted = formatPhone(phoneToUse)
      console.log("[Auth] signInWithPhoneNumber →", formatted)
      const result = await signInWithPhoneNumber(auth, formatted, recaptchaRef.current!)
      confirmationRef.current = result
      console.log("[Auth] OTP sent — confirmation:", result)
      setStep("otp")
    } catch (err: any) {
      setError(formatFirebaseError("signInWithPhoneNumber", err))
      try { if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null } } catch {}
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = useCallback(async () => {
    if (!canResend) return
    setError("")
    setIsLoading(true)
    setCanResend(false)
    setResendTimer(60)
    try {
      await initRecaptcha()
      const phoneToUse = authMethod === "phone" ? phone : phone
      const formatted = formatPhone(phoneToUse)
      console.log("[Auth] Resend → signInWithPhoneNumber →", formatted)
      const result = await signInWithPhoneNumber(auth, formatted, recaptchaRef.current!)
      confirmationRef.current = result
      console.log("[Auth] OTP resent successfully")
    } catch (err: any) {
      setError(formatFirebaseError("resend", err))
      try { if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null } } catch {}
    } finally {
      setIsLoading(false)
    }
  }, [canResend, phone, authMethod])

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value) || value.length > 1) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    setError("")
    if (value && index < 5) document.getElementById(`ob-otp-${index + 1}`)?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join("")
    if (code.length < 6 || !confirmationRef.current) return
    setIsLoading(true)
    setError("")
    try {
      const result = await confirmationRef.current.confirm(code)
      const user = result.user
      if (user.phoneNumber) {
        const docId = user.phoneNumber.startsWith("+213")
          ? "0" + user.phoneNumber.slice(4)
          : user.phoneNumber

        const primaryEmail = authMethod === "email" ? email : ""
        const userDocRef = doc(db, "users", docId)
        const existing = await getDoc(userDocRef)

        if (existing.exists()) {
          // Returning user — update profile fields only, never touch balance
          await setDoc(userDocRef, {
            Phone: docId,
            fullName: name.trim(),
            email: primaryEmail,
            address: address.trim(),
            role: "passenger",
          }, { merge: true })
        } else {
          // New user — create document with initial balance of 0
          await setDoc(userDocRef, {
            Phone: docId,
            fullName: name.trim(),
            email: primaryEmail,
            address: address.trim(),
            balance: 0,
            role: "passenger",
          })
        }
      }
      try { sessionStorage.setItem("splashShown", "true") } catch {}
      router.push("/")
    } catch (err: any) {
      console.error("[Auth] OTP confirm failed:", err?.code, err?.message, err)
      if (err?.code === "auth/invalid-verification-code") setError("رمز التحقق غير صحيح. تحقق من الأرقام وأعد المحاولة.")
      else if (err?.code === "auth/code-expired") setError("انتهت صلاحية الرمز. اضغط على إعادة الإرسال.")
      else if (err?.code === "auth/session-expired") setError("انتهت الجلسة. اضغط على إعادة الإرسال.")
      else setError(`خطأ في التحقق (${err?.code ?? "unknown"}). حاول مرة أخرى.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div 
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: step === "success" ? 1.2 : 0 }}
    >
      <div id="ob-recaptcha" />

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Welcome & Initial Auth ── */}
        {step === "step1" && (
          <motion.div
            key="step1"
            className="absolute inset-0 flex flex-col items-center justify-start bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <svg
                className="map-grid-bg absolute inset-0 w-full h-full"
                viewBox="0 0 400 800"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <linearGradient id="gridGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                  </linearGradient>
                  <style>
                    {`
                      @keyframes routeGlow2 {
                        0%, 100% { stroke-opacity: 0.3; filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.2)); }
                        50% { stroke-opacity: 0.6; filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.5)); }
                      }
                      .route-line-lg { animation: routeGlow2 4s ease-in-out infinite; stroke-dasharray: 20; stroke-dashoffset: 0; }
                      .route-line-lg-2 { animation: routeGlow2 4s ease-in-out infinite 1s; }
                      .route-line-lg-3 { animation: routeGlow2 4s ease-in-out infinite 2s; }
                    `}
                  </style>
                </defs>

                {/* Grid Pattern */}
                <g className="map-grid">
                  <line x1="0" y1="0" x2="0" y2="800" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="50" y1="0" x2="50" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="100" y1="0" x2="100" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="150" y1="0" x2="150" y2="800" stroke="#3B82F6" strokeWidth="1.5" opacity="0.2" />
                  <line x1="200" y1="0" x2="200" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="250" y1="0" x2="250" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="300" y1="0" x2="300" y2="800" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="350" y1="0" x2="350" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="400" y1="0" x2="400" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />

                  <line x1="0" y1="50" x2="400" y2="50" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="0" y1="150" x2="400" y2="150" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="200" x2="400" y2="200" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="250" x2="400" y2="250" stroke="#3B82F6" strokeWidth="1.5" opacity="0.2" />
                  <line x1="0" y1="300" x2="400" y2="300" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="350" x2="400" y2="350" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="400" x2="400" y2="400" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                </g>

                {/* Route Lines with Glow */}
                <g className="map-grid-pulse">
                  <path d="M 30 100 Q 80 150 130 200 T 230 350" className="route-line-lg" stroke="#22C55E" strokeWidth="2" fill="none" />
                  <path d="M 80 50 L 150 120 Q 200 180 250 250" className="route-line-lg-2" stroke="#10B981" strokeWidth="1.5" fill="none" />
                  <path d="M 200 80 Q 250 140 280 220 L 320 350" className="route-line-lg-3" stroke="#22C55E" strokeWidth="2" fill="none" />
                  <path d="M 50 250 L 150 300 Q 220 330 300 380" stroke="#3B82F6" strokeWidth="1" opacity="0.4" fill="none" />
                  <path d="M 250 100 Q 300 160 340 240" stroke="#10B981" strokeWidth="1.5" opacity="0.3" fill="none" />
                </g>

                {/* Gradient Overlay */}
                <rect x="0" y="0" width="400" height="800" fill="url(#gridGradient2)" />
              </svg>
            </div>

            {/* Centered form content */}
            <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col items-center justify-center">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Phone className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">مرحباً بك</h2>
                <p className="mt-1 text-sm text-white/60">اختر طريقة الدخول</p>
              </div>

              <form onSubmit={handleStep1Continue} className="w-full space-y-4">
                {/* Phone Option */}
                {authMethod !== "email" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">رقم الهاتف</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setError(""); setAuthMethod("phone") }}
                        placeholder="07XX XXX XXX"
                        dir="ltr"
                        className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pr-10 pl-4 text-white placeholder:text-white/30 backdrop-blur-sm focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* Email Option */}
                {authMethod === "email" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError("") }}
                        placeholder="example@mail.com"
                        className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pr-10 pl-4 text-white placeholder:text-white/30 backdrop-blur-sm focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authMethod === null}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-white shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  استمرار
                </button>

                {/* Toggle Email/Phone Option */}
                {authMethod && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod(authMethod === "phone" ? "email" : "phone")
                      setError("")
                      setPhone("")
                      setEmail("")
                    }}
                    className="w-full rounded-xl border border-white/20 bg-white/5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {authMethod === "phone" ? "أو المتابعة باستخدام البريد الإلكتروني" : "أو المتابعة برقم الهاتف"}
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Profile Completion ── */}
        {step === "step2" && (
          <motion.div
            key="step2"
            className="absolute inset-0 flex flex-col items-center justify-start bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <svg
                className="map-grid-bg absolute inset-0 w-full h-full"
                viewBox="0 0 400 800"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <linearGradient id="gridGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                  </linearGradient>
                  <style>
                    {`
                      @keyframes routeGlow3 {
                        0%, 100% { stroke-opacity: 0.3; filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.2)); }
                        50% { stroke-opacity: 0.6; filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.5)); }
                      }
                      .route-line-p { animation: routeGlow3 4s ease-in-out infinite; stroke-dasharray: 20; stroke-dashoffset: 0; }
                      .route-line-p-2 { animation: routeGlow3 4s ease-in-out infinite 1s; }
                      .route-line-p-3 { animation: routeGlow3 4s ease-in-out infinite 2s; }
                    `}
                  </style>
                </defs>

                {/* Grid Pattern */}
                <g className="map-grid">
                  <line x1="0" y1="0" x2="0" y2="800" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="50" y1="0" x2="50" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="100" y1="0" x2="100" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="150" y1="0" x2="150" y2="800" stroke="#3B82F6" strokeWidth="1.5" opacity="0.2" />
                  <line x1="200" y1="0" x2="200" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="250" y1="0" x2="250" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="300" y1="0" x2="300" y2="800" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="350" y1="0" x2="350" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="400" y1="0" x2="400" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />

                  <line x1="0" y1="50" x2="400" y2="50" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="0" y1="150" x2="400" y2="150" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="200" x2="400" y2="200" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="250" x2="400" y2="250" stroke="#3B82F6" strokeWidth="1.5" opacity="0.2" />
                  <line x1="0" y1="300" x2="400" y2="300" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="350" x2="400" y2="350" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="400" x2="400" y2="400" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                </g>

                {/* Route Lines with Glow */}
                <g className="map-grid-pulse">
                  <path d="M 30 100 Q 80 150 130 200 T 230 350" className="route-line-p" stroke="#22C55E" strokeWidth="2" fill="none" />
                  <path d="M 80 50 L 150 120 Q 200 180 250 250" className="route-line-p-2" stroke="#10B981" strokeWidth="1.5" fill="none" />
                  <path d="M 200 80 Q 250 140 280 220 L 320 350" className="route-line-p-3" stroke="#22C55E" strokeWidth="2" fill="none" />
                  <path d="M 50 250 L 150 300 Q 220 330 300 380" stroke="#3B82F6" strokeWidth="1" opacity="0.4" fill="none" />
                  <path d="M 250 100 Q 300 160 340 240" stroke="#10B981" strokeWidth="1.5" opacity="0.3" fill="none" />
                </g>

                {/* Gradient Overlay */}
                <rect x="0" y="0" width="400" height="800" fill="url(#gridGradient3)" />
              </svg>
            </div>

            {/* Back button - positioned at top */}
            <button
              onClick={() => { setError(""); setStep("step1") }}
              className="relative z-10 self-start mt-6 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              <span>رجوع</span>
            </button>

            {/* Centered form content */}
            <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col items-center justify-center">{null}

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <User className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">إكمال ملفك الشخصي</h2>
                <p className="mt-1 text-sm text-white/60">أكمل البيانات المتبقية</p>
              </div>

              <form onSubmit={handleStep2Continue} className="w-full space-y-4">
                {/* Full Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      required
                      className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pr-10 pl-4 text-white placeholder:text-white/30 backdrop-blur-sm focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Phone (if email was primary) */}
                {authMethod === "email" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">رقم الهاتف <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setError("") }}
                        placeholder="07XX XXX XXX"
                        required
                        dir="ltr"
                        className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pr-10 pl-4 text-white placeholder:text-white/30 backdrop-blur-sm focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* Email (if phone was primary) */}
                {authMethod === "phone" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@mail.com"
                        className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pr-10 pl-4 text-white placeholder:text-white/30 backdrop-blur-sm focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* Address */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">العنوان</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="أدخل عنوانك"
                      className="w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4 text-white placeholder:text-white/30 backdrop-blur-sm focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-white shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>جاري المتابعة...</span>
                    </div>
                  ) : (
                    "المتابعة"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-white/30">
                بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية
              </p>
            </div>
          </motion.div>
        )}

        {/* ── OTP ── */}
        {step === "otp" && (
          <motion.div
            key="otp"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <svg
                className="map-grid-bg absolute inset-0 w-full h-full"
                viewBox="0 0 400 800"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <linearGradient id="gridGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                  </linearGradient>
                  <style>
                    {`
                      @keyframes routeGlow4 {
                        0%, 100% { stroke-opacity: 0.3; filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.2)); }
                        50% { stroke-opacity: 0.6; filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.5)); }
                      }
                      .route-line-o { animation: routeGlow4 4s ease-in-out infinite; stroke-dasharray: 20; stroke-dashoffset: 0; }
                      .route-line-o-2 { animation: routeGlow4 4s ease-in-out infinite 1s; }
                      .route-line-o-3 { animation: routeGlow4 4s ease-in-out infinite 2s; }
                    `}
                  </style>
                </defs>

                {/* Grid Pattern */}
                <g className="map-grid">
                  <line x1="0" y1="0" x2="0" y2="800" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="50" y1="0" x2="50" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="100" y1="0" x2="100" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="150" y1="0" x2="150" y2="800" stroke="#3B82F6" strokeWidth="1.5" opacity="0.2" />
                  <line x1="200" y1="0" x2="200" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="250" y1="0" x2="250" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="300" y1="0" x2="300" y2="800" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="350" y1="0" x2="350" y2="800" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="400" y1="0" x2="400" y2="800" stroke="#10B981" strokeWidth="1" opacity="0.15" />

                  <line x1="0" y1="50" x2="400" y2="50" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                  <line x1="0" y1="150" x2="400" y2="150" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="200" x2="400" y2="200" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="250" x2="400" y2="250" stroke="#3B82F6" strokeWidth="1.5" opacity="0.2" />
                  <line x1="0" y1="300" x2="400" y2="300" stroke="#10B981" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="350" x2="400" y2="350" stroke="#3B82F6" strokeWidth="1" opacity="0.15" />
                  <line x1="0" y1="400" x2="400" y2="400" stroke="#10B981" strokeWidth="1.5" opacity="0.2" />
                </g>

                {/* Route Lines with Glow */}
                <g className="map-grid-pulse">
                  <path d="M 30 100 Q 80 150 130 200 T 230 350" className="route-line-o" stroke="#22C55E" strokeWidth="2" fill="none" />
                  <path d="M 80 50 L 150 120 Q 200 180 250 250" className="route-line-o-2" stroke="#10B981" strokeWidth="1.5" fill="none" />
                  <path d="M 200 80 Q 250 140 280 220 L 320 350" className="route-line-o-3" stroke="#22C55E" strokeWidth="2" fill="none" />
                  <path d="M 50 250 L 150 300 Q 220 330 300 380" stroke="#3B82F6" strokeWidth="1" opacity="0.4" fill="none" />
                  <path d="M 250 100 Q 300 160 340 240" stroke="#10B981" strokeWidth="1.5" opacity="0.3" fill="none" />
                </g>

                {/* Gradient Overlay */}
                <rect x="0" y="0" width="400" height="800" fill="url(#gridGradient4)" />
              </svg>
            </div>

            {/* Back button - fixed top-left */}
            <button
              onClick={() => { setError(""); setOtp(["","","","","",""]); setStep("step2") }}
              className="fixed top-5 right-5 z-20 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              <span>رجوع</span>
            </button>

            <div className="relative z-10 w-full max-w-sm">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Shield className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">التحقق من الهاتف</h2>
                <p className="mt-1 text-sm text-white/60">تم إرسال رمز مكوّن من 6 أرقام إلى</p>
                <p className="mt-1 text-sm font-bold text-emerald-400" dir="ltr">{phone}</p>
              </div>

              <div className="mb-6 flex justify-center gap-2" dir="ltr">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`ob-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && i > 0)
                        document.getElementById(`ob-otp-${i - 1}`)?.focus()
                    }}
                    className={`h-12 w-10 rounded-xl border-2 bg-white/10 text-center text-xl font-bold text-white backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                      error ? "border-red-500/60" : digit ? "border-emerald-500/60" : "border-white/20"
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={otp.some((d) => !d) || isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-white shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  "تأكيد الرمز"
                )}
              </button>

              <div className="mt-5 text-center">
                <p className="text-xs text-white/40 mb-2">لم تستلم الرمز؟</p>
                <button
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className={`text-sm font-medium transition-colors ${
                    canResend ? "text-emerald-400 hover:text-emerald-300 cursor-pointer" : "text-white/30 cursor-not-allowed"
                  }`}
                >
                  {canResend ? "إعادة الإرسال" : (
                    <span>
                      إعادة الإرسال بعد{" "}
                      <span className="inline-block w-6 text-center font-bold tabular-nums">{resendTimer}</span>
                      {" "}ثانية
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
