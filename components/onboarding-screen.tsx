"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { Phone, ArrowRight, Loader2, Check, MapPin } from "lucide-react"

type Step = "splash" | "register" | "otp" | "success"

// Premium SVG Logo - Modern Urban Transit
function TanakaliLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tkGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="tkGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id="tkGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="120" cy="120" r="110" fill="none" stroke="url(#tkGrad1)" strokeWidth="1" opacity="0.3" />

      {/* Main route line with arrow - flowing upward */}
      <g filter="url(#tkGlow)">
        {/* Curved path representing a route */}
        <path
          d="M 120 180 Q 90 140, 100 80 Q 110 40, 120 20"
          stroke="url(#tkGrad1)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Accent secondary path */}
        <path
          d="M 120 180 Q 150 140, 140 80 Q 130 40, 120 20"
          stroke="url(#tkGrad2)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Arrow head at top */}
        <g transform="translate(120, 10)">
          <polygon points="0,-6 -8,8 8,8" fill="url(#tkGrad1)" />
        </g>

        {/* Location pin/marker points */}
        <circle cx="120" cy="175" r="6" fill="url(#tkGrad1)" />
        <circle cx="120" cy="175" r="9" fill="none" stroke="url(#tkGrad1)" strokeWidth="2" opacity="0.5" />
        
        <circle cx="105" cy="95" r="4" fill="url(#tkGrad2)" opacity="0.8" />
        <circle cx="135" cy="95" r="4" fill="url(#tkGrad2)" opacity="0.8" />
      </g>

      {/* Decorative dots (stations) */}
      <g opacity="0.6">
        <circle cx="75" cy="140" r="2.5" fill="#06B6D4" />
        <circle cx="165" cy="135" r="2.5" fill="#10B981" />
        <circle cx="85" cy="65" r="2.5" fill="#0EA5E9" />
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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    const validationError = validatePhone(phone)
    if (validationError) { setError(validationError); return }

    setError("")
    setIsLoading(true)

    // Step 1: init reCAPTCHA — separate try/catch so we know if THIS is what fails
    try {
      await initRecaptcha()
    } catch (err: any) {
      setError(formatFirebaseError("RecaptchaVerifier.render", err))
      setIsLoading(false)
      return
    }

    // Step 2: send OTP
    try {
      const formatted = formatPhone(phone)
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
      const formatted = formatPhone(phone)
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_120%_at_50%_50%,_rgba(6,182,212,0.15)_0%,_transparent_50%)]" />
              <motion.div
                className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl"
                animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tl from-emerald-500/20 to-cyan-500/20 blur-3xl"
                animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
              {/* Logo with entry animation */}
              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0, rotateY: -90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              >
                <motion.div
                  className="absolute -inset-12 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(16,185,129,0.2) 40%, transparent 70%)"
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-white/10 via-cyan-500/5 to-blue-500/10 backdrop-blur-xl shadow-2xl">
                  <TanakaliLogo className="h-48 w-48" />
                </div>
              </motion.div>

              {/* Title section */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h1 className="text-6xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent">تنقلي</span>
                </h1>
                <p className="text-3xl font-light text-white/90">خنشلة</p>
                <p className="mt-4 text-sm tracking-widest text-white/50 uppercase">Urban Transit Network</p>
              </motion.div>

              {/* Tagline */}
              <motion.p
                className="max-w-sm text-lg text-white/70 leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                نقلك الموثوق إلى كل مكان. اكتشف المدينة بكل سهولة وراحة.
              </motion.p>

              {/* Start button */}
              <motion.button
                onClick={() => setStep("register")}
                className="group relative mt-6 overflow-hidden rounded-2xl px-10 py-4 font-semibold text-white transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: showSplashButton ? 1 : 0, y: showSplashButton ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 group-hover:from-cyan-600 group-hover:via-teal-600 group-hover:to-emerald-600 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
                <span className="relative flex items-center justify-center gap-3">
                  <MapPin className="h-5 w-5" />
                  ابدأ الآن
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </motion.button>
            </div>

            {/* Bottom accent */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
          </motion.div>
        )}

        {/* ── REGISTER ── */}
        {step === "register" && (
          <motion.div
            key="register"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -left-40 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 blur-3xl"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
              <motion.div
                className="absolute -right-40 bottom-10 h-72 w-72 rounded-full bg-gradient-to-tl from-emerald-500/15 to-cyan-500/15 blur-3xl"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
              />
            </div>

            <div className="relative z-10 w-full max-w-sm space-y-8">
              {/* Back button */}
              <motion.button
                onClick={() => { setError(""); setStep("splash") }}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors group"
                whileHover={{ x: -4 }}
              >
                <ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>رجوع</span>
              </motion.button>

              {/* Header */}
              <motion.div
                className="space-y-3 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 border border-cyan-400/30 backdrop-blur-sm">
                  <MapPin className="h-6 w-6 text-cyan-300" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">إنشاء حسابك</h2>
                <p className="text-white/60 text-sm">ابدأ رحلتك معنا في ثانية واحدة</p>
              </motion.div>

              <motion.form
                onSubmit={handleSendOTP}
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Full Name Input */}
                <motion.div
                  className="space-y-2"
                  whileFocus={{ scale: 1.02 }}
                >
                  <label htmlFor="name" className="block text-xs font-semibold text-white/70 uppercase tracking-wide">
                    الاسم الكامل
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity blur" />
                    <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 backdrop-blur-md transition-all group-focus-within:border-cyan-400/50 group-focus-within:bg-white/10">
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="محمد علي"
                        required
                        className="w-full bg-transparent py-3.5 pr-4 pl-4 text-white placeholder:text-white/25 outline-none text-sm"
                      />
                      <MapPin className="absolute left-4 h-5 w-5 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </motion.div>

                {/* Phone Input */}
                <motion.div
                  className="space-y-2"
                  whileFocus={{ scale: 1.02 }}
                >
                  <label htmlFor="phone" className="block text-xs font-semibold text-white/70 uppercase tracking-wide">
                    رقم الهاتف
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity blur" />
                    <div className="relative flex items-center rounded-xl border border-white/15 bg-white/5 backdrop-blur-md transition-all group-focus-within:border-cyan-400/50 group-focus-within:bg-white/10">
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setError("") }}
                        placeholder="07XX XXX XXX"
                        required
                        dir="ltr"
                        className="w-full bg-transparent py-3.5 pr-4 pl-4 text-white placeholder:text-white/25 outline-none text-sm"
                      />
                      <Phone className="absolute left-4 h-5 w-5 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </motion.div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-500/10 border border-red-500/30 px-4 py-3 text-center text-sm text-red-300"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 transition-all group-hover:from-cyan-600 group-hover:via-teal-600 group-hover:to-emerald-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 blur-lg opacity-50 group-hover:opacity-75 -z-10" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جاري إرسال الرمز
                      </>
                    ) : (
                      <>
                        إرسال رمز التحقق
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.form>

              {/* Terms text */}
              <motion.p
                className="text-center text-xs text-white/40 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                بالمتابعة، أنت توافق على <span className="text-cyan-400">شروط الاستخدام</span> و<span className="text-cyan-400">سياسة الخصوصية</span>
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* ── OTP ── */}
        {step === "otp" && (
          <motion.div
            key="otp"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -left-40 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 blur-3xl"
                animate={{ y: [0, 25, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <motion.div
                className="absolute -right-40 bottom-20 h-72 w-72 rounded-full bg-gradient-to-tl from-emerald-500/15 to-cyan-500/15 blur-3xl"
                animate={{ y: [0, -25, 0] }}
                transition={{ duration: 7, repeat: Infinity, delay: 0.5 }}
              />
            </div>

            <div className="relative z-10 w-full max-w-sm space-y-8">
              {/* Back button */}
              <motion.button
                onClick={() => { setError(""); setOtp(["","","","","",""]); setStep("register") }}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors group"
                whileHover={{ x: -4 }}
              >
                <ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>رجوع</span>
              </motion.button>

              {/* Header */}
              <motion.div
                className="space-y-4 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-400/30 backdrop-blur-sm">
                  <Phone className="h-8 w-8 text-cyan-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">التحقق من الهاتف</h2>
                  <p className="mt-2 text-white/60 text-sm">أدخل الرمز المكوّن من 6 أرقام</p>
                  <p className="mt-1 text-cyan-300 font-mono text-sm" dir="ltr">{phone}</p>
                </div>
              </motion.div>

              {/* OTP Input Fields */}
              <motion.div
                className="flex justify-center gap-3"
                dir="ltr"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {otp.map((digit, i) => (
                  <motion.input
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
                    className={`h-14 w-12 rounded-xl text-center text-2xl font-bold backdrop-blur-md border-2 transition-all outline-none ${
                      digit
                        ? "border-cyan-400/60 bg-cyan-500/10 text-white"
                        : error
                        ? "border-red-500/40 bg-red-500/5 text-white"
                        : "border-white/15 bg-white/5 text-white/70"
                    } focus:border-cyan-400 focus:bg-cyan-500/15 focus:text-white`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  />
                ))}
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-500/10 border border-red-500/30 px-4 py-3 text-center text-sm text-red-300"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verify button */}
              <motion.button
                onClick={handleVerify}
                disabled={otp.some((d) => !d) || isLoading}
                className="group relative w-full overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={{ scale: otp.every(d => d) && !isLoading ? 1.02 : 1 }}
                whileTap={{ scale: otp.every(d => d) && !isLoading ? 0.98 : 1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 transition-all group-hover:from-cyan-600 group-hover:via-teal-600 group-hover:to-emerald-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 blur-lg opacity-50 group-hover:opacity-75 -z-10" />
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري التحقق
                    </>
                  ) : (
                    <>
                      تأكيد الرمز
                      <Check className="h-4 w-4 transition-transform group-hover:scale-110" />
                    </>
                  )}
                </span>
              </motion.button>

              {/* Resend section */}
              <motion.div
                className="text-center space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-white/40">لم تستلم الرمز؟</p>
                <motion.button
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className={`text-sm font-medium transition-colors ${
                    canResend ? "text-cyan-400 hover:text-cyan-300 cursor-pointer" : "text-white/30 cursor-not-allowed"
                  }`}
                  whileHover={canResend ? { scale: 1.05 } : {}}
                >
                  {canResend ? (
                    "إعادة الإرسال الآن"
                  ) : (
                    <span className="space-x-1">
                      <span>إعادة الإرسال خلال</span>
                      <span className="inline-block w-8 text-center font-bold text-cyan-400 tabular-nums">
                        {String(resendTimer).padStart(2, '0')}
                      </span>
                    </span>
                  )}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <motion.div
            key="success"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0">
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/30 via-transparent to-transparent"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute -left-40 top-1/2 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 blur-3xl"
                animate={{ y: [0, 30, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
              {/* Success checkmark animation */}
              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/40 to-emerald-400/40 blur-2xl"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 shadow-2xl">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  >
                    <Check className="h-16 w-16 text-white" strokeWidth={2.5} />
                  </motion.div>
                </div>
              </motion.div>

              {/* Success text */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 via-white to-emerald-200 bg-clip-text text-transparent">
                  مرحباً {name}!
                </h2>
                <p className="text-lg text-white/70">تم تفعيل حسابك بنجاح</p>
                <p className="text-sm text-white/50">الآن يمكنك الاستمتاع برحلات آمنة وموثوقة</p>
              </motion.div>

              {/* Loading indicator */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex justify-center">
                  <div className="relative h-2 w-64 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                    />
                  </div>
                </div>
                <p className="text-xs text-white/40">جاري تحضير التطبيق...</p>
              </motion.div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
