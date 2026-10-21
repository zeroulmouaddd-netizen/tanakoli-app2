"use client"

/**
 * Admin Dashboard — lightweight, dependency-free chart primitives.
 *
 * Inline SVG + CSS only (no chart library). Each primitive is purely
 * presentational: it receives already-derived numbers and renders them.
 * Entrance animations run once when the chart scrolls into view, data updates
 * tween smoothly, and reduced-motion users get the final state instantly.
 */

import { useId, useRef, useState, type ReactNode } from "react"
import { Bidi } from "@/components/admin-bidi"
import { useInViewOnce } from "@/hooks/use-in-view-once"
import { useElementSize } from "@/hooks/use-element-size"
import { useIntroDone, useTweenValues } from "@/hooks/use-tween-values"

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const TAU = Math.PI * 2

/** Stable, SVG-id-safe id derived from React's useId. */
function useSvgId(prefix: string) {
  const raw = useId()
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9]/g, "")}`
}

/** Shared dashed "ghost" track used by every empty state. */
function GhostTrack({ cx, cy, r, stroke }: { cx: number; cy: number; r: number; stroke: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke="rgba(148,163,184,0.26)"
      strokeWidth={stroke}
      strokeDasharray="2 7"
      strokeLinecap="round"
    />
  )
}

// ─── Donut ───────────────────────────────────────────────────────────────────

export interface DonutSlice {
  key: string
  label: string
  color: string
  count: number
  share: number
}

interface DonutChartProps {
  slices: DonutSlice[]
  total: number
  centerCaption: string
  ariaLabel: string
  emptyMessage: string
  size?: number
  stroke?: number
}

/**
 * Donut with sequential segment draw-in, hover/tap highlight, center count-up
 * and a legend that is linked to the segments (hovering either one highlights
 * the other).
 */
export function DonutChart({
  slices,
  total,
  centerCaption,
  ariaLabel,
  emptyMessage,
  size = 124,
  stroke = 12,
}: DonutChartProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(boxRef)
  const introDone = useIntroDone(inView)
  const [active, setActive] = useState<number | null>(null)

  const hasData = total > 0
  const live = inView && hasData

  const drawn = useTweenValues(
    slices.map((s) => (live ? s.share : 0)),
    { duration: 900, stagger: introDone ? 0 : 100 }
  )
  const [centerTotal] = useTweenValues([live ? total : 0], { duration: 900 })

  const cx = size / 2
  const r = (size - stroke) / 2
  const C = TAU * r
  const populated = slices.filter((s) => s.count > 0).length
  const gap = live && populated > 1 ? 3 : 0

  let cursor = 0
  const segments = slices.map((s, i) => {
    const frac = drawn[i] ?? 0
    const len = frac > 0.001 ? Math.max(0, frac * C - gap) : 0
    const start = cursor * C
    cursor += frac
    return { ...s, index: i, len, start }
  })

  const focused = active !== null ? slices[active] : null

  return (
    <div className="flex flex-col items-center">
      <div
        ref={boxRef}
        role="img"
        aria-label={ariaLabel}
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          className="block overflow-visible"
        >
          <g transform={`rotate(-90 ${cx} ${cx})`}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={stroke} />
            {!hasData && <GhostTrack cx={cx} cy={cx} r={r} stroke={stroke} />}
            {hasData &&
              segments.map((seg) => {
                const isActive = active === seg.index
                return (
                  <circle
                    key={seg.key}
                    cx={cx}
                    cy={cx}
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isActive ? stroke + 3 : stroke}
                    strokeDasharray={`${seg.len} ${C}`}
                    strokeDashoffset={-seg.start}
                    className="insight-seg cursor-pointer"
                    style={{
                      opacity: active === null || isActive ? 1 : 0.28,
                      filter: isActive ? `drop-shadow(0 0 6px ${seg.color})` : undefined,
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") setActive(seg.index)
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") setActive(null)
                    }}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "mouse") setActive((p) => (p === seg.index ? null : seg.index))
                    }}
                  />
                )
              })}
          </g>
        </svg>

        {/* Center label: total (count-up) or the focused slice */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {focused ? (
            <>
              <span
                className="admin-num text-[20px] font-bold leading-none"
                style={{ color: focused.color }}
              >
                <Bidi>{`${Math.round(focused.share * 100)}%`}</Bidi>
              </span>
              <span className="mt-1 max-w-full truncate text-[10.5px] font-medium text-[var(--admin-text-2)]">
                {focused.label}
              </span>
            </>
          ) : (
            <>
              <span className="admin-num text-[22px] font-bold leading-none text-[var(--admin-text)]">
                <Bidi>{Math.round(centerTotal).toLocaleString("en-US")}</Bidi>
              </span>
              <span className="mt-1 text-[10.5px] font-medium text-[var(--admin-text-2)]">{centerCaption}</span>
            </>
          )}
        </div>
      </div>

      {/* Linked legend — 44px rows keep touch targets comfortable */}
      <div className="mt-3 flex w-full items-start">
        {hasData ? (
          <ul className="grid w-full grid-cols-1 gap-y-0.5">
            {slices.map((s, i) => {
              const pct = Math.round(s.share * 100)
              const isActive = active === i
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") setActive(i)
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") setActive(null)
                    }}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "mouse") setActive((p) => (p === i ? null : i))
                    }}
                    className={`insight-legend flex min-h-[44px] w-full items-center gap-2 rounded-[10px] px-2 py-1 text-start transition-colors duration-200 ${
                      isActive ? "bg-[rgba(148,163,184,0.1)]" : "hover:bg-[rgba(148,163,184,0.06)]"
                    } ${active !== null && !isActive ? "opacity-60" : ""}`}
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: s.color, boxShadow: `0 0 8px ${s.color}66` }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold leading-snug text-[var(--admin-text)]">
                        {s.label}
                      </span>
                      <span className="admin-num block text-[11px] leading-snug text-[var(--admin-text-2)]">
                        <Bidi>{`${s.count.toLocaleString("en-US")} · ${pct}%`}</Bidi>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="flex w-full items-center justify-center text-center text-[12.5px] leading-relaxed text-[var(--admin-text-2)]">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Ring gauge ──────────────────────────────────────────────────────────────

interface RingGaugeProps {
  /** 0..1 */
  ratio: number
  empty: boolean
  ariaLabel: string
  caption: string
  emptyMessage: string
  size?: number
  stroke?: number
  from?: string
  to?: string
}

/**
 * Radial progress with a glowing leading tip. The tip gently pulses (CSS, off
 * under reduced-motion) and the percentage counts up with the arc.
 */
export function RingGauge({
  ratio,
  empty,
  ariaLabel,
  caption,
  emptyMessage,
  size = 124,
  stroke = 11,
  from = "#34d399",
  to = "#22d3ee",
}: RingGaugeProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(boxRef)
  const gradientId = useSvgId("ring-grad")
  const live = inView && !empty

  const [progress] = useTweenValues([live ? clamp01(ratio) : 0], { duration: 1100 })
  const [pct] = useTweenValues([live ? clamp01(ratio) * 100 : 0], { duration: 1100 })

  const cx = size / 2
  const r = (size - stroke - 6) / 2
  const C = TAU * r
  const len = progress * C
  const angle = progress * TAU - Math.PI / 2
  const tipX = cx + r * Math.cos(angle)
  const tipY = cx + r * Math.sin(angle)

  return (
    <div className="flex flex-col items-center">
      <div
        ref={boxRef}
        role="img"
        aria-label={ariaLabel}
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="block overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={from} />
              <stop offset="1" stopColor={to} />
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={stroke} />
          {empty ? (
            <GhostTrack cx={cx} cy={cx} r={r} stroke={stroke} />
          ) : (
            <g transform={`rotate(-90 ${cx} ${cx})`}>
              <circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${len} ${C}`}
                opacity={progress > 0.004 ? 1 : 0}
              />
            </g>
          )}
          {live && progress > 0.01 && (
            <g>
              <circle cx={tipX} cy={tipY} r={stroke * 0.85} fill={to} className="insight-pulse" />
              <circle cx={tipX} cy={tipY} r={stroke / 2 - 1} fill="#f8fafc" stroke={to} strokeWidth={1.5} />
            </g>
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="admin-num text-[24px] font-bold leading-none text-[var(--admin-text)]">
            <Bidi>{`${Math.round(empty ? 0 : pct)}%`}</Bidi>
          </span>
          <span className="mt-1 text-[10.5px] font-medium text-[var(--admin-text-2)]">{caption}</span>
        </div>
      </div>
      {empty && (
        <p className="mt-3 min-h-[88px] w-full text-center text-[12.5px] leading-relaxed text-[var(--admin-text-2)]">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}

// ─── Area / line chart ───────────────────────────────────────────────────────

/** Catmull-Rom → cubic Bézier: a smooth curve through every point. */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return ""
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d
}

interface AreaChartProps {
  values: number[]
  /** Time flows right-to-left in Arabic: the oldest bucket sits on the right. */
  isRTL: boolean
  ariaLabel: string
  empty: boolean
  emptyMessage: string
  startLabel: string
  endLabel: string
  renderTip: (index: number) => ReactNode
  color?: string
}

/**
 * Smooth area chart with a gradient fill. The stroke draws in, then the fill
 * fades up; the newest point pulses softly; hovering or tapping shows a
 * tooltip. Geometry is measured in pixels, so strokes stay crisp at any width.
 */
export function AreaChart({
  values,
  isRTL,
  ariaLabel,
  empty,
  emptyMessage,
  startLabel,
  endLabel,
  renderTip,
  color = "#34d399",
}: AreaChartProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(boxRef)
  const { width: W, height: H } = useElementSize(boxRef)
  const gradientId = useSvgId("area-grad")
  const [hover, setHover] = useState<number | null>(null)

  const n = values.length
  const live = inView && !empty && n > 1

  // Values tween on data change; the draw-in below is gated by visibility.
  const shown = useTweenValues(empty ? values.map(() => 0) : values, { duration: 900 })
  const [draw] = useTweenValues([live ? 1 : 0], { duration: 1200 })

  const padL = 6
  const padR = 6
  const padT = 14
  const padB = 4
  const innerW = Math.max(0, W - padL - padR)
  const innerH = Math.max(0, H - padT - padB)
  const baseY = padT + innerH
  const yMax = Math.max(...values, 0) * 1.15 || 1

  const xAt = (i: number) => {
    const f = n > 1 ? i / (n - 1) : 0.5
    return isRTL ? padL + (1 - f) * innerW : padL + f * innerW
  }
  const yAt = (v: number) => padT + innerH * (1 - Math.min(1, Math.max(0, v / yMax)))

  const points: Array<[number, number]> = shown.map((v, i) => [xAt(i), yAt(v)])
  const linePath = smoothPath(points)
  const first = points[0]
  const last = points[points.length - 1]
  const areaPath = points.length > 1
    ? `${linePath} L${last[0].toFixed(2)},${baseY.toFixed(2)} L${first[0].toFixed(2)},${baseY.toFixed(2)} Z`
    : ""

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!live) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(xAt(i) - px)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    setHover(best)
  }

  const hoverPoint = hover !== null && live ? points[hover] : null
  const tipLeft = hoverPoint ? Math.min(Math.max(hoverPoint[0], 64), Math.max(64, W - 64)) : 0
  const tipAbove = hoverPoint ? hoverPoint[1] > 56 : true

  // Ghost curve for the empty state (decorative, static).
  const ghostPath = smoothPath(
    Array.from({ length: 6 }, (_, i) => [
      (i / 5) * 100,
      34 + Math.sin(i * 1.3) * 10 + (i === 5 ? -8 : 0),
    ] as [number, number])
  )

  return (
    <div className="flex h-full flex-col">
      <div
        ref={boxRef}
        role="img"
        aria-label={ariaLabel}
        className="relative min-h-[120px] w-full flex-1 select-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHover(null)
        }}
      >
        {empty ? (
          <>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute inset-0 block overflow-visible"
            >
              <path
                d={ghostPath}
                fill="none"
                stroke="rgba(148,163,184,0.3)"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-[12.5px] leading-relaxed text-[var(--admin-text-2)]">{emptyMessage}</p>
            </div>
          </>
        ) : (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="absolute inset-0 block overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.36" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Subtle grid */}
            {[0.33, 0.66].map((k) => (
              <line
                key={k}
                x1={padL}
                x2={W - padR}
                y1={padT + innerH * k}
                y2={padT + innerH * k}
                stroke="rgba(148,163,184,0.1)"
                strokeDasharray="3 5"
              />
            ))}
            <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke="rgba(148,163,184,0.2)" />

            {/* Fill fades in once the stroke has drawn */}
            {areaPath && (
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                style={{ opacity: Math.min(1, Math.max(0, (draw - 0.45) / 0.55)) }}
              />
            )}

            {/* Stroke draws in left→right (pathLength normalises the dash) */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - draw}
              />
            )}

            {hoverPoint && (
              <g>
                <line
                  x1={hoverPoint[0]}
                  x2={hoverPoint[0]}
                  y1={padT}
                  y2={baseY}
                  stroke="rgba(148,163,184,0.4)"
                  strokeDasharray="3 4"
                />
                <circle cx={hoverPoint[0]} cy={hoverPoint[1]} r={4.5} fill="#0b111e" stroke={color} strokeWidth={2} />
              </g>
            )}

            {/* Leading (newest) point: soft pulse, appears after the draw */}
            {last && (
              <g style={{ opacity: Math.min(1, Math.max(0, (draw - 0.85) / 0.15)) }}>
                <circle cx={last[0]} cy={last[1]} r={7} fill={color} className="insight-pulse" />
                <circle cx={last[0]} cy={last[1]} r={3.5} fill="#f0fdf4" stroke={color} strokeWidth={2} />
              </g>
            )}
          </svg>
        )}

        {hoverPoint && (
          <div
            key={hover}
            className="insight-tip pointer-events-none absolute z-10 min-w-[128px] rounded-[10px] border border-[var(--admin-border-strong)] bg-[rgba(8,13,24,0.94)] px-2.5 py-1.5 text-[11.5px] text-[var(--admin-text)] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md"
            style={{
              left: tipLeft,
              top: tipAbove ? hoverPoint[1] - 12 : hoverPoint[1] + 12,
              transform: `translate(-50%, ${tipAbove ? "-100%" : "0"})`,
            }}
          >
            {renderTip(hover!)}
          </div>
        )}
      </div>

      {/* Time axis: DOM order is oldest → newest; flexbox mirrors it in RTL. */}
      <div className="admin-num mt-2 flex justify-between gap-2 text-[11px] font-medium text-[var(--admin-text-2)]">
        <span className="truncate">{startLabel}</span>
        <span className="truncate">{endLabel}</span>
      </div>
    </div>
  )
}

