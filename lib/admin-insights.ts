/**
 * Admin Dashboard — insight derivations (pure, read-only, display only).
 *
 * Everything here is computed from the transactions list the dashboard already
 * loads (the last 50 from `fetchRecentTransactions`). Nothing is fetched,
 * written or mutated, and no business value is changed: these helpers only
 * group and count what is already on screen.
 */

import type { Transaction } from "@/lib/admin-utils"
import { toDisplayDate } from "@/lib/i18n/admin-i18n"

/** Transaction types shown as their own slice, in a fixed, stable order. */
export const KNOWN_TYPES = [
  "admin_transfer",
  "ticket_purchase",
  "balance_recharge",
  "fare_deduction",
] as const

/** Bucket used for any type outside KNOWN_TYPES (only shown when present). */
export const OTHER_TYPE = "other"

export interface TypeSlice {
  /** Raw transaction type, or OTHER_TYPE. */
  key: string
  count: number
  /** count / total, 0..1 */
  share: number
}

/** Count of transactions per type (always lists the four known types). */
export function buildTypeBreakdown(txns: readonly Transaction[]): TypeSlice[] {
  const total = txns.length
  const counts = new Map<string, number>()
  const known = new Set<string>(KNOWN_TYPES)

  for (const tx of txns) {
    const key = known.has(tx.type) ? tx.type : OTHER_TYPE
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const keys: string[] = [...KNOWN_TYPES]
  if ((counts.get(OTHER_TYPE) ?? 0) > 0) keys.push(OTHER_TYPE)

  return keys.map((key) => {
    const count = counts.get(key) ?? 0
    return { key, count, share: total > 0 ? count / total : 0 }
  })
}

export interface CompletionStats {
  total: number
  completed: number
  pending: number
  failed: number
  /** completed / total, 0..1 (0 when there are no transactions) */
  rate: number
}

/** Status breakdown used by the completion-rate gauge. */
export function buildCompletion(txns: readonly Transaction[]): CompletionStats {
  let completed = 0
  let pending = 0
  let failed = 0
  for (const tx of txns) {
    if (tx.status === "completed") completed++
    else if (tx.status === "pending") pending++
    else if (tx.status === "failed") failed++
  }
  const total = txns.length
  return { total, completed, pending, failed, rate: total > 0 ? completed / total : 0 }
}

export interface VolumeBucket {
  start: number
  end: number
  /** Sum of amounts whose timestamp falls in this bucket. */
  volume: number
  count: number
}

export interface VolumeSeries {
  buckets: VolumeBucket[]
  /** Oldest timestamp in the window (ms). */
  from: number
  /** End of the window (ms): the later of the newest transaction and `now`. */
  to: number
  total: number
  peak: number
}

/**
 * Volume over time across the loaded window, split into equal time buckets
 * (oldest → newest). Transactions without a usable timestamp (e.g. a write that
 * is still pending on the server) are skipped here but still counted elsewhere.
 * Returns null when there are fewer than two dated transactions to plot.
 */
export function buildVolumeSeries(
  txns: readonly Transaction[],
  bucketCount = 12,
  now: number = Date.now()
): VolumeSeries | null {
  const points: Array<{ t: number; amount: number }> = []
  for (const tx of txns) {
    const date = toDisplayDate(tx.timestamp)
    if (!date) continue
    points.push({ t: date.getTime(), amount: Number(tx.amount) || 0 })
  }
  if (points.length < 2) return null

  let from = Infinity
  let newest = -Infinity
  for (const p of points) {
    if (p.t < from) from = p.t
    if (p.t > newest) newest = p.t
  }
  const to = Math.max(newest, now)
  // Never divide by zero when every transaction shares the same instant.
  const span = Math.max(to - from, 60_000)
  const step = span / bucketCount

  const buckets: VolumeBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    start: from + i * step,
    end: from + (i + 1) * step,
    volume: 0,
    count: 0,
  }))

  for (const p of points) {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((p.t - from) / step)))
    buckets[index].volume += p.amount
    buckets[index].count += 1
  }

  let total = 0
  let peak = 0
  for (const b of buckets) {
    total += b.volume
    if (b.volume > peak) peak = b.volume
  }

  return { buckets, from, to, total, peak }
}

export interface DriverRow {
  /** Normalised phone, used as the grouping key. */
  key: string
  /** Phone exactly as stored on the transaction. */
  phone: string
  /** Name exactly as stored, or null when the feed only had the phone. */
  name: string | null
  /** Number of transactions attributed to this driver. */
  count: number
  /** Sum of amounts. */
  total: number
  /** total / largest total in the list, 0..1 (drives the inline bar). */
  share: number
}

/** Same phone normalisation the admin utilities use (+213… / 213… → 0…). */
function normalisePhone(raw: string): string {
  const s = raw.replace(/\s+/g, "")
  if (s.startsWith("+213")) return "0" + s.slice(4)
  if (s.startsWith("213") && s.length === 12) return "0" + s.slice(3)
  return s
}

function isUsefulName(name: string | undefined, phone: string, key: string): name is string {
  if (!name) return false
  const trimmed = name.trim()
  if (!trimmed || trimmed === "Unknown") return false
  if (trimmed === phone || normalisePhone(trimmed) === key) return false
  return true
}

/**
 * Top drivers by total amount transferred. Only transactions that carry a
 * `driverPhone` are attributed to a driver (the same rule the fleet table uses).
 */
export function buildTopDrivers(txns: readonly Transaction[], limit = 4): DriverRow[] {
  const groups = new Map<string, { phone: string; name: string | null; count: number; total: number }>()

  for (const tx of txns) {
    const phone = tx.driverPhone?.trim()
    if (!phone) continue
    const key = normalisePhone(phone)
    if (!key) continue

    let entry = groups.get(key)
    if (!entry) {
      entry = { phone, name: null, count: 0, total: 0 }
      groups.set(key, entry)
    }
    entry.count += 1
    entry.total += Number(tx.amount) || 0
    if (entry.name === null && isUsefulName(tx.userName, phone, key)) {
      entry.name = tx.userName.trim()
    }
  }

  const rows = [...groups.entries()]
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit)

  const max = rows.reduce((m, r) => Math.max(m, r.total), 0)
  return rows.map((r) => ({ ...r, share: max > 0 ? r.total / max : 0 }))
}
