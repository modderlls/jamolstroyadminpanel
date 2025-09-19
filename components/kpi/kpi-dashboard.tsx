"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Activity, TrendingUp, Users, Clock, BarChart3, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

interface KPIDashboardData {
  totalAdmins: number
  activeAdmins: number
  totalActions: number
  todayActions: number
  weekActions: number
  monthActions: number
  topPerformers: Array<{
    admin_id: string
    admin_name: string
    actions_count: number
    last_active: string
  }>
  actionsByDay: Array<{
    date: string
    actions: number
  }>
  actionsByModule: Array<{
    module: string
    count: number
  }>
  actionsByType: Array<{
    action_type: string
    count: number
  }>
  hourlyActivity: Array<{
    hour: number
    actions: number
  }>
}

export function KPIDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<KPIDashboardData>({
    totalAdmins: 0,
    activeAdmins: 0,
    totalActions: 0,
    todayActions: 0,
    weekActions: 0,
    monthActions: 0,
    topPerformers: [],
    actionsByDay: [],
    actionsByModule: [],
    actionsByType: [],
    hourlyActivity: [],
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchKPIData()
  }, [timeRange])

  const fetchKPIData = async () => {
    try {
      setLoading(true)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      let startDate: Date
      switch (timeRange) {
        case "1d":
          startDate = today
          break
        case "7d":
          startDate = weekAgo
          break
        case "30d":
          startDate = monthAgo
          break
        default:
          startDate = weekAgo
      }

      // Fetch admin counts
      const { data: admins } = await supabase.from("users").select("id, is_active, last_login_at").eq("role", "admin")

      const totalAdmins = admins?.length || 0
      const activeAdmins =
        admins?.filter((admin) => admin.is_active && admin.last_login_at && new Date(admin.last_login_at) > weekAgo)
          .length || 0

      // Fetch KPI logs
      const { data: kpiLogs } = await supabase
        .from("admin_kpi_logs")
        .select(`
          *,
          admin:users(first_name, last_name)
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })

      const logs = kpiLogs || []

      // Calculate basic stats
      const totalActions = logs.length
      const todayActions = logs.filter((log) => new Date(log.created_at) >= today).length
      const weekActions = logs.filter((log) => new Date(log.created_at) >= weekAgo).length
      const monthActions = logs.filter((log) => new Date(log.created_at) >= monthAgo).length

      // Top performers
      const adminActionMap = logs.reduce((acc: Record<string, any>, log) => {
        if (!acc[log.admin_id]) {
          acc[log.admin_id] = {
            admin_id: log.admin_id,
            admin_name: `${log.admin?.first_name || ""} ${log.admin?.last_name || ""}`.trim(),
            actions_count: 0,
            last_active: log.created_at,
          }
        }
        acc[log.admin_id].actions_count++
        if (new Date(log.created_at) > new Date(acc[log.admin_id].last_active)) {
          acc[log.admin_id].last_active = log.created_at
        }
        return acc
      }, {})

      const topPerformers = Object.values(adminActionMap)
        .sort((a: any, b: any) => b.actions_count - a.actions_count)
        .slice(0, 5)

      // Actions by day
      const dayMap: Record<string, number> = {}
      const days = timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : 30

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split("T")[0]
        dayMap[dateKey] = 0
      }

      logs.forEach((log) => {
        const dateKey = log.created_at.split("T")[0]
        if (dayMap.hasOwnProperty(dateKey)) {
          dayMap[dateKey]++
        }
      })

      const actionsByDay = Object.entries(dayMap).map(([date, actions]) => ({
        date: new Date(date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
        actions: actions as number,
      }))

      // Actions by module
      const moduleMap = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.module] = (acc[log.module] || 0) + 1
        return acc
      }, {})

      const actionsByModule = Object.entries(moduleMap)
        .map(([module, count]) => ({
          module: getModuleDisplayName(module),
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count)

      // Actions by type
      const typeMap = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1
        return acc
      }, {})

      const actionsByType = Object.entries(typeMap)
        .map(([action_type, count]) => ({
          action_type: getActionDisplayName(action_type),
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Hourly activity
      const hourMap: Record<number, number> = {}
      for (let i = 0; i < 24; i++) {
        hourMap[i] = 0
      }

      logs.forEach((log) => {
        const hour = new Date(log.created_at).getHours()
        hourMap[hour]++
      })

      const hourlyActivity = Object.entries(hourMap).map(([hour, actions]) => ({
        hour: Number.parseInt(hour),
        actions: actions as number,
      }))

      setData({
        totalAdmins,
        activeAdmins,
        totalActions,
        todayActions,
        weekActions,
        monthActions,
        topPerformers: topPerformers as any,
        actionsByDay,
        actionsByModule,
        actionsByType,
        hourlyActivity,
      })
    } catch (error) {
      console.error("Error fetching KPI data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchKPIData()
    setRefreshing(false)
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
      workers: "Ustalar",
      ads: "Reklamalar",
      sms: "SMS",
      navigation: "Navigatsiya",
    }
    return moduleNames[module] || module
  }

  const getActionDisplayName = (actionType: string) => {
    const actionNames: Record<string, string> = {
      login: "Kirish",
      page_view: "Sahifa ko'rish",
      product_create: "Mahsulot qo'shish",
      product_update: "Mahsulot yangilash",
      product_delete: "Mahsulot o'chirish",
      order_approve: "Buyurtma tasdiqlash",
      order_update: "Buyurtma yangilash",
      order_cancel: "Buyurtma bekor qilish",
      category_create: "Kategoriya qo'shish",
      category_update: "Kategoriya yangilash",
      user_update: "Foydalanuvchi yangilash",
      admin_create: "Admin qo'shish",
      admin_update: "Admin yangilash",
      sms_send: "SMS yuborish",
      settings_change: "Sozlamalar o'zgartirish",
    }
    return actionNames[actionType] || actionType
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">KPI Dashboard</h2>
          <p className="text-muted-foreground">Admin faoliyati va tizim statistikasi</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Bugun</SelectItem>
              <SelectItem value="7d">7 kun</SelectItem>
              <SelectItem value="30d">30 kun</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jami adminlar</p>
                <p className="stat-number">{data.totalAdmins}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faol adminlar</p>
                <p className="stat-number">{data.activeAdmins}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jami harakatlar</p>
                <p className="stat-number">{data.totalActions}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-metric">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bugun</p>
                <p className="stat-number">{data.todayActions}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
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
            <CardDescription>Tanlangan davr bo'yicha harakatlar</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                actions: {
                  label: "Harakatlar",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.actionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="actions"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle>Soatlik faollik</CardTitle>
            <CardDescription>24 soat davomidagi faollik</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                actions: {
                  label: "Harakatlar",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="actions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Actions by Module */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle>Bo'limlar bo'yicha faollik</CardTitle>
            <CardDescription>Eng faol bo'limlar</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Soni",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.actionsByModule.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ module, percent }) => `${module} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.actionsByModule.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle>Eng ko'p bajarilgan harakatlar</CardTitle>
            <CardDescription>Harakat turlari bo'yicha statistika</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Soni",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.actionsByType} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="action_type" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Eng faol adminlar
          </CardTitle>
          <CardDescription>Tanlangan davr bo'yicha eng ko'p harakat qilgan adminlar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topPerformers.map((performer, index) => (
              <div key={performer.admin_id} className="flex items-center justify-between p-4 bg-accent/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{performer.admin_name || "Noma'lum admin"}</p>
                    <p className="text-sm text-muted-foreground">
                      Oxirgi faollik: {new Date(performer.last_active).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="permission-chip">
                  <Activity className="h-3 w-3 mr-1" />
                  {performer.actions_count} harakat
                </Badge>
              </div>
            ))}
            {data.topPerformers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Tanlangan davr uchun ma'lumot topilmadi</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
