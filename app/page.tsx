"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  Package,
  TrendingUp,
  Users,
  ShoppingCart,
  Eye,
  Star,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface DashboardStats {
  totalProducts: number
  totalCategories: number
  totalOrders: number
  totalUsers: number
  totalWorkers: number
  todayOrders: number
  completedOrders: number
  pendingOrders: number
  productsByCategory: Array<{ name: string; count: number }>
  ordersByMonth: Array<{ month: string; orders: number; revenue: number }>
  topProducts: Array<{ name: string; views: number; rating: number }>
}

const COLORS = ["#000000", "#404040", "#808080", "#A0A0A0", "#C0C0C0"]

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalWorkers: 0,
    todayOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    productsByCategory: [],
    ordersByMonth: [],
    topProducts: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch basic counts
      const [productsRes, categoriesRes, ordersRes, usersRes, workersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("categories").select("id", { count: "exact" }),
        supabase.from("orders").select("id", { count: "exact" }),
        supabase.from("users").select("id", { count: "exact" }),
        supabase.from("workers").select("id", { count: "exact" }),
      ])

      // Fetch today's orders
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: todayOrdersData } = await supabase
        .from("orders")
        .select("id, status")
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString())

      // Fetch completed and pending orders
      const { data: completedOrdersData } = await supabase.from("orders").select("id").eq("status", "delivered")

      const { data: pendingOrdersData } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["pending", "confirmed", "processing"])

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
        .select("created_at, total_amount")
        .gte("created_at", sixMonthsAgo.toISOString())

      const ordersByMonth = orderData?.reduce((acc: any, order: any) => {
        const month = new Date(order.created_at).toLocaleDateString("uz-UZ", { month: "short" })
        if (!acc[month]) {
          acc[month] = { orders: 0, revenue: 0 }
        }
        acc[month].orders += 1
        acc[month].revenue += Number.parseFloat(order.total_amount)
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

      setStats({
        totalProducts: productsRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalWorkers: workersRes.count || 0,
        todayOrders: todayOrdersData?.length || 0,
        completedOrders: completedOrdersData?.length || 0,
        pendingOrders: pendingOrdersData?.length || 0,
        productsByCategory,
        ordersByMonth: monthlyStats,
        topProducts,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="ios-card animate-pulse">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bosh sahifa</h1>
          <p className="text-muted-foreground">JamolStroy admin panel statistikasi</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami mahsulotlar</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kategoriyalar</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalCategories}</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Buyurtmalar</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami ishchilar</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalWorkers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bugungi buyurtmalar</p>
                <p className="text-2xl font-bold text-foreground">{stats.todayOrders}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bajarilgan</p>
                <p className="text-2xl font-bold text-foreground">{stats.completedOrders}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card ios-button hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bajarilmagan</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingOrders}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Category */}
        <Card className="ios-card">
          <CardHeader>
            <CardTitle className="text-foreground">Kategoriyalar bo'yicha mahsulotlar</CardTitle>
            <CardDescription>Har bir kategoriyada nechta mahsulot bor</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Mahsulotlar soni",
                  color: "#000000",
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

        {/* Orders by Month */}
        <Card className="ios-card">
          <CardHeader>
            <CardTitle className="text-foreground">Oylik buyurtmalar</CardTitle>
            <CardDescription>So'nggi 6 oy davomidagi buyurtmalar</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                orders: {
                  label: "Buyurtmalar",
                  color: "#000000",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ordersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle className="text-foreground">Eng ko'p ko'rilgan mahsulotlar</CardTitle>
          <CardDescription>Ko'rishlar soni bo'yicha top 5 mahsulot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-accent rounded-xl">
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
  )
}
