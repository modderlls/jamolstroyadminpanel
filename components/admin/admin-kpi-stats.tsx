"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Activity, TrendingUp, Clock, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AdminKPIStatsProps {
  adminId: string
  adminName: string
}

interface KPIData {
  totalActions: number
  todayActions: number
  weekActions: number
  monthActions: number
  actionsByType: Array<{ name: string; count: number }>
  actionsByDay: Array<{ day: string; actions: number }>
  moduleActivity: Array<{ module: string; count: number }>
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function AdminKPIStats({ adminId, adminName }: AdminKPIStatsProps) {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalActions: 0,
    todayActions: 0,
    weekActions: 0,
    monthActions: 0,
    actionsByType: [],
    actionsByDay: [],
    moduleActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKPIData()
  }, [adminId])

  const fetchKPIData = async () => {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Fetch all KPI logs for this admin
      const { data: allLogs, error } = await supabase
        .from("admin_kpi_logs")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const logs = allLogs || []

      // Calculate basic stats
      const totalActions = logs.length
      const todayActions = logs.filter((log) => new Date(log.created_at) >= today).length
      const weekActions = logs.filter((log) => new Date(log.created_at) >= weekAgo).length
      const monthActions = logs.filter((log) => new Date(log.created_at) >= monthAgo).length

      // Group by action type
      const actionTypeMap = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1
        return acc
      }, {})

      const actionsByType = Object.entries(actionTypeMap).map(([name, count]) => ({
        name: getActionDisplayName(name),
        count: count as number,
      }))

      // Group by day (last 7 days)
      const dayMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const dayKey = date.toLocaleDateString("uz-UZ", { weekday: "short" })
        dayMap[dayKey] = 0
      }

      logs.forEach((log) => {
        const logDate = new Date(log.created_at)
        if (logDate >= weekAgo) {
          const dayKey = logDate.toLocaleDateString("uz-UZ", { weekday: "short" })
          if (dayMap.hasOwnProperty(dayKey)) {
            dayMap[dayKey]++
          }
        }
      })

      const actionsByDay = Object.entries(dayMap).map(([day, actions]) => ({
        day,
        actions: actions as number,
      }))

      // Group by module
      const moduleMap = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.module] = (acc[log.module] || 0) + 1
        return acc
      }, {})

      const moduleActivity = Object.entries(moduleMap).map(([module, count]) => ({
        module: getModuleDisplayName(module),
        count: count as number,
      }))

      setKpiData({
        totalActions,
        todayActions,
        weekActions,
        monthActions,
        actionsByType,
        actionsByDay,
        moduleActivity,
      })
    } catch (error) {
      console.error("Error fetching KPI data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionDisplayName = (actionType: string) => {
    const actionNames: Record<string, string> = {
      login: "Kirish",
      product_create: "Mahsulot qo'shish",
      product_update: "Mahsulot yangilash",
      product_delete: "Mahsulot o'chirish",
      order_approve: "Buyurtma tasdiqlash",
      order_update: "Buyurtma yangilash",
      category_create: "Kategoriya qo'shish",
      category_update: "Kategoriya yangilash",
      user_update: "Foydalanuvchi yangilash",
      admin_create: "Admin qo'shish",
      admin_update: "Admin yangilash",
    }
    return actionNames[actionType] || actionType
  }

  const getModuleDisplayName = (module: string) => {
    const moduleNames: Record<string, string> = {
      products: "Mahsulotlar",
      orders: "Buyurtmalar",
      categories: "Kategoriyalar",
      users: "Foydalanuvchilar",
      admins: "Adminlar",
      auth: "Autentifikatsiya",
      settings: "Sozlamalar",
    }
    return moduleNames[module] || module
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="kpi-metric animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jami harakatlar</p>
                <p className="stat-number">{kpiData.totalActions}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bugun</p>
                <p className="stat-number">{kpiData.todayActions}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu hafta</p>
                <p className="stat-number">{kpiData.weekActions}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu oy</p>
                <p className="stat-number">{kpiData.monthActions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle>Kunlik faollik</CardTitle>
            <CardDescription>So'nggi 7 kun davomidagi harakatlar</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                actions: {
                  label: "Harakatlar",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiData.actionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="actions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Actions by Type */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle>Harakat turlari</CardTitle>
            <CardDescription>Eng ko'p bajarilgan harakatlar</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Soni",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpiData.actionsByType.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Module Activity */}
      <Card className="soft-card">
        <CardHeader>
          <CardTitle>Bo'limlar bo'yicha faollik</CardTitle>
          <CardDescription>Har bir bo'limda bajarilgan harakatlar soni</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpiData.moduleActivity.map((item, index) => (
              <div key={item.module} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium">{item.module}</span>
                </div>
                <Badge variant="outline" className="permission-chip">
                  {item.count} harakat
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
