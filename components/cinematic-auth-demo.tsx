"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, LockKeyhole, Mail, ShieldCheck, X } from "lucide-react"

interface CinematicAuthDemoProps {
  onComplete: () => void
  onExit: () => void
}

type AuthDemoStage = "welcome" | "login-click" | "typing" | "submit-click" | "verifying" | "success"

const DEMO_EMAIL = "demo@tanakoli.dz"
const EMAIL_CHARACTERS = Array.from(DEMO_EMAIL)
const PASSWORD_CHARACTERS = Array.from("••••••••••")

export function CinematicAuthDemo({ onComplete, onExit }: CinematicAuthDemoProps) {
  const [stage, setStage] = useState<AuthDemoStage>("welcome")
  const prefersReducedMotion = useReducedMotion()
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const reduced = prefersReducedMotion === true
    const delays = reduced
      ? { firstClick: 80, showFields: 170, submitClick: 650, verify: 760, success: 1_120, complete: 1_500 }
      : { firstClick: 680, showFields: 910, submitClick: 2_650, verify: 2_880, success: 3_620, complete: 4_350 }

    const timers = [
      window.setTimeout(() => setStage("login-click"), delays.firstClick),
      window.setTimeout(() => setStage("typing"), delays.showFields),
      window.setTimeout(() => setStage("submit-click"), delays.submitClick),
      window.setTimeout(() => setStage("verifying"), delays.verify),
      window.setTimeout(() => setStage("success"), delays.success),
      window.setTimeout(() => onCompleteRef.current(), delays.complete),
    ]

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [prefersReducedMotion])

  const isReducedMotion = prefersReducedMotion === true
  const showCredentials = stage === "typing"
    || stage === "submit-click"
    || stage === "verifying"
    || stage === "success"

  return (
    <main className="demo-auth-presentation" aria-label="عرض تسجيل دخول تجريبي">
      <div className="demo-auth-atmosphere" aria-hidden="true">
        <span className="demo-auth-orb demo-auth-orb--one" />
        <span className="demo-auth-orb demo-auth-orb--two" />
        <span className="demo-auth-grid" />
      </div>

      <header className="demo-auth-topbar">
        <div className="demo-auth-brand" dir="ltr">
          <span className="demo-auth-brand-mark" aria-hidden="true">T</span>
          <span>TANAKOLI <span className="demo-auth-brand-separator">/</span> CINEMATIC DEMO</span>
        </div>
        <button type="button" className="demo-auth-exit" onClick={onExit}>
          <X aria-hidden="true" />
          <span>إنهاء العرض</span>
        </button>
      </header>

      <section className="demo-auth-content" dir="rtl">
        <div className="demo-auth-kicker">
          <span className="demo-auth-live-dot" />
          <span>رحلة تنقلي الذكية تبدأ الآن</span>
        </div>
        <h1 className="demo-auth-heading">مرحباً بك في تنقلي</h1>
        <p className="demo-auth-subheading">دخول آمن، ثم جولة سينمائية عبر خدمات النقل الحضري.</p>

        <AnimatePresence mode="wait" initial={false}>
          {!showCredentials ? (
            <motion.div
              key="welcome"
              className="demo-auth-card demo-auth-welcome-card"
              initial={isReducedMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: isReducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              transformTemplate={({ y = 0, scale = 1 }) => `translate3d(0, ${y}px, 0) scale3d(${scale}, ${scale}, 1)`}
            >
              <div className="demo-auth-icon-wrap">
                <LockKeyhole aria-hidden="true" />
              </div>
              <h2>مساحتك الذكية للتنقل</h2>
              <p>سجّل دخولك لمتابعة رحلاتك ومحفظتك في مكان واحد.</p>
              <motion.button
                type="button"
                className="demo-auth-login-button"
                animate={stage === "login-click" ? { scale: 0.96, opacity: 0.86 } : { scale: 1, opacity: 1 }}
                transition={{ duration: isReducedMotion ? 0 : 0.16, ease: "easeOut" }}
                whileTap={isReducedMotion ? undefined : { scale: 0.96 }}
                onClick={() => setStage("login-click")}
              >
                <span>تسجيل الدخول</span>
                <span className="demo-auth-button-glint" aria-hidden="true" />
              </motion.button>
              <p className="demo-auth-safe-note">محاكاة آمنة — لن يتم إرسال بيانات أو إنشاء جلسة دخول.</p>
            </motion.div>
          ) : (
            <motion.div
              key="credentials"
              className="demo-auth-card demo-auth-credentials-card"
              initial={isReducedMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: isReducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              transformTemplate={({ y = 0, scale = 1 }) => `translate3d(0, ${y}px, 0) scale3d(${scale}, ${scale}, 1)`}
            >
              <div className="demo-auth-card-heading">
                <span className="demo-auth-icon-wrap demo-auth-icon-wrap--small"><Mail aria-hidden="true" /></span>
                <div>
                  <h2>تسجيل الدخول</h2>
                  <p>أدخل بيانات الحساب التجريبي</p>
                </div>
              </div>

              <div className="demo-auth-field">
                <span className="demo-auth-field-label">البريد الإلكتروني</span>
                <div className="demo-auth-field-value" dir="ltr" aria-label="البريد التجريبي demo at tanakoli dot dz">
                  <span className="demo-auth-typed-characters" aria-hidden="true">
                    {EMAIL_CHARACTERS.map((character, index) => (
                      <motion.span
                        key={`${character}-${index}`}
                        initial={isReducedMotion ? false : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isReducedMotion ? 0 : 0.16, delay: isReducedMotion ? 0 : 0.24 + index * 0.045 }}
                      >
                        {character}
                      </motion.span>
                    ))}
                  </span>
                  {!isReducedMotion && <span className="demo-auth-caret" aria-hidden="true" />}
                </div>
              </div>

              <div className="demo-auth-field">
                <span className="demo-auth-field-label">كلمة المرور</span>
                <div className="demo-auth-field-value demo-auth-password" dir="ltr" aria-label="كلمة مرور تجريبية مخفية">
                  <span className="demo-auth-typed-characters" aria-hidden="true">
                    {PASSWORD_CHARACTERS.map((character, index) => (
                      <motion.span
                        key={`password-${index}`}
                        initial={isReducedMotion ? false : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isReducedMotion ? 0 : 0.16, delay: isReducedMotion ? 0 : 0.9 + index * 0.055 }}
                      >
                        {character}
                      </motion.span>
                    ))}
                  </span>
                  {!isReducedMotion && <span className="demo-auth-caret" aria-hidden="true" />}
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {stage === "typing" || stage === "submit-click" ? (
                  <motion.button
                    key="submit"
                    type="button"
                    className="demo-auth-login-button demo-auth-submit-button"
                    animate={stage === "submit-click" ? { scale: 0.97, opacity: 0.88 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: isReducedMotion ? 0 : 0.14, ease: "easeOut" }}
                    onClick={() => setStage("submit-click")}
                  >
                    تسجيل الدخول
                  </motion.button>
                ) : (
                  <motion.div
                    key={stage}
                    className={`demo-auth-verification${stage === "success" ? " demo-auth-verification--success" : ""}`}
                    initial={isReducedMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: isReducedMotion ? 0 : 0.18 }}
                    role="status"
                    aria-live="polite"
                  >
                    {stage === "verifying" ? (
                      <>
                        <ShieldCheck aria-hidden="true" />
                        <span>جارٍ التحقق من بيانات الدخول...</span>
                        {!isReducedMotion && <span className="demo-auth-verify-pulse" aria-hidden="true" />}
                      </>
                    ) : (
                      <>
                        <Check aria-hidden="true" />
                        <span>تم التحقق — جارٍ فتح لوحة التحكم</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="demo-auth-safe-note">بيانات وهمية للعرض فقط — لا تتصل بخدمة المصادقة.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="demo-auth-footer" dir="ltr">
          <span>PHASE 01</span>
          <span className="demo-auth-footer-divider" />
          <span>{showCredentials ? "SECURE AUTHENTICATION" : "WELCOME EXPERIENCE"}</span>
        </div>
      </section>
    </main>
  )
}
