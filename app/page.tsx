"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts"
import {
  Package,
  TrendingUp,
  Users,
  ShoppingCart,
  Eye,
  Star,
  Activity,
  CheckCircle,
  DollarSign,
  Shield,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  Plus,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { BroadcastSMSDialog } from "@/components/sms/broadcast-sms-dialog"
import { useKPITracker } from "@/hooks/use-kpi-tracker"
import Link from "next/link"

interface DashboardStats {
  totalProducts: number
  totalCategories: number
  totalOrders: number
  totalUsers: number
  totalAdmins: number
  activeAdmins: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
  monthlyRevenue: number
  productsByCategory: Array<{ name: string; count: number }>
  ordersByMonth: Array<{ month: string; orders: number; revenue: number }>
  topProducts: Array<{ name: string; views: number; rating: number }>
  recentActivity: Array<{
    id: string
    admin_name: string
    action_type: string
    module: string
    created_at: string
    metadata?: any
  }>
  adminPerformance: Array<{
    admin_name: string
    actions_count: number
    last_active: string
  }>
  systemHealth: {
    uptime: number
    responseTime: number
    errorRate: number
  }
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalAdmins: 0,
    activeAdmins: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    productsByCategory: [],
    ordersByMonth: [],
    topProducts: [],
    recentActivity: [],
    adminPerformance: [],
    systemHealth: {
      uptime: 99.9,
      responseTime: 120,
      errorRate: 0.1,
    },
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useKPITracker()

  useEffect(() => {
    fetchDashboardStats()

    // Set up real-time subscriptions
    const ordersSubscription = supabase
      .channel("dashboard-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchDashboardStats()
      })
      .subscribe()

    const kpiSubscription = supabase
      .channel("dashboard-kpi")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_kpi_logs" }, () => {
        fetchRecentActivity()
      })
      .subscribe()

    return () => {
      ordersSubscription.unsubscribe()
      kpiSubscription.unsubscribe()
    }
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch basic counts
      const [productsRes, categoriesRes, ordersRes, usersRes, adminsRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("categories").select("id", { count: "exact" }),
        supabase.from("orders").select("id", { count: "exact" }),
        supabase.from("users").select("id", { count: "exact" }).neq("role", "admin"),
        supabase.from("users").select("id, is_active, last_login_at", { count: "exact" }).eq("role", "admin"),
      ])

      // Calculate admin stats
      const totalAdmins = adminsRes.count || 0
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const activeAdmins =
        adminsRes.data?.filter(
          (admin) => admin.is_active && admin.last_login_at && new Date(admin.last_login_at) > weekAgo,
        ).length || 0

      // Fetch order stats
      const [pendingOrdersRes, completedOrdersRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact" }).eq("status", "completed"),
      ])

      // Fetch revenue data
      const { data: revenueData } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("status", "completed")

      const totalRevenue = revenueData?.reduce((sum, order) => sum + Number.parseFloat(order.total_amount), 0) || 0

      const currentMonth = new Date()
      currentMonth.setDate(1)
      const monthlyRevenue =
        revenueData
          ?.filter((order) => new Date(order.created_at) >= currentMonth)
          .reduce((sum, order) => sum + Number.parseFloat(order.total_amount), 0) || 0

      // Fetch products by category
      const { data: categoryData } = await supabase.from("products").select(`
          category_id,
          categories!inner(name_uz)
        `)

      const categoryStats = categoryData?.reduce((acc: any, item: any) => {
        const categoryName = item.categories.name_uz
        acc[categoryName] = (acc[categoryName] || 0) + 1
        return acc
      }, {})

      const productsByCategory = Object.entries(categoryStats || {}).map(([name, count]) => ({
        name,
        count: count as number,
      }))

      // Fetch orders by month (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: orderData } = await supabase
        .from("orders")
        .select("created_at, total_amount, status")
        .gte("created_at", sixMonthsAgo.toISOString())

      const ordersByMonth = orderData?.reduce((acc: any, order: any) => {
        const month = new Date(order.created_at).toLocaleDateString("uz-UZ", { month: "short" })
        if (!acc[month]) {
          acc[month] = { orders: 0, revenue: 0 }
        }
        acc[month].orders += 1
        if (order.status === "completed") {
          acc[month].revenue += Number.parseFloat(order.total_amount)
        }
        return acc
      }, {})

      const monthlyStats = Object.entries(ordersByMonth || {}).map(([month, data]: [string, any]) => ({
        month,
        orders: data.orders,
        revenue: data.revenue,
      }))

      // Fetch top products
      const { data: topProductsData } = await supabase
        .from("products")
        .select("name_uz, view_count, average_rating")
        .order("view_count", { ascending: false })
        .limit(5)

      const topProducts =
        topProductsData?.map((product) => ({
          name: product.name_uz,
          views: product.view_count || 0,
          rating: product.average_rating || 0,
        })) || []

      await fetchRecentActivity()
      await fetchAdminPerformance()

      setStats((prev) => ({
        ...prev,
        totalProducts: productsRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalAdmins,
        activeAdmins,
        pendingOrders: pendingOrdersRes.count || 0,
        completedOrders: completedOrdersRes.count || 0,
        totalRevenue,
        monthlyRevenue,
        productsByCategory,
        ordersByMonth: monthlyStats,
        topProducts,
      }))
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const { data: activityData } = await supabase
        .from("admin_kpi_logs")
        .select(`
          id,
          action_type,
          module,
          created_at,
          metadata,
          admin:users(first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      const recentActivity =
        activityData?.map((activity) => ({
          id: activity.id,
          admin_name: `${activity.admin?.first_name || ""} ${activity.admin?.last_name || ""}`.trim(),
          action_type: activity.action_type,
          module: activity.module,
          created_at: activity.created_at,
          metadata: activity.metadata,
        })) || []

      setStats((prev) => ({ ...prev, recentActivity }))
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  const fetchAdminPerformance = async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const { data: performanceData } = await supabase
        .from("admin_kpi_logs")
        .select(`
          admin_id,
          created_at,
          admin:users(first_name, last_name)
        `)
        .gte("created_at", weekAgo.toISOString())

      const adminMap = performanceData?.reduce((acc: any, log) => {
        if (!acc[log.admin_id]) {
          acc[log.admin_id] = {
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

      const adminPerformance = Object.values(adminMap || {})
        .sort((a: any, b: any) => b.actions_count - a.actions_count)
        .slice(0, 5)

      setStats((prev) => ({ ...prev, adminPerformance: adminPerformance as any }))
    } catch (error) {
      console.error("Error fetching admin performance:", error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardStats()
    setRefreshing(false)
  }

  const getActionDisplayName = (actionType: string) => {
    const actionNames: Record<string, string> = {
      login: "Kirish",
      page_view: "Sahifa ko'rish",
      product_create: "Mahsulot qo'shish",
      product_update: "Mahsulot yangilash",
      order_approve: "Buyurtma tasdiqlash",
      category_create: "Kategoriya qo'shish",
      admin_create: "Admin qo'shish",
      sms_send: "SMS yuborish",
    }
    return actionNames[actionType] || actionType
  }

  const getModuleDisplayName = (module: string) => {
    const moduleNames: Record<string, string> = {
      products: "Mahsulotlar",
      orders: "Buyurtmalar",
      categories: "Kategoriyalar",
      admins: "Adminlar",
      auth: "Autentifikatsiya",
      sms: "SMS",
    }
    return moduleNames[module] || module
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="admin-card animate-pulse">
              <CardContent className="p-6">
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
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Xush kelibsiz, {user?.first_name} {user?.last_name}! Tizim holati va statistikasi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="soft-button bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
          <BroadcastSMSDialog />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="soft-button">
          <Link href="/products">
            <Plus className="h-4 w-4 mr-2" />
            Mahsulot qo'shish
          </Link>
        </Button>
        <Button asChild variant="outline" className="soft-button bg-transparent">
          <Link href="/orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buyurtmalarni ko'rish
          </Link>
        </Button>
        <Button asChild variant="outline" className="soft-button bg-transparent">
          <Link href="/admins">
            <Shield className="h-4 w-4 mr-2" />
            Admin qo'shish
          </Link>
        </Button>
        <Button asChild variant="outline" className="soft-button bg-transparent">
          <Link href="/kpi">
            <BarChart3 className="h-4 w-4 mr-2" />
            KPI ko'rish
          </Link>
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami mahsulotlar</p>
                <p className="stat-number">{stats.totalProducts}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+12% bu oy</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Buyurtmalar</p>
                <p className="stat-number">{stats.totalOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {stats.pendingOrders} kutilmoqda
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Foydalanuvchilar</p>
                <p className="stat-number">{stats.totalUsers}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+8% bu oy</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Oylik daromad</p>
                <p className="stat-number">{stats.monthlyRevenue.toLocaleString()} so'm</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+15% o'tgan oyga nisbatan</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami adminlar</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalAdmins}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faol adminlar</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeAdmins}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tizim holati</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Barcha tizimlar ishlayapti</span>
                </div>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Month */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle className="text-foreground">Oylik buyurtmalar va daromad</CardTitle>
            <CardDescription>So'nggi 6 oy davomidagi statistika</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                orders: {
                  label: "Buyurtmalar",
                  color: "hsl(var(--primary))",
                },
                revenue: {
                  label: "Daromad",
                  color: "hsl(var(--secondary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.ordersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="2"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Products by Category */}
        <Card className="kpi-chart">
          <CardHeader>
            <CardTitle className="text-foreground">Kategoriyalar bo'yicha mahsulotlar</CardTitle>
            <CardDescription>Har bir kategoriyada nechta mahsulot bor</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Mahsulotlar soni",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.productsByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.productsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              So'nggi faollik
            </CardTitle>
            <CardDescription>Admin harakatlari va tizim hodisalari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.admin_name || "Noma'lum admin"} - {getActionDisplayName(activity.action_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getModuleDisplayName(activity.module)} • {new Date(activity.created_at).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Hozircha faollik yo'q</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Eng mashhur mahsulotlar
            </CardTitle>
            <CardDescription>Ko'rishlar soni bo'yicha top 5 mahsulot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-accent/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{product.views} ko'rishlar</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Performance */}
      {stats.adminPerformance.length > 0 && (
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Eng faol adminlar (bu hafta)
            </CardTitle>
            <CardDescription>Haftalik faollik bo'yicha eng ko'p harakat qilgan adminlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.adminPerformance.map((admin, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-accent/30 rounded-xl">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{admin.admin_name || "Noma'lum admin"}</p>
                    <p className="text-sm text-muted-foreground">{admin.actions_count} harakat</p>
                  </div>
                  <Badge variant="outline" className="permission-chip">
                    <Activity className="h-3 w-3 mr-1" />
                    Faol
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
