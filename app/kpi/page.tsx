"use client"

import { KPIDashboard } from "@/components/kpi/kpi-dashboard"
import { useKPITracker } from "@/hooks/use-kpi-tracker"

export default function KPIPage() {
  useKPITracker()

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">KPI Tizimi</h1>
          <p className="text-muted-foreground">Admin faoliyati va tizim ishlashi statistikasi</p>
        </div>
      </div>

      <KPIDashboard />
    </div>
  )
}