// ─── Compact ranking table ───────────────────────────────────────────────────

export interface RankRow {
  key: string
  name: ReactNode
  sub?: ReactNode
  count: ReactNode
  amount: ReactNode
  /** 0..1, drives the inline bar (grows from the baseline on entrance). */
  share: number
}

interface RankTableProps {
  rows: RankRow[]
  headers: { name: string; count: string; amount: string }
  caption: string
}

/** Up to five rows: label, count, total, and a tiny inline share bar. */
export function RankTable({ rows, headers, caption }: RankTableProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(boxRef)
  const introDone = useIntroDone(inView)
  const bars = useTweenValues(
    rows.map((r) => (inView ? r.share : 0)),
    { duration: 800, stagger: introDone ? 0 : 90 }
  )

  return (
    <div ref={boxRef} className="w-full">
      <table className="w-full table-fixed text-[12.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-auto pb-2 text-start text-[10.5px] font-semibold tracking-[0.04em] text-[var(--admin-text-2)]">
              {headers.name}
            </th>
            <th scope="col" className="w-[44px] pb-2 text-end text-[10.5px] font-semibold tracking-[0.04em] text-[var(--admin-text-2)]">
              {headers.count}
            </th>
            <th scope="col" className="w-[92px] pb-2 text-end text-[10.5px] font-semibold tracking-[0.04em] text-[var(--admin-text-2)]">
              {headers.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key} className="border-t border-[rgba(148,163,184,0.1)]">
              <td className="py-2.5 pe-2 align-middle">
                <div className="truncate text-[13px] font-semibold leading-snug text-[var(--admin-text)]">{row.name}</div>
                {row.sub && (
                  <div className="admin-num truncate text-[11px] leading-snug text-[var(--admin-text-2)]">{row.sub}</div>
                )}
                <div
                  className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(148,163,184,0.12)]"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(1, bars[i] ?? 0)) * 100}%`,
                      background: "linear-gradient(90deg, #34d399, #22d3ee)",
                    }}
                  />
                </div>
              </td>
              <td className="admin-num py-2.5 text-end align-middle font-semibold text-[var(--admin-text)]">{row.count}</td>
              <td className="admin-num py-2.5 text-end align-middle font-bold text-[#6ee7b7]">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
