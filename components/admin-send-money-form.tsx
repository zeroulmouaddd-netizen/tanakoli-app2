"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { fetchAllDrivers, sendMoneyToDriver, type DriverRecord } from "@/lib/admin-utils"
import { Send, AlertCircle, CheckCircle, X, ChevronDown, Loader2, Wallet } from "lucide-react"

interface SendMoneyFormProps {
  preselectedDriver?: string
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Inline toast ─────────────────────────────────────────────────────────────
interface ToastProps {
  type: "success" | "error"
  title: string
  body: string
  onDismiss: () => void
}

function Toast({ type, title, body, onDismiss }: ToastProps) {
  const reduced = useReducedMotion()
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isSuccess = type === "success"
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`flex items-start gap-3 rounded-[14px] border p-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md ${
        isSuccess
          ? "border-[rgba(52,211,153,0.35)] bg-[rgba(6,44,32,0.92)]"
          : "border-[rgba(248,113,113,0.35)] bg-[rgba(54,18,22,0.92)]"
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${isSuccess ? "text-emerald-400" : "text-red-400"}`}>
        {isSuccess ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold ${isSuccess ? "text-emerald-300" : "text-red-300"}`}>
          {title}
        </p>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-400">{body}</p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────
export function AdminSendMoneyForm({ preselectedDriver }: SendMoneyFormProps) {
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [driversLoading, setDriversLoading] = useState(true)

  const [driverPhone, setDriverPhone] = useState(preselectedDriver || "")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [toast, setToast] = useState<Omit<ToastProps, "onDismiss"> | null>(null)
  // Presentational success flash on the submit button (no logic change)
  const [sentFlash, setSentFlash] = useState(false)
  const reduced = useReducedMotion()

  // Load all drivers from Firestore
  useEffect(() => {
    const unsub = fetchAllDrivers((list) => {
      setDrivers(list)
      setDriversLoading(false)
    })
    return () => unsub()
  }, [])

  // Sync preselected driver from fleet table
  useEffect(() => {
    if (preselectedDriver) {
      setDriverPhone(preselectedDriver)
      setToast(null)
    }
  }, [preselectedDriver])

  const selectedDriver = drivers.find((d) => d.phone === driverPhone)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)

    if (!driverPhone.trim()) {
      setToast({ type: "error", title: "No driver selected", body: "Please choose a driver from the list." })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ type: "error", title: "Invalid amount", body: "Enter a positive number greater than 0." })
      return
    }
    if (amountNum > 50000) {
      setToast({ type: "error", title: "Amount too large", body: "Single transfer limit is 50,000 د.ج." })
      return
    }

    const driverLabel = selectedDriver?.name || driverPhone
    const confirmed = window.confirm(
      `Transfer ${amountNum.toFixed(0)} د.ج to ${driverLabel}?\n\nThis will update their wallet balance immediately.`
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      const result = await sendMoneyToDriver(driverPhone, amountNum, note || "Admin transfer")

      if (result.success) {
        setToast({
          type: "success",
          title: "Transfer successful",
          body: `${amountNum.toFixed(0)} د.ج sent to ${result.driverName || driverLabel}. New balance: ${result.newBalance?.toFixed(0)} د.ج`,
        })
        setAmount("")
        setNote("")
        setSentFlash(true)
        setTimeout(() => setSentFlash(false), 1800)
        // Keep driver selected for follow-up transfers
      } else {
        setToast({
          type: "error",
          title: "Transfer failed",
          body: result.error || "Unknown error — please try again.",
        })
      }
    } catch (err) {
      setToast({
        type: "error",
        title: "Network error",
        body: (err as Error).message || "Could not reach Firebase. Check your connection.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const PRESETS = [100, 200, 500, 1000]

  return (
    <div
      className="admin-card p-4 sm:p-5"
      style={{
        background:
          "radial-gradient(420px 140px at 50% -40px, rgba(16,185,129,0.1), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.008)), var(--admin-surface)",
      }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <span
          className="admin-icon-badge"
          style={
            {
              "--badge-bg": "rgba(16,185,129,0.13)",
              "--badge-border": "rgba(16,185,129,0.32)",
              "--badge-color": "#34d399",
            } as React.CSSProperties
          }
        >
          <Send className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div>
          <h3 className="text-[14px] font-bold leading-tight tracking-tight text-[var(--admin-text)]">
            Send Money to Driver
          </h3>
          <p className="text-[11.5px] leading-tight text-[var(--admin-text-3)]">Instant wallet top-up</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Driver selection */}
        <div>
          <label htmlFor="admin-driver-select" className="admin-label mb-2">
            Select Driver
          </label>

          {driversLoading ? (
            <div className="flex items-center gap-2.5 rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3">
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-emerald-400" />
              <span className="text-xs text-[var(--admin-text-2)]">Loading drivers from Firestore…</span>
            </div>
          ) : (
            <div className="relative">
              <select
                id="admin-driver-select"
                value={driverPhone}
                onChange={(e) => {
                  setDriverPhone(e.target.value)
                  setToast(null)
                }}
                disabled={isLoading}
                className="admin-input bg-[#0a1120] pe-10 text-sm"
              >
                <option value="" className="bg-[#0d1524]">— Choose a driver —</option>
                {drivers.map((d) => (
                  <option key={d.id || d.phone} value={d.phone} className="bg-[#0d1524]">
                    {d.name !== d.phone ? `${d.name}  ·  ${d.phone}` : d.phone}
                    {d.isLive ? "  🟢" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-3)]" />
            </div>
          )}

          {!driversLoading && drivers.length === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              No drivers found in Firestore. Check the users collection.
            </p>
          )}

          {/* Selected driver card */}
          <AnimatePresence>
            {selectedDriver && (
              <motion.div
                key={selectedDriver.phone}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="mt-2.5 flex items-center gap-3 rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.14)] text-[13px] font-bold text-emerald-300">
                  {selectedDriver.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--admin-text)]">
                    {selectedDriver.name}
                  </p>
                  <p className="admin-num text-[11px] text-[var(--admin-text-3)]">{selectedDriver.phone}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="admin-num text-xs font-bold text-emerald-300">
                    {selectedDriver.balance.toFixed(0)} د.ج
                  </p>
                  <p className="text-[10px] text-[var(--admin-text-3)]">current</p>
                </div>
                {selectedDriver.isLive && <span className="live-dot flex-shrink-0" aria-hidden="true" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="admin-amount-input" className="admin-label mb-2">
            Amount (د.ج)
          </label>
          <div className="relative">
            <input
              id="admin-amount-input"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading || !driverPhone}
              placeholder="0"
              min="1"
              max="50000"
              step="1"
              inputMode="numeric"
              className="admin-input pe-[58px] text-[15px] font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-md border border-[var(--admin-border)] bg-[rgba(148,163,184,0.08)] px-2 py-1 text-[11px] font-semibold text-[var(--admin-text-2)]">
              د.ج
            </span>
          </div>

          {/* Presets */}
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                disabled={isLoading || !driverPhone}
                data-active={amount === String(p)}
                className="admin-chip"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Note (optional) */}
        <div>
          <label htmlFor="admin-note-input" className="admin-label mb-2">
            Note <span className="normal-case text-[var(--admin-text-3)]">(optional)</span>
          </label>
          <input
            id="admin-note-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Monthly bonus"
            maxLength={120}
            className="admin-input text-sm"
          />
        </div>

        {/* Preview */}
        <AnimatePresence>
          {selectedDriver && amount && parseFloat(amount) > 0 && (
            <motion.div
              key="preview"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="rounded-[14px] border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.06)] px-4 py-3.5"
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--admin-text-2)]">Before transfer</span>
                <span className="admin-num text-[var(--admin-text-2)]">
                  {selectedDriver.balance.toFixed(0)} د.ج
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--admin-text-2)]">Transfer amount</span>
                <span className="admin-num font-medium text-emerald-300">
                  +{parseFloat(amount).toFixed(0)} د.ج
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[rgba(16,185,129,0.18)] pt-2.5">
                <span className="text-[13px] font-semibold text-[var(--admin-text)]">New balance</span>
                <span className="admin-num text-[15px] font-bold text-emerald-300">
                  {(selectedDriver.balance + parseFloat(amount)).toFixed(0)} د.ج
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <Toast
              type={toast.type}
              title={toast.title}
              body={toast.body}
              onDismiss={() => setToast(null)}
            />
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !driverPhone || !amount || driversLoading || parseFloat(amount) <= 0}
          className="admin-btn-primary w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : sentFlash ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Sent
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Send {amount && parseFloat(amount) > 0 ? `${parseFloat(amount).toFixed(0)} د.ج` : "Money"}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
