"use client"

import { useEffect } from "react"

export function AutoPrint() {
  useEffect(() => {
    const run = () => {
      window.print()
    }

    const timer = window.setTimeout(run, 150)

    const handleAfterPrint = () => {
      if (window.opener) {
        window.close()
      }
    }

    window.addEventListener("afterprint", handleAfterPrint)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("afterprint", handleAfterPrint)
    }
  }, [])

  return null
}