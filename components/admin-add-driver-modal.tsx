"use client"

/**
 * Admin — "Add Driver / إضافة سائق" modal.
 *
 * Registers a driver phone number in Firebase with authorized driver
 * privileges so the app recognises them immediately upon login:
 *  1. Identifies the phone in Firebase (drivers / users Firestore collections).
 *  2. Creates or updates the driver record with driver privileges.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bidi } from "@/components/admin-bidi"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import {
  findDriverInFirebase,
  registerDriver,
  normalizeLocalPhone,
  type DriverLookupResult,
} from "@/lib/admin-utils"
import {
  UserPlus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Phone,
  User,
  Bus,
  Search,
} from "lucide-react"

interface AdminAddDriverModalProps {
  open: boolean
  onClose: () => void
  /** Called after a driver record was created/updated successfully. */
  onRegistered?: () => void
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

type LookupState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; lookup: DriverLookupResult }
  | { status: "notFound" }

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; created: boolean; phone: string }

export function AdminAddDriverModal({ open, onClose, onRegistered }: AdminAddDriverModalProps) {
  const { t, isRTL } = useAdminI18n()
  const reduced = useReducedMotion()

  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [line, setLine] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" })
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" })

  const phoneInputRef = useRef<HTMLInputElement>(null)
  const lookupSeq = useRef(0)

  // Focus the phone input when the modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => phoneInputRef.current?.focus(), 60)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const resetForm = useCallback(() => {
    setPhone("")
    setName("")
    setLine("")
    setPhoneError(null)
    setSubmitError(null)
    setLookup({ status: "idle" })
    setSubmit({ status: "idle" })
  }, [])

  const handleClose = useCallback(() => {
    onClose()
    // Reset after the exit animation so fields don't flash while closing
    setTimeout(resetForm, 250)
  }, [onClose, resetForm])

  const validatePhone = (value: string): boolean => {
    const normalized = normalizeLocalPhone(value.trim().replace(/[^\d+]/g, ""))
    return /^0\d{9}$/.test(normalized)
  }

  // Identify the driver in Firebase when the phone field loses focus
  const handlePhoneBlur = async () => {
    const raw = phone.trim()
    if (!raw) {
      setLookup({ status: "idle" })
      return
    }
    if (!validatePhone(raw)) {
      setPhoneError(t("addDriver.error.phoneInvalid"))
      setLookup({ status: "idle" })
      return
    }
    setPhoneError(null)
    const seq = ++lookupSeq.current
    setLookup({ status: "checking" })
    const result = await findDriverInFirebase(raw)
    if (seq !== lookupSeq.current) return // stale response
    if (result.success && result.lookup) {
      setLookup(
        result.lookup.exists
          ? { status: "found", lookup: result.lookup }
          : { status: "notFound" }
      )
    } else {
      setLookup({ status: "notFound" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const raw = phone.trim()
    if (!raw) {
      setPhoneError(t("addDriver.error.phoneRequired"))
      return
    }
    if (!validatePhone(raw)) {
      setPhoneError(t("addDriver.error.phoneInvalid"))
      return
    }
    setPhoneError(null)
    setSubmit({ status: "submitting" })

    const result = await registerDriver({
      phone: raw,
      name: name.trim() || undefined,
      line: line.trim() || undefined,
    })

    if (result.success && result.phone) {
      setSubmit({ status: "success", created: result.created, phone: result.phone })
      onRegistered?.()
    } else {
      setSubmit({ status: "idle" })
      setSubmitError(
        result.error === "invalid_phone"
          ? t("addDriver.error.phoneInvalid")
          : result.error && /network|fetch|offline/i.test(result.error)
            ? t("addDriver.error.network")
            : result.error
              ? `${t("addDriver.error.failed")} — ${result.error}`
              : t("addDriver.error.failed")
      )
    }
  }

  const isBusy = submit.status === "submitting"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-[rgba(2,6,14,0.72)] backdrop-blur-[3px]"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("addDriver.title")}
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="admin-card relative z-10 my-auto w-full max-w-md p-5 sm:p-6"
          >
            {/* Header */}
            <div className="mb-5 flex items-start gap-3">
              <span
                className="admin-icon-badge"
                style={
                  {
                    "--badge-bg": "rgba(16,185,129,0.12)",
                    "--badge-border": "rgba(16,185,129,0.3)",
                    "--badge-color": "#34d399",
                  } as React.CSSProperties
                }
              >
                <UserPlus className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold tracking-tight text-[var(--admin-text)] sm:text-base">
                  {t("addDriver.title")}
                </h3>
                <p className="mt-0.5 text-[11.5px] leading-tight text-[var(--admin-text-3)]">
                  {t("addDriver.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={t("addDriver.close")}
                className="flex-shrink-0 rounded-[10px] p-1.5 text-[var(--admin-text-3)] transition-colors hover:bg-white/5 hover:text-[var(--admin-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success state */}
            {submit.status === "success" ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex flex-col items-center rounded-[14px] border border-[rgba(52,211,153,0.3)] bg-[rgba(16,185,129,0.07)] px-4 py-7 text-center"
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(52,211,153,0.14)]">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </span>
                <p className="text-[14px] font-bold text-emerald-300">
                  {submit.created
                    ? t("addDriver.success.created.title")
                    : t("addDriver.success.updated.title")}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--admin-text-2)]">
                  {submit.created
                    ? t("addDriver.success.created.body", { phone: submit.phone })
                    : t("addDriver.success.updated.body", { phone: submit.phone })}
                </p>
                <div className="mt-5 flex w-full flex-col gap-2.5">
                  <button type="button" onClick={resetForm} className="admin-btn-primary w-full">
                    {t("addDriver.success.addAnother")}
                  </button>
                  <button type="button" onClick={handleClose} className="admin-btn-ghost w-full">
                    {t("addDriver.close")}
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Phone */}
                <div>
                  <label htmlFor="add-driver-phone" className="admin-label mb-2">
                    {t("addDriver.phone")}
                  </label>
                  <div className="relative">
                    <Phone
                      className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-3)] ${
                        isRTL ? "end-3.5" : "start-3.5"
                      }`}
                      strokeWidth={2}
                    />
                    <input
                      id="add-driver-phone"
                      ref={phoneInputRef}
                      type="tel"
                      dir="ltr"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        setPhoneError(null)
                        setSubmitError(null)
                        setLookup({ status: "idle" })
                      }}
                      onBlur={handlePhoneBlur}
                      disabled={isBusy}
                      placeholder={t("addDriver.phonePlaceholder")}
                      className={`admin-input ${isRTL ? "pe-10" : "ps-10"}`}
                    />
                  </div>

                  {/* Phone validation error */}
                  {phoneError && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {phoneError}
                    </p>
                  )}

                  {/* Firebase identification status */}
                  <AnimatePresence mode="wait">
                    {lookup.status === "checking" && (
                      <motion.p
                        key="checking"
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-[var(--admin-text-3)]"
                      >
                        <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                        {t("addDriver.identifying")}
                      </motion.p>
                    )}
                    {lookup.status === "found" && (
                      <motion.p
                        key="found"
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400"
                      >
                        <Search className="h-3 w-3 flex-shrink-0" />
                        <span className="min-w-0 flex-1">
                          {t("addDriver.found")}
                          {lookup.lookup.name ? (
                            <>
                              {" · "}
                              <Bidi>{lookup.lookup.name}</Bidi>
                            </>
                          ) : null}
                        </span>
                      </motion.p>
                    )}
                    {lookup.status === "notFound" && (
                      <motion.p
                        key="notFound"
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-amber-400"
                      >
                        <Search className="h-3 w-3 flex-shrink-0" />
                        {t("addDriver.notFound")}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Name (optional) */}
                <div>
                  <label htmlFor="add-driver-name" className="admin-label mb-2">
                    {t("addDriver.name")}{" "}
                    <span className="font-normal text-[var(--admin-text-3)]">
                      {t("addDriver.optional")}
                    </span>
                  </label>
                  <div className="relative">
                    <User
                      className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-3)] ${
                        isRTL ? "end-3.5" : "start-3.5"
                      }`}
                      strokeWidth={2}
                    />
                    <input
                      id="add-driver-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isBusy}
                      placeholder={t("addDriver.namePlaceholder")}
                      className={`admin-input ${isRTL ? "pe-10" : "ps-10"}`}
                    />
                  </div>
                </div>

                {/* Bus line (optional) */}
                <div>
                  <label htmlFor="add-driver-line" className="admin-label mb-2">
                    {t("addDriver.line")}{" "}
                    <span className="font-normal text-[var(--admin-text-3)]">
                      {t("addDriver.optional")}
                    </span>
                  </label>
                  <div className="relative">
                    <Bus
                      className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-3)] ${
                        isRTL ? "end-3.5" : "start-3.5"
                      }`}
                      strokeWidth={2}
                    />
                    <input
                      id="add-driver-line"
                      type="text"
                      value={line}
                      onChange={(e) => setLine(e.target.value)}
                      disabled={isBusy}
                      placeholder={t("addDriver.linePlaceholder")}
                      className={`admin-input ${isRTL ? "pe-10" : "ps-10"}`}
                    />
                  </div>
                </div>

                {/* Submit error */}
                {submitError && (
                  <div className="flex items-start gap-2.5 rounded-[12px] border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3.5 py-3">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                    <p className="text-xs leading-relaxed text-red-300">{submitError}</p>
                  </div>
                )}

                {/* Hint */}
                <p className="text-[11px] leading-relaxed text-[var(--admin-text-3)]">
                  {t("addDriver.hint")}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
                  <button type="submit" disabled={isBusy} className="admin-btn-primary flex-1">
                    {isBusy ? (
                      <>
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "rtl-flip" : ""}`} />
                        {t("addDriver.registering")}
                      </>
                    ) : (
                      <>
                        <UserPlus className={`h-4 w-4 ${isRTL ? "rtl-flip" : ""}`} strokeWidth={2.2} />
                        {t("addDriver.submit")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isBusy}
                    className="admin-btn-ghost sm:w-28"
                  >
                    {t("addDriver.cancel")}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
