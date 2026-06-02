"use client"

import { useEffect, useState } from "react"
import { fetchRecentTransactions, type Transaction } from "@/lib/admin-utils"
import { Activity, TrendingUp, TrendingDown, Send } from "lucide-react"

export function AdminTransactionsLog() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  // Subscribe to transactions
  useEffect(() => {
    console.log("[v0] Subscribing to transactions")
    setIsLoading(true)

    const unsubscribe = fetchRecentTransactions((txns) => {
      console.log("[v0] Transactions updated:", txns.length)
      setTransactions(txns)
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Filter transactions
  const filteredTransactions =
    filter === "all" ? transactions : transactions.filter((t) => t.type === filter)

  // Get transaction type display
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fare_deduction: "Fare Deduction",
      balance_recharge: "Driver Recharge",
      ticket_purchase: "Ticket Purchase",
      admin_transfer: "Admin Transfer",
      payment: "Payment",
      topup: "Top-up",
    }
    return labels[type] || type
  }

  // Get transaction icon
  const getTypeIcon = (type: string) => {
    if (type.includes("deduction") || type.includes("purchase")) {
      return <TrendingDown className="w-4 h-4 text-red-400" />
    }
    return <TrendingUp className="w-4 h-4 text-emerald-400" />
  }

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "N/A"

    try {
      const date = timestamp.toDate?.() || new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()

      if (diff < 60000) return "Just now"
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "N/A"
    }
  }

  const transactionTypes = [
    { value: "all", label: "All Transactions" },
    { value: "fare_deduction", label: "Fare Deductions" },
    { value: "balance_recharge", label: "Driver Recharges" },
    { value: "admin_transfer", label: "Admin Transfers" },
    { value: "ticket_purchase", label: "Ticket Purchases" },
  ]

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
            Last 50
          </span>
        </div>
        {!isLoading && (
          <p className="text-sm text-slate-400">{filteredTransactions.length} transactions</p>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {transactionTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === type.value
                ? "bg-cyan-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin mb-3" />
            <p className="text-slate-400">Loading transactions...</p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {!isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-3 text-slate-400 font-semibold">Type</th>
                <th className="text-left py-3 px-3 text-slate-400 font-semibold">User</th>
                <th className="text-right py-3 px-3 text-slate-400 font-semibold">Amount</th>
                <th className="text-left py-3 px-3 text-slate-400 font-semibold">Status</th>
                <th className="text-left py-3 px-3 text-slate-400 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Type */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tx.type)}
                        <span className="text-slate-200">{getTypeLabel(tx.type)}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-medium">
                          {tx.userName || tx.userId.slice(0, 8)}...
                        </span>
                        {tx.driverPhone && (
                          <span className="text-xs text-slate-400">
                            Driver: {tx.driverPhone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-semibold font-mono ${
                            tx.type.includes("deduction") || tx.type.includes("purchase")
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {tx.type.includes("deduction") || tx.type.includes("purchase")
                            ? "-"
                            : "+"}{" "}
                          {tx.amount.toFixed(2)} د.ج
                        </span>
                        {tx.newBalance !== undefined && (
                          <span className="text-xs text-slate-400">
                            New: {tx.newBalance.toFixed(2)} د.ج
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-3">
                      <span className="text-slate-400 text-xs">
                        {formatTime(tx.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-slate-400">No transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Summary */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Total Transactions</p>
            <p className="text-lg font-bold text-white">{filteredTransactions.length}</p>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Total Volume</p>
            <p className="text-lg font-bold text-emerald-400">
              +{filteredTransactions
                .reduce((sum, tx) => sum + tx.amount, 0)
                .toFixed(2)} د.ج
            </p>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Last Activity</p>
            <p className="text-sm text-slate-300">
              {formatTime(filteredTransactions[0]?.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
