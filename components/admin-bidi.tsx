"use client"

/**
 * Bidi helpers — presentation only.
 *
 * Numbers, phone numbers and money values are wrapped so they keep their
 * internal order in both directions ("+ 1000.00" never becomes "1000.00 +")
 * and never leak into the surrounding RTL/LTR text. The currency keeps the
 * same placement it has today: after the value in English, and on its
 * natural RTL side in Arabic.
 */

import { cn } from "@/lib/utils"

interface BidiProps {
  children: React.ReactNode
  className?: string
}

/** Isolates a value (phone, ID, coordinates…) without changing its content. */
export function Bidi({ children, className }: BidiProps) {
  return (
    <span dir="ltr" className={cn(className)} style={{ unicodeBidi: "isolate" }}>
      {children}
    </span>
  )
}

interface AmountProps {
  /** Already formatted value, e.g. "1,000.00" or "50,000". */
  value: string | number
  /** Currency suffix — kept as د.ج in both languages, exactly like today. */
  currency?: string
  /** Optional explicit sign ("+" / "-"). */
  sign?: "+" | "-" | string
  /** Space between the sign and the value (on by default). */
  signGap?: boolean
  className?: string
  currencyClassName?: string
}

/**
 * One money/count token: [sign] value [currency].
 *
 * The sign + value pair is isolated as LTR so it can never flip, while the
 * currency stays in the surrounding flow so it lands on the correct side in
 * both Arabic and English (and never overlaps the value).
 */
export function Amount({
  value,
  currency = "د.ج",
  sign,
  signGap = true,
  className,
  currencyClassName,
}: AmountProps) {
  return (
    <span
      className={cn("admin-num whitespace-nowrap", className)}
      style={{ unicodeBidi: "isolate" }}
    >
      <span dir="ltr">
        {sign ? `${sign}${signGap ? " " : ""}` : null}
        {value}
      </span>
      {currency ? " " : null}
      {currency ? <span className={currencyClassName}>{currency}</span> : null}
    </span>
  )
}
