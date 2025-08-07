"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Package, Search, Filter, Clock, CheckCircle, Loader2, RotateCcw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  rental_start_date?: string
  rental_end_date?: string
  rental_duration?: number
  rental_time_unit?: "hour" | "day" | "week" | "month"
  is_returned: boolean
  returned_at?: string
  created_at: string
  updated_at: string
  // Relations
  orders: {
    id: string
    customer_name: string
    customer_phone: string
    status: string
    created_at: string
  }
  products: {
    id: string
    name_uz: string
    name_ru?: string
    name_en?: string
    category_id: string
    rental_type?: "hourly" | "daily" | "weekly" | "monthly"
    rental_duration?: number
    rental_time_unit?: "hour" | "day" | "week" | "month"
  }
}

export default function RentalsPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null)
  const [returnPassword, setReturnPassword] = useState("")
  const [returnError, setReturnError] = useState("")
  const [returnLoading, setReturnLoading] = useState(false)

  useEffect(() => {
    fetchOrderItems()
  }, [])

  const fetchOrderItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          orders (
            id,
            customer_name,
            customer_phone,
            status,
            created_at
          ),
          products (
            id,
            name_uz,
            name_ru,
            name_en,
            category_id,
            rental_type,
            rental_duration,
            rental_time_unit
          )
        `)
        .not("rental_start_date", "is", null)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrderItems(data || [])
    } catch (error) {
      console.error("Error fetching order items:", error)
      toast.error("Arenda ma'lumotlarini yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleReturnItem = async () => {
    if (!selectedItem) return

    if (!returnPassword) {
      setReturnError("MD parolni kiriting")
      return
    }

    setReturnLoading(true)
    setReturnError("")

    try {
      // Verify MD password
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: returnPassword }),
      })

      const data = await response.json()

      if (!data.valid) {
        setReturnError(data.error || "Noto'g'ri parol")
        return
      }

      // Update order item as returned
      const { error } = await supabase
        .from("order_items")
        .update({
          is_returned: true,
          returned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedItem.id)

      if (error) throw error

      toast.success("Mahsulot qaytarildi")
      await fetchOrderItems()
      setShowReturnDialog(false)
      setSelectedItem(null)
      setReturnPassword("")
    } catch (error) {
      console.error("Error returning item:", error)
      setReturnError("Mahsulotni qaytarishda xatolik yuz berdi")
    } finally {
      setReturnLoading(false)
    }
  }

  const filteredItems = orderItems.filter((item) => {
    const matchesSearch =
      item.products.name_uz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orders.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orders.customer_phone.includes(searchQuery)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !item.is_returned) ||
      (statusFilter === "returned" && item.is_returned)

    const matchesDate =
      dateFilter === "all" ||
      (() => {
        const itemDate = new Date(item.rental_start_date!)
        const today = new Date()
        const daysDiff = Math.floor((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (dateFilter) {
          case "today":
            return daysDiff === 0
          case "week":
            return daysDiff <= 7
          case "month":
            return daysDiff <= 30
          default:
            return true
        }
      })()

    return matchesSearch && matchesStatus && matchesDate
  })

  const activeRentals = orderItems.filter((item) => !item.is_returned).length
  const returnedRentals = orderItems.filter((item) => item.is_returned).length
  const totalRentals = orderItems.length

  const formatTimeUnit = (unit?: string) => {
    switch (unit) {
      case "hour":
        return "soat"
      case "day":
        return "kun"
      case "week":
        return "hafta"
      case "month":
        return "oy"
      default:
        return "kun"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = (item: OrderItem) => {
    if (item.is_returned || !item.rental_end_date) return false
    return new Date(item.rental_end_date) < new Date()
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
            <p className="text-muted-foreground">Arenda ma'lumotlari yuklanmoqda...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Arenda</h1>
          <p className="text-muted-foreground">Mahsulotlar arendasi boshqaruvi</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami arenda</p>
                <p className="text-2xl font-bold text-foreground">{totalRentals}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Joriy arenda</p>
                <p className="text-2xl font-bold text-blue-600">{activeRentals}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qaytarilgan</p>
                <p className="text-2xl font-bold text-green-600">{returnedRentals}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filtrlangan</p>
                <p className="text-2xl font-bold text-purple-600">{filteredItems.length}</p>
              </div>
              <Filter className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mahsulot yoki mijoz bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Holat bo'yicha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            <SelectItem value="active">Joriy arenda</SelectItem>
            <SelectItem value="returned">Qaytarilgan</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sana bo'yicha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha sanalar</SelectItem>
            <SelectItem value="today">Bugun</SelectItem>
            <SelectItem value="week">So'nggi hafta</SelectItem>
            <SelectItem value="month">So'nggi oy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid w-full grid-cols- max-w-md">
          <TabsTrigger value="current">Joriy arenda</TabsTrigger>
          <TabsTrigger value="returned">Qaytarilgan</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {filteredItems.filter((item) => !item.is_returned).length === 0 ? (
            <Card className="ios-card">
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Joriy arenda topilmadi</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha faol arenda yo'q"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems
                .filter((item) => !item.is_returned)
                .map((item) => (
                  <Card key={item.id} className="ios-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.products.name_uz}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Package className="h-3 w-3" />
                            Miqdor: {item.quantity}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant={isOverdue(item) ? "destructive" : "default"}>
                            {isOverdue(item) ? "Muddati o'tgan" : "Faol"}
                          </Badge>
                          {isOverdue(item) && <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mijoz:</span>
                          <span className="font-medium">{item.orders.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefon:</span>
                          <span className="font-medium">{item.orders.customer_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Boshlanish:</span>
                          <span className="font-medium">
                            {item.rental_start_date ? formatDate(item.rental_start_date) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tugash:</span>
                          <span className="font-medium">
                            {item.rental_end_date ? formatDate(item.rental_end_date) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Muddat:</span>
                          <span className="font-medium">
                            {item.rental_duration} {formatTimeUnit(item.rental_time_unit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Narx:</span>
                          <span className="font-medium text-primary">{item.unit_price.toLocaleString()} so'm</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setSelectedItem(item)
                          setShowReturnDialog(true)
                        }}
                        className="w-full ios-button"
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Qaytarish
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="returned" className="space-y-6">
          {filteredItems.filter((item) => item.is_returned).length === 0 ? (
            <Card className="ios-card">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Qaytarilgan arenda topilmadi</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha qaytarilgan arenda yo'q"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems
                .filter((item) => item.is_returned)
                .map((item) => (
                  <Card key={item.id} className="ios-card opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.products.name_uz}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Package className="h-3 w-3" />
                            Miqdor: {item.quantity}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Qaytarilgan
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mijoz:</span>
                          <span className="font-medium">{item.orders.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefon:</span>
                          <span className="font-medium">{item.orders.customer_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Boshlanish:</span>
                          <span className="font-medium">
                            {item.rental_start_date ? formatDate(item.rental_start_date) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Qaytarilgan:</span>
                          <span className="font-medium text-green-600">
                            {item.returned_at ? formatDate(item.returned_at) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Muddat:</span>
                          <span className="font-medium">
                            {item.rental_duration} {formatTimeUnit(item.rental_time_unit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Narx:</span>
                          <span className="font-medium text-primary">{item.unit_price.toLocaleString()} so'm</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Return Confirmation Dialog */}
      {showReturnDialog && selectedItem && (
        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-primary">Mahsulotni qaytarish</DialogTitle>
              <DialogDescription>
                "{selectedItem.products.name_uz}" mahsulotini qaytarishni tasdiqlash uchun MD parolni kiriting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {returnError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                  {returnError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="return-password">MD Parol</Label>
                <Input
                  id="return-password"
                  type="password"
                  value={returnPassword}
                  onChange={(e) => setReturnPassword(e.target.value)}
                  placeholder="MD parolni kiriting"
                  pattern="[0-9]*"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReturnDialog(false)
                    setSelectedItem(null)
                    setReturnPassword("")
                    setReturnError("")
                  }}
                  className="flex-1 ios-button bg-transparent"
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={handleReturnItem}
                  disabled={returnLoading || !returnPassword}
                  className="flex-1 ios-button"
                >
                  {returnLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Qaytarilmoqda...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Qaytarish
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
