"use client"

/**
 * Admin Dashboard — "Insights" section.
 *
 * Four compact, read-only widgets derived from the transactions list the
 * dashboard already loads. No queries, no writes, no state of the existing
 * features is touched: the page simply hands over the array it already has.
 *
 * Layout: a snap carousel with pagination dots on phones, a 2-column grid on
 * tablets and a 4-column grid on desktop.
 */

import { useMemo, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Amount, Bidi } from "@/components/admin-bidi"
import { AreaChart, DonutChart, RankTable, RingGauge, type DonutSlice, type RankRow } from "@/components/admin-charts"
import {
  buildCompletion,
  buildTopDrivers,
  buildTypeBreakdown,
  buildVolumeSeries,
  OTHER_TYPE,
} from "@/lib/admin-insights"
import type { Transaction } from "@/lib/admin-utils"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import { ChartArea, ChartPie, Gauge, Sparkles, Trophy, Users, type LucideIcon } from "lucide-react"

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EMPTY_TX: Transaction[] = []

/** Palette drawn from the existing admin accents (emerald / cyan / blue / violet). */
const TYPE_COLORS: Record<string, string> = {
  admin_transfer: "#34d399",
  ticket_purchase: "#a78bfa",
  balance_recharge: "#22d3ee",
  fare_deduction: "#60a5fa",
  [OTHER_TYPE]: "#94a3b8",
}

interface Tone {
  color: string
  tint: string
  border: string
}

const TONES: Record<"donut" | "ring" | "volume" | "drivers", Tone> = {
  donut: { color: "#a78bfa", tint: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  ring: { color: "#34d399", tint: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" },
  volume: { color: "#22d3ee", tint: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.3)" },
  drivers: { color: "#fbbf24", tint: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
}

const fmtCount = (n: number) => Math.round(n).toLocaleString("en-US")
const fmtAmount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })

// ─── Card shell ──────────────────────────────────────────────────────────────

function InsightCard({
  index,
  icon: Icon,
  title,
  tone,
  children,
}: {
  index: number
  icon: LucideIcon
  title: string
  tone: Tone
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.07, ease: EASE }}
      className="flex min-w-0 flex-1"
    >
      <section className="admin-card admin-card-hover flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-4 flex min-w-0 items-center gap-2.5">
          <span
            className="admin-icon-badge"
            style={
              {
                "--badge-bg": tone.tint,
                "--badge-border": tone.border,
                "--badge-color": tone.color,
              } as React.CSSProperties
            }
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h4 className="min-w-0 truncate text-[13.5px] font-bold tracking-tight text-[var(--admin-text)]">
            {title}
          </h4>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </section>
    </motion.div>
  )
}

// ─── Skeletons (same footprint as the real widgets → no layout shift) ───────

function RingSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div className="admin-skeleton rounded-full" style={{ width: 124, height: 124 }} />
      <div className="mt-3 w-full space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="admin-skeleton h-8 w-full rounded-[10px]" />
        ))}
      </div>
    </div>
  )
}

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div className="admin-skeleton rounded-full" style={{ width: 124, height: 124 }} />
      <div className="mt-3 flex w-full flex-col gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-[44px] items-center px-2">
            <div className="admin-skeleton h-[34px] w-full rounded-[10px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AreaSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="admin-skeleton min-h-[120px] flex-1 rounded-[12px]" />
      <div className="mt-2 flex justify-between">
        <div className="admin-skeleton h-3 w-16" />
        <div className="admin-skeleton h-3 w-16" />
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <div className="admin-skeleton h-3.5 w-32" />
            <div className="admin-skeleton h-2.5 w-full" />
          </div>
          <div className="admin-skeleton h-3.5 w-8" />
          <div className="admin-skeleton h-3.5 w-16" />
        </div>
      ))}
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function AdminInsights({ transactions }: { transactions: Transaction[] | null }) {
  const { t, isRTL, formatDateTime } = useAdminI18n()
  const loading = transactions === null
  const list = transactions ?? EMPTY_TX

  // ── Derived, read-only data (pure, memoised) ───────────────────────────────
  const types = useMemo(() => buildTypeBreakdown(list), [list])
  const completion = useMemo(() => buildCompletion(list), [list])
  const volume = useMemo(() => buildVolumeSeries(list, 12), [list])
  const drivers = useMemo(() => buildTopDrivers(list, 4), [list])

  const slices: DonutSlice[] = useMemo(
    () =>
      types.map((s) => ({
        key: s.key,
        count: s.count,
        share: s.share,
        label: s.key === OTHER_TYPE ? t("insights.other") : t(`type.${s.key}`),
        color: TYPE_COLORS[s.key] ?? TYPE_COLORS[OTHER_TYPE],
      })),
    [types, t]
  )

  const donutSummary = slices
    .filter((s) => s.count > 0)
    .map((s) => `${s.label} ${fmtCount(s.count)}`)
    .join(", ")

  // Time axis: short windows show clock time, longer ones show dates.
  const spanMs = volume ? volume.to - volume.from : 0
  const fmtBucket = (ms: number) =>
    formatDateTime(
      ms,
      spanMs <= 36 * 3_600_000
        ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "short" }
    )

  const driverRows: RankRow[] = drivers.map((d) => ({
    key: d.key,
    name: d.name ? <bdi>{d.name}</bdi> : <Bidi>{d.phone}</Bidi>,
    sub: d.name ? <Bidi>{d.phone}</Bidi> : undefined,
    count: fmtCount(d.count),
    amount: <Amount value={fmtAmount(d.total)} />,
    share: d.share,
  }))

  // ── Carousel (mobile) ──────────────────────────────────────────────────────
  const slides: ReactNode[] = [
    // 1 · Donut: distribution by type
    <InsightCard key="donut" index={0} icon={ChartPie} title={t("insights.donut.title")} tone={TONES.donut}>
      {loading ? (
        <DonutSkeleton />
      ) : (
        <DonutChart
          size={112}
          slices={slices}
          total={list.length}
          centerCaption={t("insights.donut.caption")}
          ariaLabel={
            list.length > 0
              ? t("insights.donut.summary", { parts: donutSummary, total: fmtCount(list.length) })
              : t("insights.donut.empty")
          }
          emptyMessage={t("insights.donut.empty")}
        />
      )}
    </InsightCard>,

    // 2 · Ring: completion rate
    <InsightCard key="ring" index={1} icon={Gauge} title={t("insights.ring.title")} tone={TONES.ring}>
      {loading ? (
        <RingSkeleton />
      ) : (
        <div className="flex flex-col">
          <RingGauge
            ratio={completion.rate}
            empty={completion.total === 0}
            ariaLabel={
              completion.total > 0
                ? t("insights.ring.summary", {
                    pct: Math.round(completion.rate * 100),
                    total: fmtCount(completion.total),
                  })
                : t("insights.ring.empty")
            }
            caption={t("insights.ring.caption")}
            emptyMessage={t("insights.ring.empty")}
          />
          {completion.total > 0 && (
            <ul className="mt-3 w-full space-y-1.5">
              {[
                { label: t("status.completed"), value: completion.completed, color: "#34d399" },
                { label: t("status.pending"), value: completion.pending, color: "#fbbf24" },
                { label: t("status.failed"), value: completion.failed, color: "#f87171" },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex min-h-[32px] items-center justify-between gap-3 rounded-[10px] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
                    <span className="truncate text-[12px] font-medium text-[var(--admin-text-2)]">{row.label}</span>
                  </span>
                  <span className="admin-num text-[13px] font-bold" style={{ color: row.color }}>
                    {fmtCount(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </InsightCard>,

    // 3 · Area: volume across the loaded window
    <InsightCard key="volume" index={2} icon={ChartArea} title={t("insights.volume.title")} tone={TONES.volume}>
      {loading ? (
        <AreaSkeleton />
      ) : (
        <div className="flex h-full flex-col">
          <AreaChart
            values={volume ? volume.buckets.map((b) => b.volume) : Array.from({ length: 12 }, () => 0)}
            isRTL={isRTL}
            empty={!volume}
            emptyMessage={t("insights.volume.empty")}
            ariaLabel={
              volume
                ? t("insights.volume.summary", {
                    total: fmtAmount(volume.total),
                    peak: fmtAmount(volume.peak),
                  })
                : t("insights.volume.empty")
            }
            startLabel={volume ? fmtBucket(volume.from) : ""}
            endLabel={volume ? fmtBucket(volume.to) : ""}
            color={TONES.volume.color}
            renderTip={(i) => {
              const bucket = volume?.buckets[i]
              if (!bucket) return null
              return (
                <div className="space-y-0.5">
                  <p className="admin-num text-[10.5px] text-[var(--admin-text-2)]">{fmtBucket(bucket.start)}</p>
                  <p className="admin-num text-[13px] font-bold text-[#67e8f9]">
                    <Amount value={fmtAmount(bucket.volume)} />
                  </p>
                  <p className="admin-num text-[10.5px] text-[var(--admin-text-2)]">
                    {t("insights.volume.txCount", { n: bucket.count })}
                  </p>
                </div>
              )
            }}
          />
          {volume && (
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[rgba(148,163,184,0.1)] pt-2.5 text-[11px] text-[var(--admin-text-2)]">
              <span className="min-w-0 truncate">
                {t("insights.volume.total")} <Amount value={fmtAmount(volume.total)} />
              </span>
              <span className="min-w-0 truncate">
                {t("insights.volume.peak")} <Amount value={fmtAmount(volume.peak)} />
              </span>
            </div>
          )}
          {volume && (
            <ul className="sr-only">
              {volume.buckets.map((b) => (
                <li key={b.start}>
                  {fmtBucket(b.start)} {fmtAmount(b.volume)} {t("insights.volume.txCount", { n: b.count })}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </InsightCard>,

    // 4 · Top drivers: compact ranking table
    <InsightCard key="drivers" index={3} icon={Trophy} title={t("insights.top.title")} tone={TONES.drivers}>
      {loading ? (
        <TableSkeleton />
      ) : driverRows.length > 0 ? (
        <RankTable
          rows={driverRows}
          headers={{
            name: t("insights.top.driver"),
            count: t("insights.top.count"),
            amount: t("insights.top.amount"),
          }}
          caption={t("insights.top.summary", { n: driverRows.length })}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--admin-border-strong)] bg-[rgba(148,163,184,0.03)] px-4 py-8 text-center">
          <span
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <Users className="h-5 w-5 text-[#fbbf24]" />
          </span>
          <p className="text-[12.5px] leading-relaxed text-[var(--admin-text-2)]">{t("insights.top.empty")}</p>
        </div>
      )}
    </InsightCard>,
  ]

  return (
    <div>
      {/* Section header */}
      <div className="mb-4 flex min-w-0 items-center gap-3 sm:mb-5">
        <span
          className="admin-icon-badge"
          style={
            {
              "--badge-bg": "rgba(167,139,250,0.12)",
              "--badge-border": "rgba(167,139,250,0.3)",
              "--badge-color": "#a78bfa",
            } as React.CSSProperties
          }
        >
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight text-[var(--admin-text)] sm:text-base">
            {t("insights.title")}
          </h3>
          <p className="truncate text-[11.5px] text-[var(--admin-text-2)]">{t("insights.subtitle")}</p>
        </div>
      </div>

      <InsightCarousel isRTL={isRTL} label={t("insights.title")} gotoLabel={(n) => t("insights.goto", { n })}>
        {slides}
      </InsightCarousel>
    </div>
  )
}

// ─── Carousel: snap scroller on phones, plain grid from 640px up ────────────

function slideStep(track: HTMLElement): number {
  const first = track.children[0] as HTMLElement | undefined
  const second = track.children[1] as HTMLElement | undefined
  if (!first || !second) return first?.offsetWidth ?? 0
  return Math.abs(second.offsetLeft - first.offsetLeft)
}

function InsightCarousel({
  children,
  isRTL,
  label,
  gotoLabel,
}: {
  children: ReactNode[]
  isRTL: boolean
  label: string
  gotoLabel: (n: number) => string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()
  const count = children.length

  const onScroll = () => {
    const track = trackRef.current
    if (!track || track.children.length < 2) return
    const step = slideStep(track)
    if (step <= 0) return
    // RTL scrollers report negative scrollLeft in modern browsers; abs covers both.
    const next = Math.min(count - 1, Math.max(0, Math.round(Math.abs(track.scrollLeft) / step)))
    setIndex((prev) => (prev === next ? prev : next))
  }

  const goTo = (i: number) => {
    const track = trackRef.current
    if (!track) return
    const step = slideStep(track)
    track.scrollTo({
      left: (isRTL ? -1 : 1) * i * step,
      behavior: reduced ? "auto" : "smooth",
    })
  }

  return (
    <div role="region" aria-label={label}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 items-stretch gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4"
      >
        {children.map((slide, i) => (
          <div key={i} className="flex w-[82%] shrink-0 snap-start sm:w-auto sm:min-w-0">
            {slide}
          </div>
        ))}
      </div>

      {/* Pagination dots — phones only. 44px hit areas, 8px visuals. */}
      <div className="mt-2 flex items-center justify-center sm:hidden">
        {children.map((_, i) => {
          const active = i === index
          return (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={gotoLabel(i + 1)}
              aria-current={active}
              className="relative flex h-11 w-9 items-center justify-center"
            >
              <span
                className="block h-2 rounded-full transition-all duration-300"
                style={{
                  width: active ? 20 : 8,
                  background: active ? "#a78bfa" : "rgba(148,163,184,0.35)",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
