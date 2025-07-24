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
  Calendar,
  User,
  MapPin,
  Phone,
  Package,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  PhoneCall,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"

interface Rental {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  status: string
  total_amount: number
  rental_start_date: string
  rental_end_date: string
  rental_duration: number
  rental_price_per_day: number
  deposit_amount: number
  is_deposit_paid: boolean
  is_returned: boolean
  return_date: string
  condition_on_return: string
  late_return_fee: number
  damage_fee: number
  created_at: string
  updated_at: string
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
  returned: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusLabels = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped: "Yetkazilmoqda",
  delivered: "Berilgan",
  returned: "Qaytarilgan",
  cancelled: "Bekor qilingan",
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("list")

  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [returnFilter, setReturnFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    fetchRentals()
  }, [searchQuery, statusFilter, returnFilter, dateFilter])

  const fetchRentals = async () => {
    try {
      let query = supabase.from("orders").select(
        `
          *,
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            products(name_uz, images)
          )
        `,
      )

      // Only get rental orders
      query = query.eq("product_type", "rental")

      // Apply filters
      if (searchQuery) {
        query = query.or(
          `order_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`,
        )
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter)
      }

      if (returnFilter) {
        if (returnFilter === "returned") {
          query = query.eq("is_returned", true)
        } else if (returnFilter === "not_returned") {
          query = query.eq("is_returned", false)
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

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error

      // Process rental data
      const processedRentals = (data || []).map((rental) => {
        const startDate = new Date(rental.rental_start_date || rental.created_at)
        const endDate = new Date(
          rental.rental_end_date || startDate.getTime() + rental.rental_duration * 24 * 60 * 60 * 1000,
        )
        const today = new Date()
        const isOverdue = !rental.is_returned && endDate < today

        return {
          ...rental,
          rental_start_date: startDate.toISOString(),
          rental_end_date: endDate.toISOString(),
          is_overdue: isOverdue,
        }
      })

      setRentals(processedRentals)
    } catch (error) {
      console.error("Error fetching rentals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
  }

  const handleMarkReturned = async (rentalId: string) => {
    if (confirm("Bu arendani qaytarilgan deb belgilashni tasdiqlaysizmi?")) {
      try {
        const { error } = await supabase
          .from("orders")
          .update({
            is_returned: true,
            return_date: new Date().toISOString(),
            status: "returned",
            updated_at: new Date().toISOString(),
          })
          .eq("id", rentalId)

        if (error) throw error
        await fetchRentals()
      } catch (error) {
        console.error("Error marking rental as returned:", error)
        alert("Arendani qaytarilgan deb belgilashda xatolik yuz berdi")
      }
    }
  }

  const clearFilters = () => {
    setStatusFilter("")
    setReturnFilter("")
    setDateFilter("")
    setSearchQuery("")
  }

  const getRentalStatusColor = (rental: Rental) => {
    if (rental.is_returned) {
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    } else if (rental.is_overdue) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    } else if (rental.status === "delivered") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    } else {
      return statusColors[rental.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
    }
  }

  const getRentalStatusText = (rental: Rental) => {
    if (rental.is_returned) {
      return "Qaytarilgan"
    } else if (rental.is_overdue) {
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(rental.rental_end_date).getTime()) / (24 * 60 * 60 * 1000),
      )
      return `${daysOverdue} kun kechikdi`
    } else {
      return statusLabels[rental.status as keyof typeof statusLabels] || rental.status
    }
  }

  const calculateRemainingDays = (rental: Rental) => {
    if (rental.is_returned) return 0
    const endDate = new Date(rental.rental_end_date)
    const today = new Date()
    return Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  }

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
          <h1 className="text-3xl font-bold text-foreground">Arendalar</h1>
          <p className="text-muted-foreground">Jami {rentals.length} ta arenda</p>
        </div>
        <Button onClick={fetchRentals} variant="outline" className="ios-button bg-transparent">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
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
                      placeholder="Arenda raqami, mijoz..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Holat bo'yicha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Kutilmoqda</SelectItem>
                      <SelectItem value="confirmed">Tasdiqlangan</SelectItem>
                      <SelectItem value="processing">Tayyorlanmoqda</SelectItem>
                      <SelectItem value="shipped">Yetkazilmoqda</SelectItem>
                      <SelectItem value="delivered">Berilgan</SelectItem>
                      <SelectItem value="returned">Qaytarilgan</SelectItem>
                      <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={returnFilter} onValueChange={setReturnFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qaytarish holati" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="returned">Qaytarilgan</SelectItem>
                      <SelectItem value="not_returned">Qaytarilmagan</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
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

            {/* Rentals List */}
            <div className="space-y-4">
              {rentals.map((rental) => (
                <Card key={rental.id} className="ios-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">#{rental.order_number}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(rental.created_at).toLocaleDateString("uz-UZ", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getRentalStatusColor(rental)} border-0`}>
                          {getRentalStatusText(rental)}
                        </Badge>
                        <div className="flex gap-1">
                          {rental.is_deposit_paid && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Omonat to'langan
                            </Badge>
                          )}
                          {rental.is_returned && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Qaytarilgan
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
                          <span className="font-medium">{rental.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{rental.customer_phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span className="line-clamp-2">{rental.delivery_address}</span>
                        </div>
                      </div>

                      {/* Rental Details */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Arenda muddati:</span>
                          <span className="font-medium">{rental.rental_duration} kun</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Kunlik narx:</span>
                          <span className="font-medium">{rental.rental_price_per_day?.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Omonat:</span>
                          <span className="font-medium">{rental.deposit_amount?.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold border-t pt-2">
                          <span>Jami:</span>
                          <span>{rental.total_amount.toLocaleString()} so'm</span>
                        </div>
                      </div>
                    </div>

                    {/* Rental Timeline */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Arenda muddati:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Boshlanish</p>
                          <p className="font-medium">
                            {new Date(rental.rental_start_date).toLocaleDateString("uz-UZ")}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Tugash</p>
                          <p className="font-medium">{new Date(rental.rental_end_date).toLocaleDateString("uz-UZ")}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Qolgan kunlar</p>
                          <p className={`font-medium ${calculateRemainingDays(rental) < 0 ? "text-red-600" : ""}`}>
                            {rental.is_returned ? "Qaytarilgan" : `${calculateRemainingDays(rental)} kun`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rental Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Arenda mahsulotlari:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {rental.order_items.map((item) => (
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallCustomer(rental.customer_phone)}
                          className="ios-button bg-transparent"
                        >
                          <PhoneCall className="h-3 w-3 mr-1" />
                          Qo'ng'iroq
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        {!rental.is_returned && rental.status === "delivered" && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkReturned(rental.id)}
                            className="ios-button bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Qaytarildi
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="ios-button bg-transparent">
                          <Eye className="h-3 w-3 mr-1" />
                          Ko'rish
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {rentals.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Arendalar topilmadi</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha arendalar mavjud emas"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet data={rentals} onDataChange={setRentals} tableName="rentals" onRefresh={fetchRentals} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jami arendalar</p>
                    <p className="text-2xl font-bold text-foreground">{rentals.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Faol arendalar</p>
                    <p className="text-2xl font-bold text-foreground">
                      {rentals.filter((r) => !r.is_returned && r.status === "delivered").length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kechikkanlar</p>
                    <p className="text-2xl font-bold text-foreground">
                      {rentals.filter((r) => r.is_overdue && !r.is_returned).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jami daromad</p>
                    <p className="text-2xl font-bold text-foreground">
                      {rentals
                        .filter((r) => r.status !== "cancelled")
                        .reduce((sum, rental) => sum + rental.total_amount, 0)
                        .toLocaleString()}{" "}
                      so'm
                    </p>
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
    </div>
  )
}
