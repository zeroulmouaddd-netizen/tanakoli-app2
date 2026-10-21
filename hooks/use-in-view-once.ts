"use client"

import { useEffect, useState, type RefObject } from "react"

/**
 * Returns true once the referenced element has scrolled into view and stays
 * true afterwards (the observer is disconnected after the first hit, so
 * entrance animations run once). Without IntersectionObserver support the
 * element is treated as visible immediately.
 */
export function useInViewOnce(ref: RefObject<Element | null>, threshold = 0.2): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, inView, threshold])

  return inView
}
