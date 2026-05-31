"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { User, Phone, Shield, ArrowRight, Loader2, Check } from "lucide-react"

type Step = "splash" | "register" | "otp" | "success"

function TKLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ob-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="40%" stopColor="#059669" />
          <stop offset="70%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="ob-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="ob-road" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
        </linearGradient>
        <filter id="ob-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.3" />
        </filter>
        <filter id="ob-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="90" fill="white" fillOpacity="0.1" />
      <circle cx="100" cy="100" r="88" stroke="url(#ob-light)" strokeWidth="2" strokeOpacity="0.5" fill="none" />
      <g filter="url(#ob-shadow)">
        <rect x="35" y="45" width="130" height="22" rx="11" fill="url(#ob-grad)" />
        <line x1="50" y1="56" x2="65" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="80" y1="56" x2="95" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <line x1="110" y1="56" x2="125" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.7" />
        <path d="M88 67 L112 67 L118 145 L82 145 Z" fill="url(#ob-road)" />
        <line x1="100" y1="75" x2="100" y2="90" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="100" y1="100" x2="100" y2="115" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="100" y1="125" x2="100" y2="138" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
      <g filter="url(#ob-glow)" transform="translate(72, 95)">
        <rect x="0" y="5" width="56" height="28" rx="6" fill="white" />
        <rect x="4" y="0" width="48" height="8" rx="4" fill="white" />
        <rect x="6" y="10" width="10" height="10" rx="2" fill="url(#ob-grad)" opacity="0.8" />
        <rect x="19" y="10" width="10" height="10" rx="2" fill="url(#ob-grad)" opacity="0.8" />
        <rect x="32" y="10" width="10" height="10" rx="2" fill="url(#ob-grad)" opacity="0.8" />
        <rect x="44" y="10" width="8" height="10" rx="2" fill="url(#ob-grad)" opacity="0.6" />
        <circle cx="14" cy="35" r="6" fill="#1E293B" />
        <circle cx="14" cy="35" r="3" fill="#64748B" />
        <circle cx="42" cy="35" r="6" fill="#1E293B" />
        <circle cx="42" cy="35" r="3" fill="#64748B" />
        <circle cx="50" cy="25" r="2.5" fill="#FCD34D" />
      </g>
    </svg>
  )
}

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>("splash")
  const [showSplashButton, setShowSplashButton] = useState(false)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
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

  // Creates a fresh invisible RecaptchaVerifier and renders it before use
  const initRecaptcha = async (): Promise<void> => {
    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear()
        recaptchaRef.current = null
      }
    } catch {}

    recaptchaRef.current = new RecaptchaVerifier(auth, "ob-recaptcha", {
      size: "invisible",
      callback: () => {
        console.log("[Auth] reCAPTCHA solved successfully")
      },
      "expired-callback": () => {
        console.warn("[Auth] reCAPTCHA expired — will reinitialize on next attempt")
        if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null }
      },
    })

    // Must call render() and await it before passing to signInWithPhoneNumber
    await recaptchaRef.current.render()
    console.log("[Auth] reCAPTCHA rendered and ready")
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    const validationError = validatePhone(phone)
    if (validationError) { setError(validationError); return }

    setError("")
    setIsLoading(true)
    try {
      await initRecaptcha()
      const formatted = formatPhone(phone)
      console.log("[Auth] Calling signInWithPhoneNumber with:", formatted)
      const result = await signInWithPhoneNumber(auth, formatted, recaptchaRef.current!)
      confirmationRef.current = result
      console.log("[Auth] OTP sent successfully — confirmation result received")
      setStep("otp")
    } catch (err: any) {
      console.error("[Auth] signInWithPhoneNumber failed:", err?.code, err?.message, err)
      if (err?.code === "auth/invalid-phone-number") {
        setError("رقم الهاتف غير صحيح. تحقق من الصيغة.")
      } else if (err?.code === "auth/too-many-requests") {
        setError("طلبات كثيرة جداً. انتظر قليلاً وحاول مرة أخرى.")
      } else if (err?.code === "auth/operation-not-allowed") {
        setError("خطأ: المصادقة بالهاتف غير مفعّلة في Firebase Console. فعّل 'Phone' ضمن Authentication → Sign-in method.")
      } else if (err?.code === "auth/unauthorized-domain") {
        setError(`خطأ: النطاق غير مصرّح به في Firebase. أضف "${window.location.hostname}" إلى Authentication → Settings → Authorized domains.`)
      } else if (err?.code === "auth/captcha-check-failed") {
        setError(`خطأ reCAPTCHA: تأكد من إضافة النطاق "${window.location.hostname}" إلى Authorized domains في Firebase Console.`)
      } else if (err?.code === "auth/missing-phone-number") {
        setError("الرجاء إدخال رقم الهاتف.")
      } else {
        setError(`خطأ (${err?.code ?? "unknown"}): ${err?.message ?? "حاول مرة أخرى."}`)
      }
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
      const formatted = formatPhone(phone)
      console.log("[Auth] Resending OTP to:", formatted)
      const result = await signInWithPhoneNumber(auth, formatted, recaptchaRef.current!)
      confirmationRef.current = result
      console.log("[Auth] OTP resent successfully")
    } catch (err: any) {
      console.error("[Auth] Resend failed:", err?.code, err?.message, err)
      if (err?.code === "auth/too-many-requests") setError("طلبات كثيرة جداً. انتظر قليلاً.")
      else setError(`فشل إعادة الإرسال (${err?.code ?? "unknown"}). حاول مرة أخرى.`)
      try { if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null } } catch {}
    } finally {
      setIsLoading(false)
    }
  }, [canResend, phone])

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
        await setDoc(doc(db, "users", docId), {
          Phone: docId,
          fullName: name.trim(),
          email: "",
          address: "",
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-blue-900/20" />
              <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="absolute -inset-8 rounded-full opacity-60"
                  style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(59,130,246,0.3) 40%, transparent 70%)" }}
                />
                <div className="relative flex h-44 w-44 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl"
                  style={{ boxShadow: "0 8px 32px rgba(16,185,129,0.2), 0 0 60px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.1)" }}
                >
                  <TKLogo className="h-40 w-40" />
                </div>
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h1 className="bg-gradient-to-r from-emerald-300 via-white to-blue-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent drop-shadow-lg">
                  تنقلي خنشلة
                </h1>
                <p className="text-xl font-medium tracking-wide text-white/80">Tanakoli Khenchela</p>
              </motion.div>

              <motion.p
                className="text-lg font-medium text-white/90"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                مدينتك، نقلك. لنبدأ الرحلة!
              </motion.p>

              <motion.button
                onClick={() => setStep("register")}
                className="relative mt-4 flex h-14 w-52 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 text-lg font-bold text-white shadow-2xl transition-transform duration-200 hover:scale-105 active:scale-95"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: showSplashButton ? 1 : 0, y: showSplashButton ? 0 : 20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-400/30 via-teal-400/30 to-blue-400/30 blur-xl" />
                <span className="relative z-10 flex items-center gap-3 text-xl">
                  ابدأ الآن
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </motion.button>
            </div>

            <motion.div
              className="absolute bottom-8 z-10 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-sm text-white/50">ETUS Khenchela</p>
              <p className="mt-1 text-xs text-white/30">مؤسسة النقل الحضري</p>
            </motion.div>
          </motion.div>
        )}

        {/* ── REGISTER ── */}
        {step === "register" && (
          <motion.div
            key="register"
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
                onClick={() => { setError(""); setStep("splash") }}
                className="mb-6 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                <span>رجوع</span>
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <User className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">إنشاء حساب</h2>
                <p className="mt-1 text-sm text-white/60">أدخل بياناتك للبدء</p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-4">
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">رقم الهاتف</label>
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

                {error && (
                  <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-white shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>جاري إرسال الرمز...</span>
                    </div>
                  ) : (
                    "إرسال رمز التحقق"
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
                onClick={() => { setError(""); setOtp(["","","","","",""]); setStep("register") }}
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
