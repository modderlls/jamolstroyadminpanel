"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Eye,
  Edit,
  Package,
  User,
  MapPin,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  PhoneCall,
  Truck,
  CreditCard,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { OrderViewDialog } from "@/components/orders/order-view-dialog"
import { PaymentConfirmDialog } from "@/components/orders/payment-confirm-dialog"
import { useRouter } from "next/navigation"

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  status: string
  subtotal: number
  delivery_fee: number
  total_amount: number
  created_at: string
  updated_at: string
  is_agree: boolean
  is_claimed: boolean
  is_payed: boolean
  is_borrowed: boolean
  borrowed_period: number
  borrowed_additional_period: number
  borrowed_updated_at: string
  customers: {
    first_name: string
    last_name: string
    phone_number: string
  }
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    total_price: number
    products: {
      name_uz: string
      images: string[]
    }
  }>
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusLabels = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  processing: "Jarayonda",
  shipped: "Yuborilgan",
  delivered: "Yetkazilgan",
  cancelled: "Bekor qilingan",
}

const ITEMS_PER_PAGE = 50

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("list")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  // Dialog states
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  const router = useRouter()

  useEffect(() => {
    fetchOrders()
  }, [currentPage, searchQuery, statusFilter, paymentFilter, dateFilter])

  const fetchOrders = async () => {
    try {
      let query = supabase.from("orders").select(
        `
          *,
          customers:customer_id(first_name, last_name, phone_number),
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            products(name_uz, images)
          )
        `,
        { count: "exact" },
      )

      // Apply filters
      if (searchQuery) {
        query = query.or(
          `order_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`,
        )
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter)
      }

      if (paymentFilter) {
        if (paymentFilter === "paid") {
          query = query.eq("is_payed", true)
        } else if (paymentFilter === "unpaid") {
          query = query.eq("is_payed", false)
        }
      }

      if (dateFilter) {
        const today = new Date()
        const startDate = new Date()

        if (dateFilter === "today") {
          startDate.setHours(0, 0, 0, 0)
        } else if (dateFilter === "week") {
          startDate.setDate(today.getDate() - 7)
        } else if (dateFilter === "month") {
          startDate.setMonth(today.getMonth() - 1)
        }

        query = query.gte("created_at", startDate.toISOString())
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

      if (error) throw error

      setOrders(data || [])
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          is_agree: true,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error
      await fetchOrders()
    } catch (error) {
      console.error("Error accepting order:", error)
      alert("Buyurtmani qabul qilishda xatolik yuz berdi")
    }
  }

  const handleRejectOrder = async (orderId: string) => {
    if (confirm("Bu buyurtmani rad etishni tasdiqlaysizmi?")) {
      try {
        const { error } = await supabase
          .from("orders")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)

        if (error) throw error
        await fetchOrders()
      } catch (error) {
        console.error("Error rejecting order:", error)
        alert("Buyurtmani rad etishda xatolik yuz berdi")
      }
    }
  }

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
  }

  const handleProductDelivered = (order: Order) => {
    setPaymentOrder(order)
    setIsPaymentDialogOpen(true)
  }

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order)
    setIsViewDialogOpen(true)
  }

  const clearFilters = () => {
    setStatusFilter("")
    setPaymentFilter("")
    setDateFilter("")
    setSearchQuery("")
    setCurrentPage(1)
  }

  // Calculate analytics based on current filtered data
  const getAnalyticsData = () => {
    let analyticsOrders = orders

    // Apply same filters as main list for analytics
    if (statusFilter || paymentFilter || dateFilter || searchQuery) {
      analyticsOrders = orders.filter((order) => {
        let matches = true

        if (statusFilter && order.status !== statusFilter) matches = false
        if (paymentFilter === "paid" && !order.is_payed) matches = false
        if (paymentFilter === "unpaid" && order.is_payed) matches = false
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase()
          matches =
            matches &&
            (order.order_number.toLowerCase().includes(searchLower) ||
              order.customer_name.toLowerCase().includes(searchLower) ||
              order.customer_phone.includes(searchQuery))
        }

        return matches
      })
    }

    // Exclude cancelled orders from total sum calculation
    const validOrders = analyticsOrders.filter((order) => order.status !== "cancelled")

    return {
      totalOrders: analyticsOrders.length,
      pendingOrders: analyticsOrders.filter((o) => o.status === "pending").length,
      deliveredOrders: analyticsOrders.filter((o) => o.status === "delivered").length,
      totalAmount: validOrders.reduce((sum, order) => sum + order.total_amount, 0),
    }
  }

  const analytics = getAnalyticsData()

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Buyurtmalar</h1>
          <p className="text-muted-foreground">Jami {totalCount} ta buyurtma</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="list">Ro'yxat</TabsTrigger>
            <TabsTrigger value="table">Jadval</TabsTrigger>
            <TabsTrigger value="analytics">Tahlil</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="ios-card">
              <CardHeader>
                <CardTitle className="text-lg">Filter va qidiruv</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buyurtma raqami, mijoz..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="pl-10"
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Holat bo'yicha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Kutilmoqda</SelectItem>
                      <SelectItem value="confirmed">Tasdiqlangan</SelectItem>
                      <SelectItem value="processing">Jarayonda</SelectItem>
                      <SelectItem value="shipped">Yuborilgan</SelectItem>
                      <SelectItem value="delivered">Yetkazilgan</SelectItem>
                      <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={paymentFilter}
                    onValueChange={(value) => {
                      setPaymentFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="To'lov holati" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">To'langan</SelectItem>
                      <SelectItem value="unpaid">To'lanmagan</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={dateFilter}
                    onValueChange={(value) => {
                      setDateFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sana bo'yicha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Bugun</SelectItem>
                      <SelectItem value="week">So'nggi hafta</SelectItem>
                      <SelectItem value="month">So'nggi oy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearFilters} className="ios-button bg-transparent">
                    <Filter className="h-4 w-4 mr-2" />
                    Tozalash
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders List */}
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="ios-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">#{order.order_number}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.created_at).toLocaleDateString("uz-UZ", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColors[order.status as keyof typeof statusColors]} border-0`}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                        <div className="flex gap-1">
                          {order.is_payed && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              To'langan
                            </Badge>
                          )}
                          {order.is_agree && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Kelishilgan
                            </Badge>
                          )}
                          {order.is_claimed && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              Qabul qilingan
                            </Badge>
                          )}
                          {order.is_borrowed && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              Qarzdor
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{order.customer_phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span className="line-clamp-2">{order.delivery_address}</span>
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Mahsulotlar:</span>
                          <span className="font-medium">{order.subtotal.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Yetkazib berish:</span>
                          <span className="font-medium">{order.delivery_fee.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold border-t pt-2">
                          <span>Jami:</span>
                          <span>{order.total_amount.toLocaleString()} so'm</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Buyurtma tarkibi:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium line-clamp-1">{item.products.name_uz}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.quantity} x {item.unit_price.toLocaleString()} so'm
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex gap-2">
                        {/* Pending Orders Actions */}
                        {order.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptOrder(order.id)}
                              className="ios-button bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Qabul qilish
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectOrder(order.id)}
                              className="ios-button"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Rad etish
                            </Button>
                          </>
                        )}

                        {/* Processing Orders Actions */}
                        {order.status === "processing" && order.is_agree && (
                          <Button
                            size="sm"
                            onClick={() => handleProductDelivered(order)}
                            className="ios-button bg-blue-600 hover:bg-blue-700"
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Mahsulot berildi
                          </Button>
                        )}

                        {/* Phone Call Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallCustomer(order.customer_phone)}
                          className="ios-button bg-transparent"
                        >
                          <PhoneCall className="h-3 w-3 mr-1" />
                          Qo'ng'iroq
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="ios-button bg-transparent"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ko'rish
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ios-button bg-transparent"
                          onClick={() => {
                            // Navigate to edit page or open edit dialog
                            router.push(`/orders/edit/${order.id}`)
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Tahrirlash
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="ios-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} /{" "}
                      {totalCount}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="ios-button"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-sm font-medium px-3">
                        {currentPage} / {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="ios-button"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {orders.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Buyurtmalar topilmadi</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha buyurtmalar mavjud emas"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet data={orders} onDataChange={setOrders} tableName="orders" onRefresh={fetchOrders} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jami buyurtmalar</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kutilayotgan</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.pendingOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Yetkazilgan</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.deliveredOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jami summa</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalAmount.toLocaleString()} so'm</p>
                    <p className="text-xs text-muted-foreground mt-1">(Bekor qilinganlar hisobga olinmagan)</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OrderViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} order={viewingOrder} />

      <PaymentConfirmDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        order={paymentOrder}
        onSuccess={fetchOrders}
      />
    </div>
  )
}
