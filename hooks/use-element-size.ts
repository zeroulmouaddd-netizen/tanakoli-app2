"use client"

import { useEffect, useState, type RefObject } from "react"

export interface ElementSize {
  width: number
  height: number
}

/**
 * Tracks an element's content box with ResizeObserver so inline SVG charts can
 * render at their exact pixel size (crisp strokes on high-DPI screens, no
 * stretched geometry). Starts at 0x0 until the first measurement.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const measure = () => {
      const width = Math.floor(node.clientWidth)
      const height = Math.floor(node.clientHeight)
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }

    measure()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return size
}
