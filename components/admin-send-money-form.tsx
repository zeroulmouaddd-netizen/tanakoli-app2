"use client"

import { useState, useEffect } from "react"
import { sendMoneyToDriver, getAllDrivers } from "@/lib/admin-utils"
import { Send, AlertCircle, CheckCircle } from "lucide-react"

interface SendMoneyFormProps {
  preselectedDriver?: string
}

export function AdminSendMoneyForm({ preselectedDriver }: SendMoneyFormProps) {
  const [driverPhone, setDriverPhone] = useState(preselectedDriver || "")
  const [amount, setAmount] = useState("")
  const [drivers, setDrivers] = useState<Array<{ phone: string; name: string; balance: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [driversLoading, setDriversLoading] = useState(true)

  // Fetch drivers
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const allDrivers = await getAllDrivers()
        setDrivers(allDrivers)
      } catch (err) {
        console.error("[v0] Error loading drivers:", err)
        setError("Failed to load drivers")
      } finally {
        setDriversLoading(false)
      }
    }

    loadDrivers()
  }, [])

  // Update form when preselected driver changes
  useEffect(() => {
    if (preselectedDriver) {
      setDriverPhone(preselectedDriver)
      setSuccess(false)
      setError("")
    }
  }, [preselectedDriver])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    // Validation
    if (!driverPhone.trim()) {
      setError("Please select a driver")
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (amountNum > 10000) {
      setError("Amount cannot exceed 10,000 د.ج")
      return
    }

    // Confirmation
    const confirmed = window.confirm(
      `Send ${amountNum.toFixed(2)} د.ج to driver ${driverPhone}?`
    )

    if (!confirmed) return

    setIsLoading(true)

    try {
      const result = await sendMoneyToDriver(driverPhone, amountNum)

      if (result.success) {
        setSuccess(true)
        setAmount("")
        setDriverPhone(preselectedDriver || "")

        // Auto-dismiss success after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Failed to send money")
      }
    } catch (err) {
      setError((err as Error).message || "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedDriver = drivers.find((d) => d.phone === driverPhone)

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Send className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Send Money to Driver</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Driver Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Driver
          </label>
          <select
            value={driverPhone}
            onChange={(e) => {
              setDriverPhone(e.target.value)
              setSuccess(false)
              setError("")
            }}
            disabled={isLoading || driversLoading}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Choose a driver...</option>
            {drivers.map((driver) => (
              <option key={driver.phone} value={driver.phone}>
                {driver.name} ({driver.phone}) - Balance: {driver.balance.toFixed(2)} د.ج
              </option>
            ))}
          </select>
          {driversLoading && (
            <p className="text-xs text-slate-400 mt-1">Loading drivers...</p>
          )}
        </div>

        {/* Current Balance Display */}
        {selectedDriver && (
          <div className="p-3 bg-slate-700 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-300">
              Current Balance:{" "}
              <span className="font-semibold text-emerald-400">
                {selectedDriver.balance.toFixed(2)} د.ج
              </span>
            </p>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Amount (د.ج)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading || !driverPhone}
              placeholder="Enter amount"
              min="0"
              max="10000"
              step="0.01"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
              د.ج
            </span>
          </div>
        </div>

        {/* Preset Amounts */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Quick Select
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[100, 200, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                disabled={isLoading || !driverPhone}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preset}د.ج
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300">
              Money sent successfully to {driverPhone}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !driverPhone || !amount || driversLoading}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Money
            </>
          )}
        </button>
      </form>
    </div>
  )
}
