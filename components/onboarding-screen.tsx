"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { User, Phone, Shield, ArrowRight, Loader2, Check, Mail } from "lucide-react"

type Step = "splash" | "step1" | "step2" | "otp" | "success"
type AuthMethod = "phone" | "email"



export function OnboardingScreen() {
  const [step, setStep] = useState<Step>("splash")
  const [showSplashButton, setShowSplashButton] = useState(false)
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null)

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
    const t = setTimeout(() => setShowSplashButton(true), 1200)
    return () => clearTimeout(t)
  }, [])

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
        
        // Determine which phone to save based on auth method
        const primaryPhone = authMethod === "phone" ? phone : (phone || "")
        const primaryEmail = authMethod === "email" ? email : ""

        await setDoc(doc(db, "users", docId), {
          Phone: docId,
          fullName: name.trim(),
          email: primaryEmail,
          address: address.trim(),
          balance: 0,
          role: "passenger",
        }, { merge: true })
      }
      try { sessionStorage.setItem("splashShown", "true") } catch {}
      setStep("success")
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div id="ob-recaptcha" />

      <AnimatePresence mode="wait">

        {/* ── SPLASH ── */}
        {step === "splash" && (
          <motion.div
            key="splash"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-blue-900/20" />
              <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl opacity-60" />
              <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl opacity-60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-6 text-center h-full">
              {/* Logo */}
              <motion.div
                className="relative mt-auto"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="absolute -inset-8 rounded-full opacity-60"
                  style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(59,130,246,0.3) 40%, transparent 70%)" }}
                />
                <div className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl"
                  style={{ boxShadow: "0 8px 32px rgba(16,185,129,0.15), 0 0 60px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.08)" }}
                >
                  <img src="/logo.png" alt="Tanakoli Khenchela" className="h-36 w-36" />
                </div>
              </motion.div>

              {/* Title & Tagline */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h1 className="text-6xl font-black tracking-tight text-white drop-shadow-lg">
                  تنقلي خنشلة
                </h1>
                <p className="text-lg font-medium tracking-wide text-emerald-300/90">
                  Tanakoli Khenchela
                </p>
              </motion.div>

              {/* Subheading */}
              <motion.p
                className="text-base font-medium text-white/85 max-w-xs leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                مدينتك، نقلك. لنبدأ الرحلة!
              </motion.p>

              {/* CTA Button */}
              <motion.button
                onClick={() => setStep("step1")}
                className="relative mt-4 mb-auto px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-lg font-bold text-white shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-95 border border-emerald-400/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: showSplashButton ? 1 : 0, y: showSplashButton ? 0 : 20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-lg -z-10" />
                <span className="flex items-center gap-3 justify-center">
                  ابدأ الآن
                  <svg className="h-5 w-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </motion.button>
            </div>

            {/* Footer */}
            <motion.div
              className="absolute bottom-6 z-10 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-xs font-medium text-white/40 tracking-wide">ETUS Khenchela</p>
              <p className="mt-1 text-xs text-white/25">مؤسسة النقل الحضري</p>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 1: Welcome & Initial Auth ── */}
        {step === "step1" && (
          <motion.div
            key="step1"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="absolute inset-0">
              <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
              <button
                onClick={() => { setError(""); setAuthMethod(null); setStep("splash") }}
                className="mb-6 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                <span>رجوع</span>
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Phone className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">مرحباً بك</h2>
                <p className="mt-1 text-sm text-white/60">اختر طريقة الدخول</p>
              </div>

              <form onSubmit={handleStep1Continue} className="space-y-4">
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="absolute inset-0">
              <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
              <button
                onClick={() => { setError(""); setStep("step1") }}
                className="mb-6 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                <span>رجوع</span>
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <User className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">إكمال ملفك الشخصي</h2>
                <p className="mt-1 text-sm text-white/60">أكمل البيانات المتبقية</p>
              </div>

              <form onSubmit={handleStep2Continue} className="space-y-4">
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
            <div className="absolute inset-0">
              <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
              <button
                onClick={() => { setError(""); setOtp(["","","","","",""]); setStep("step2") }}
                className="mb-6 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                <span>رجوع</span>
              </button>

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

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <motion.div
            key="success"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
              <motion.div
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-2xl"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-white">مرحباً {name}!</h2>
                <p className="mt-2 text-white/60">تم التسجيل بنجاح. جاري تحميل التطبيق...</p>
              </motion.div>
              <motion.div
                className="mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </motion.div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
