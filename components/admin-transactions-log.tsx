"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { fetchRecentTransactions, type Transaction } from "@/lib/admin-utils"
import { Activity, TrendingUp, TrendingDown, Inbox } from "lucide-react"

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function AdminTransactionsLog() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const reduced = useReducedMotion()

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

  // Track brand-new rows so they get a subtle highlight flash (visual only)
  const knownIds = useRef<Set<string> | null>(null)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (isLoading) return
    const allIds = new Set(transactions.map((t) => t.id))
    if (knownIds.current === null) {
      knownIds.current = allIds
      return
    }
    const fresh = [...allIds].filter((id) => !knownIds.current!.has(id))
    knownIds.current = allIds
    if (fresh.length > 0) {
      setFlashIds(new Set(fresh))
      const timer = setTimeout(() => setFlashIds(new Set()), 1500)
      return () => clearTimeout(timer)
    }
  }, [transactions, isLoading])

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
      return <TrendingDown className="h-4 w-4 text-red-400" />
    }
    return <TrendingUp className="h-4 w-4 text-emerald-400" />
  }

  const isDebit = (type: string) => type.includes("deduction") || type.includes("purchase")

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

  // ── Row content pieces (shared by table + mobile cards) ──────────────────
  const typeChipStyle = (type: string): React.CSSProperties =>
    isDebit(type)
      ? { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.22)" }
      : { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)" }

  const amountClass = (type: string) => (isDebit(type) ? "text-red-400" : "text-emerald-400")

  const statusPill = (status: string) => (
    <span
      className={`admin-pill ${status === "completed" ? "admin-pill-success" : "admin-pill-warn"}`}
    >
      {status}
    </span>
  )

  return (
    <div className="admin-card p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          <span
            className="admin-icon-badge"
            style={
              {
                "--badge-bg": "rgba(34,211,238,0.12)",
                "--badge-border": "rgba(34,211,238,0.3)",
                "--badge-color": "#22d3ee",
              } as React.CSSProperties
            }
          >
            <Activity className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <h3 className="text-[15px] font-bold tracking-tight text-[var(--admin-text)] sm:text-base">
            Recent Transactions
          </h3>
          <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-3)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--admin-text-2)]">
            Last 50
          </span>
        </div>
        {!isLoading && (
          <p className="text-xs text-[var(--admin-text-3)]">{filteredTransactions.length} transactions</p>
        )}
      </div>

      {/* Filter Tabs — segmented control with sliding indicator */}
      <div className="no-scrollbar -mx-1 mb-4 overflow-x-auto px-1 pb-0.5">
        <div className="admin-seg-track" role="tablist" aria-label="Transaction filters">
          {transactionTypes.map((type) => (
            <button
              key={type.value}
              role="tab"
              aria-selected={filter === type.value}
              onClick={() => setFilter(type.value)}
              data-active={filter === type.value}
              className="admin-seg-tab"
            >
              {filter === type.value && (
                <motion.span
                  layoutId="tx-seg-indicator"
                  className="admin-seg-indicator"
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36, mass: 0.7 }}
                />
              )}
              <span className="relative z-10">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 rounded-[14px] border border-[var(--admin-border)] p-3.5">
              <div className="admin-skeleton h-9 w-9 flex-shrink-0 rounded-[10px]" />
              <div className="flex-1 space-y-2">
                <div className="admin-skeleton h-3.5 w-40 max-w-[50%]" />
                <div className="admin-skeleton h-3 w-24" />
              </div>
              <div className="admin-skeleton h-4 w-20 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop: table ─────────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className="sticky top-[69px] z-10 bg-[#0b1322] px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)]">
                  Type
                </th>
                <th className="sticky top-[69px] z-10 bg-[#0b1322] px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)]">
                  User
                </th>
                <th className="sticky top-[69px] z-10 bg-[#0b1322] px-3 py-2.5 text-end text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)]">
                  Amount
                </th>
                <th className="sticky top-[69px] z-10 bg-[#0b1322] px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)]">
                  Status
                </th>
                <th className="sticky top-[69px] z-10 bg-[#0b1322] px-3 py-2.5 text-end text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)]">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredTransactions.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      layout
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, y: -6, transition: { duration: 0.14 } }}
                      transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.2), ease: EASE }}
                      className={`border-b border-[rgba(148,163,184,0.08)] transition-colors odd:bg-[rgba(148,163,184,0.025)] hover:bg-[rgba(16,185,129,0.05)] ${
                        flashIds.has(tx.id) ? "tx-flash" : ""
                      }`}
                    >
                      {/* Type */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
                            style={typeChipStyle(tx.type)}
                          >
                            {getTypeIcon(tx.type)}
                          </span>
                          <span className="whitespace-nowrap text-[13px] font-medium text-[var(--admin-text)]">
                            {getTypeLabel(tx.type)}
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="max-w-[220px] px-3 py-3">
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-[var(--admin-text)]">
                            {tx.userName || tx.userId.slice(0, 8)}...
                          </span>
                          {tx.driverPhone && (
                            <span className="admin-num block truncate text-[11px] text-[var(--admin-text-3)]">
                              Driver: {tx.driverPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="whitespace-nowrap px-3 py-3 text-end">
                        <span className={`admin-num text-[13.5px] font-bold ${amountClass(tx.type)}`}>
                          {isDebit(tx.type) ? "-" : "+"}{" "}
                          {tx.amount.toFixed(2)} د.ج
                        </span>
                        {tx.newBalance !== undefined && (
                          <span className="admin-num mt-0.5 block text-[11px] text-[var(--admin-text-3)]">
                            New: {tx.newBalance.toFixed(2)} د.ج
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">{statusPill(tx.status)}</td>

                      {/* Time */}
                      <td className="whitespace-nowrap px-3 py-3 text-end">
                        <span className="admin-num text-xs text-[var(--admin-text-3)]">
                          {formatTime(tx.timestamp)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              ) : (
                <EmptyRow />
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Mobile: card list ──────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="space-y-2.5 md:hidden">
          {filteredTransactions.length > 0 ? (
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredTransactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  layout
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6, transition: { duration: 0.14 } }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.24), ease: EASE }}
                  className={`rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3.5 ${
                    flashIds.has(tx.id) ? "tx-flash" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                      style={typeChipStyle(tx.type)}
                    >
                      {getTypeIcon(tx.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--admin-text)]">
                        {getTypeLabel(tx.type)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--admin-text-2)]">
                        {tx.userName || tx.userId.slice(0, 8)}...
                      </p>
                      {tx.driverPhone && (
                        <p className="admin-num mt-0.5 truncate text-[11px] text-[var(--admin-text-3)]">
                          Driver: {tx.driverPhone}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-end">
                      <p className={`admin-num text-[15px] font-bold ${amountClass(tx.type)}`}>
                        {isDebit(tx.type) ? "-" : "+"}{" "}
                        {tx.amount.toFixed(2)} <span className="text-[12px] font-semibold">د.ج</span>
                      </p>
                      {tx.newBalance !== undefined && (
                        <p className="admin-num mt-0.5 text-[11px] text-[var(--admin-text-3)]">
                          New: {tx.newBalance.toFixed(2)} د.ج
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[rgba(148,163,184,0.1)] pt-2.5">
                    {statusPill(tx.status)}
                    <span className="admin-num text-[11px] text-[var(--admin-text-3)]">
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--admin-border-strong)] bg-[rgba(148,163,184,0.03)] px-6 py-12 text-center">
              <span
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.25)",
                }}
              >
                <Inbox className="h-6 w-6 text-[#22d3ee]" />
              </span>
              <p className="text-sm font-medium text-[var(--admin-text-2)]">No transactions found</p>
            </div>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-[var(--admin-border)] pt-5 sm:gap-4">
          <div className="rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 sm:px-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)] sm:text-[11px]">
              Total Transactions
            </p>
            <p className="admin-num mt-1 text-[15px] font-bold text-[var(--admin-text)] sm:text-lg">
              {filteredTransactions.length}
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 sm:px-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)] sm:text-[11px]">
              Total Volume
            </p>
            <p className="admin-num mt-1 truncate text-[13px] font-bold text-emerald-400 sm:text-[15px]">
              +
              {filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} د.ج
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 sm:px-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-3)] sm:text-[11px]">
              Last Activity
            </p>
            <p className="admin-num mt-1 truncate text-[11.5px] font-medium leading-[26px] text-[var(--admin-text-2)] sm:text-[13px]">
              {formatTime(filteredTransactions[0]?.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={5} className="py-10 text-center">
        <div className="flex flex-col items-center">
          <span
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.25)",
            }}
          >
            <Inbox className="h-6 w-6 text-[#22d3ee]" />
          </span>
          <p className="text-sm font-medium text-[var(--admin-text-2)]">No transactions found</p>
        </div>
      </td>
    </tr>
  )
}
