"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { kpiLogger } from "@/lib/kpi-logger"
import { usePathname } from "next/navigation"

export function useKPITracker() {
  const { user } = useAuth()
  const pathname = usePathname()

  // Track page views
  useEffect(() => {
    if (user && pathname) {
      kpiLogger.logPageView(pathname)
    }
  }, [user, pathname])

  // Track login
  useEffect(() => {
    if (user) {
      kpiLogger.logLogin()
    }
  }, [user])

  return kpiLogger
}
