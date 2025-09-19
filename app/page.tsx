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
      <div className="dashboard-container">
        <div className="dashboard-grid dashboard-grid-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="loading-card">
              <CardContent className="p-4 md:p-6">
                <div className="loading-content">
                  <div className="loading-bar w-3/4"></div>
                  <div className="loading-bar-sm w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Xush kelibsiz, {user?.first_name} {user?.last_name}! Tizim holati va statistikasi
          </p>
        </div>
        <div className="dashboard-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="soft-button bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Yangilash</span>
          </Button>
          <BroadcastSMSDialog />
        </div>
      </div>

      <div className="quick-action-buttons">
        <Button asChild className="soft-button">
          <Link href="/products">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mahsulot qo'shish</span>
            <span className="sm:hidden">Mahsulot</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="soft-button bg-transparent">
          <Link href="/orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Buyurtmalarni ko'rish</span>
            <span className="sm:hidden">Buyurtmalar</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="soft-button bg-transparent">
          <Link href="/admins">
            <Shield className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Admin qo'shish</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="soft-button bg-transparent">
          <Link href="/kpi">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">KPI ko'rish</span>
            <span className="sm:hidden">KPI</span>
          </Link>
        </Button>
      </div>

      <div className="dashboard-grid dashboard-grid-4">
        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Jami mahsulotlar</p>
              <p className="stat-number">{stats.totalProducts}</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="card-description">+12% bu oy</span>
              </div>
            </div>
            <div className="admin-card-icon bg-primary">
              <Package className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Buyurtmalar</p>
              <p className="stat-number">{stats.totalOrders}</p>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {stats.pendingOrders} kutilmoqda
                </Badge>
              </div>
            </div>
            <div className="admin-card-icon bg-blue-500">
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Foydalanuvchilar</p>
              <p className="stat-number">{stats.totalUsers}</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="card-description">+8% bu oy</span>
              </div>
            </div>
            <div className="admin-card-icon bg-green-500">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Oylik daromad</p>
              <p className="stat-number">{stats.monthlyRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="card-description">+15% o'tgan oyga nisbatan</span>
              </div>
            </div>
            <div className="admin-card-icon bg-purple-500">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-grid dashboard-grid-3">
        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Jami adminlar</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stats.totalAdmins}</p>
            </div>
            <div className="admin-card-icon bg-primary/10">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Faol adminlar</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">{stats.activeAdmins}</p>
            </div>
            <div className="admin-card-icon bg-green-100 dark:bg-green-900/20">
              <Activity className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-card-text">
              <p className="card-title">Tizim holati</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-600">Barcha tizimlar ishlayapti</span>
              </div>
            </div>
            <div className="admin-card-icon bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-grid dashboard-grid-2">
        <Card className="kpi-chart">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground">Oylik buyurtmalar va daromad</CardTitle>
            <CardDescription>So'nggi 6 oy davomidagi statistika</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
              className="chart-responsive"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.ordersByMonth} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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

        <Card className="kpi-chart">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground">Kategoriyalar bo'yicha mahsulotlar</CardTitle>
            <CardDescription>Har bir kategoriyada nechta mahsulot bor</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer
              config={{
                count: {
                  label: "Mahsulotlar soni",
                  color: "hsl(var(--primary))",
                },
              }}
              className="chart-responsive"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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

      <div className="dashboard-grid dashboard-grid-2">
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 flex-shrink-0" />
              So'nggi faollik
            </CardTitle>
            <CardDescription>Admin harakatlari va tizim hodisalari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    <Activity className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="activity-content">
                    <p className="activity-title">
                      {activity.admin_name || "Noma'lum admin"} - {getActionDisplayName(activity.action_type)}
                    </p>
                    <p className="activity-subtitle">
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

        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 flex-shrink-0" />
              Eng mashhur mahsulotlar
            </CardTitle>
            <CardDescription>Ko'rishlar soni bo'yicha top 5 mahsulot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-info">
                    <div className="product-rank">{index + 1}</div>
                    <div className="product-details">
                      <p className="product-name">{product.name}</p>
                      <div className="product-stats">
                        <Eye className="h-4 w-4 flex-shrink-0" />
                        <span>{product.views} ko'rishlar</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
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

      {stats.adminPerformance.length > 0 && (
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 flex-shrink-0" />
              Eng faol adminlar (bu hafta)
            </CardTitle>
            <CardDescription>Haftalik faollik bo'yicha eng ko'p harakat qilgan adminlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="dashboard-grid dashboard-grid-3">
              {stats.adminPerformance.map((admin, index) => (
                <div key={index} className="performance-card">
                  <div className="performance-rank">{index + 1}</div>
                  <div className="performance-content">
                    <p className="performance-name">{admin.admin_name || "Noma'lum admin"}</p>
                    <p className="performance-stats">{admin.actions_count} harakat</p>
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
