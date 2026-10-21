"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

// Layout effect in the browser so a tween starts before the first paint;
// plain effect during SSR to avoid React's warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

interface TweenOptions {
  /** Duration of each value's tween in ms. */
  duration?: number
  /** Delay between consecutive values in ms (used for sequential draw-ins). */
  stagger?: number
}

/**
 * Smoothly tweens an array of numbers toward `targets` with ease-out cubic.
 *
 * - Starts from the value currently on screen, so when data changes the
 *   numbers glide to their new values instead of jumping.
 * - Honors prefers-reduced-motion by snapping straight to the target.
 * - Pure presentation: it never changes the targets it receives.
 */
export function useTweenValues(targets: readonly number[], options: TweenOptions = {}): number[] {
  const { duration = 900, stagger = 0 } = options
  const reduced = useReducedMotion()

  const [display, setDisplay] = useState<number[]>(() => targets.map(() => 0))
  const displayRef = useRef<number[]>(display)

  const to = targets.map((v) => (Number.isFinite(v) ? v : 0))
  const key = to.map((v) => v.toFixed(5)).join("|")

  useIsoLayoutEffect(() => {
    const from =
      displayRef.current.length === to.length ? displayRef.current : to.map(() => 0)

    const settle = () => {
      displayRef.current = to
      setDisplay(to)
    }

    if (reduced || to.every((v, i) => v === from[i])) {
      settle()
      return
    }

    const totalMs = duration + stagger * Math.max(0, to.length - 1)
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const next = to.map((target, i) => {
        const local = Math.min(1, Math.max(0, (elapsed - i * stagger) / duration))
        return from[i] + (target - from[i]) * easeOutCubic(local)
      })
      displayRef.current = next
      setDisplay(next)
      if (elapsed < totalMs) raf = requestAnimationFrame(tick)
      else settle()
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // `key` encodes the target values; `to` is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced, duration, stagger])

  return display
}

/**
 * Returns true a moment after `inView` becomes true. Used to play a staggered
 * intro only once; later data updates then move together without delays.
 */
export function useIntroDone(inView: boolean, afterMs = 1500): boolean {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!inView) return
    const timer = window.setTimeout(() => setDone(true), afterMs)
    return () => window.clearTimeout(timer)
  }, [inView, afterMs])
  return done
}
