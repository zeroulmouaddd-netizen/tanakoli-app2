"use client"

import { useEffect } from "react"

export function TouchInit() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.ontouchstart = function () {}
    }
  }, [])
  return null
}
