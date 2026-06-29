"use client"

import { useState, useEffect, useRef } from "react"
import { fetchAllDrivers, sendMoneyToDriver, type DriverRecord } from "@/lib/admin-utils"
import { Send, AlertCircle, CheckCircle, X, ChevronDown, Loader2, Wallet } from "lucide-react"

interface SendMoneyFormProps {
  preselectedDriver?: string
}

// ─── Inline toast ─────────────────────────────────────────────────────────────
interface ToastProps {
  type: "success" | "error"
  title: string
  body: string
  onDismiss: () => void
}

function Toast({ type, title, body, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isSuccess = type === "success"
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-xl transition-all ${
        isSuccess
          ? "bg-emerald-950/80 border-emerald-500/30"
          : "bg-red-950/80 border-red-500/30"
      }`}
    >
      <div className={`flex-shrink-0 mt-0.5 ${isSuccess ? "text-emerald-400" : "text-red-400"}`}>
        {isSuccess
          ? <CheckCircle className="w-4 h-4" />
          : <AlertCircle className="w-4 h-4" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isSuccess ? "text-emerald-300" : "text-red-300"}`}>
          {title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 break-words">{body}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
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
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/15">
          <Send className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Send Money to Driver</h3>
          <p className="text-xs text-slate-500">Instant wallet top-up</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Driver selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Select Driver
          </label>

          {driversLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-slate-400">Loading drivers from Firestore…</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={driverPhone}
                onChange={(e) => {
                  setDriverPhone(e.target.value)
                  setToast(null)
                }}
                disabled={isLoading}
                className="w-full appearance-none px-4 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— Choose a driver —</option>
                {drivers.map((d) => (
                  <option key={d.id || d.phone} value={d.phone}>
                    {d.name !== d.phone ? `${d.name}  ·  ${d.phone}` : d.phone}
                    {d.isLive ? "  🟢" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          )}

          {!driversLoading && drivers.length === 0 && (
            <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              No drivers found in Firestore. Check the users collection.
            </p>
          )}

          {/* Selected driver card */}
          {selectedDriver && (
            <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 flex-shrink-0">
                {selectedDriver.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{selectedDriver.name}</p>
                <p className="text-[11px] text-slate-500">{selectedDriver.phone}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-emerald-400">{selectedDriver.balance.toFixed(0)} د.ج</p>
                <p className="text-[10px] text-slate-600">current</p>
              </div>
              {selectedDriver.isLive && (
                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Amount (د.ج)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading || !driverPhone}
              placeholder="0"
              min="1"
              max="50000"
              step="1"
              className="w-full pl-4 pr-14 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
              د.ج
            </span>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                disabled={isLoading || !driverPhone}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  amount === String(p)
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:border-emerald-500/50 hover:text-slate-200"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Note (optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Note <span className="normal-case text-slate-600">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Monthly bonus"
            maxLength={120}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
        </div>

        {/* Preview */}
        {selectedDriver && amount && parseFloat(amount) > 0 && (
          <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Before transfer</span>
              <span className="text-slate-300 font-mono">{selectedDriver.balance.toFixed(0)} د.ج</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-400">Transfer amount</span>
              <span className="text-emerald-400 font-mono">+{parseFloat(amount).toFixed(0)} د.ج</span>
            </div>
            <div className="border-t border-slate-700/50 mt-2 pt-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-300">New balance</span>
              <span className="font-bold text-emerald-300 font-mono">
                {(selectedDriver.balance + parseFloat(amount)).toFixed(0)} د.ج
              </span>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <Toast
            type={toast.type}
            title={toast.title}
            body={toast.body}
            onDismiss={() => setToast(null)}
          />
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !driverPhone || !amount || driversLoading || parseFloat(amount) <= 0}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Send {amount && parseFloat(amount) > 0 ? `${parseFloat(amount).toFixed(0)} د.ج` : "Money"}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
