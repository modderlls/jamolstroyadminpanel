"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  MapPin,
  Phone,
  CheckCircle,
  PhoneCall,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { toast } from "sonner"

interface RentalItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  rental_duration: number
  rental_time_unit: string
  was_returned: boolean
  return_date?: string
  created_at: string
  updated_at: string
  products: {
    name_uz: string
    images: string[]
  }
  orders: {
    order_number: string
    customer_name: string
    customer_phone: string
    delivery_address: string
    status: string
    total_amount: number
    created_at: string
    updated_at: string
  }
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<RentalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("current")

  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [overdueFilter, setOverdueFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  // MD Password Dialog
  const [mdPasswordDialogOpen, setMdPasswordDialogOpen] = useState(false)
  const [mdPassword, setMdPassword] = useState("")
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null)

  useEffect(() => {
    fetchRentals()
  }, [searchQuery, statusFilter, overdueFilter, dateFilter, activeTab])

  const fetchRentals = async () => {
    try {
      let query = supabase.from("order_items").select(
        `
          *,
          products!inner(name_uz, images),
          orders!inner(order_number, customer_name, customer_phone, delivery_address, status, total_amount, created_at, updated_at)
        `,
      )

      // Only get rental items with rental_duration not null
      query = query.not("rental_duration", "is", null)

      // Filter by status - only confirmed orders
      query = query.eq("orders.status", "confirmed")

      // Filter by return status based on active tab
      if (activeTab === "current") {
        query = query.eq("was_returned", false)
      } else if (activeTab === "returned") {
        query = query.eq("was_returned", true)
      }

      // Apply search filters
      if (searchQuery) {
        query = query.or(
          `orders.order_number.ilike.%${searchQuery}%,orders.customer_name.ilike.%${searchQuery}%,orders.customer_phone.ilike.%${searchQuery}%,products.name_uz.ilike.%${searchQuery}%`,
        )
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

        query = query.gte("orders.created_at", startDate.toISOString())
      }

      const { data, error } = await query.order("orders.updated_at", { ascending: false })

      if (error) throw error

      // Process rental data to calculate overdue status
      const processedRentals = (data || []).map((rental) => {
        const orderDate = new Date(rental.orders.updated_at)
        const today = new Date()

        // Calculate rental end date based on time unit
        const rentalEndDate = new Date(orderDate)
        const duration = rental.rental_duration

        switch (rental.rental_time_unit) {
          case "hour":
            rentalEndDate.setHours(rentalEndDate.getHours() + duration)
            break
          case "day":
            rentalEndDate.setDate(rentalEndDate.getDate() + duration)
            break
          case "week":
            rentalEndDate.setDate(rentalEndDate.getDate() + duration * 7)
            break
          case "month":
            rentalEndDate.setMonth(rentalEndDate.getMonth() + duration)
            break
          default:
            rentalEndDate.setDate(rentalEndDate.getDate() + duration)
        }

        const isOverdue = !rental.was_returned && rentalEndDate < today
        const remainingTime = rentalEndDate.getTime() - today.getTime()

        return {
          ...rental,
          rental_end_date: rentalEndDate.toISOString(),
          is_overdue: isOverdue,
          remaining_time: remainingTime,
        }
      })

      // Apply overdue filter
      let filteredRentals = processedRentals
      if (overdueFilter === "overdue") {
        filteredRentals = processedRentals.filter((r) => r.is_overdue)
      } else if (overdueFilter === "not_overdue") {
        filteredRentals = processedRentals.filter((r) => !r.is_overdue)
      }

      setRentals(filteredRentals)
    } catch (error) {
      console.error("Error fetching rentals:", error)
      toast.error("Arendalarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
  }

  const handleReturnProduct = (rentalId: string) => {
    setSelectedRentalId(rentalId)
    setMdPasswordDialogOpen(true)
  }

  const handleMdPasswordSubmit = async () => {
    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mdPassword }),
      })
      const data = await response.json()

      if (data.valid && selectedRentalId) {
        // Mark as returned
        const { error } = await supabase
          .from("order_items")
          .update({
            was_returned: true,
            return_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedRentalId)

        if (error) throw error

        toast.success("Mahsulot qaytarilgan deb belgilandi")
        setMdPasswordDialogOpen(false)
        setMdPassword("")
        setSelectedRentalId(null)
        await fetchRentals()
      } else {
        toast.error("Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error marking as returned:", error)
      toast.error("Xatolik yuz berdi")
    }
  }

  const clearFilters = () => {
    setStatusFilter("")
    setOverdueFilter("")
    setDateFilter("")
    setSearchQuery("")
  }

  const getRentalStatusColor = (rental: any) => {
    if (rental.was_returned) {
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    } else if (rental.is_overdue) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    } else {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
  }

  const getRentalStatusText = (rental: any) => {
    if (rental.was_returned) {
      return "Qaytarilgan"
    } else if (rental.is_overdue) {
      const daysOverdue = Math.ceil(Math.abs(rental.remaining_time) / (24 * 60 * 60 * 1000))
      return `${daysOverdue} kun kechikdi`
    } else {
      const remainingDays = Math.ceil(rental.remaining_time / (24 * 60 * 60 * 1000))
      return `${remainingDays} kun qoldi`
    }
  }

  const formatTimeUnit = (unit: string) => {
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
        return unit
    }
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
            <TabsTrigger value="current">Joriy</TabsTrigger>
            <TabsTrigger value="returned">Qaytarilgan</TabsTrigger>
            <TabsTrigger value="table">Jadval</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="current">
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
                      placeholder="Arenda raqami, mijoz, mahsulot..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kechikish holati" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overdue">Kechikkan</SelectItem>
                      <SelectItem value="not_overdue">Kechikmaganlar</SelectItem>
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
                        <CardTitle className="text-lg font-semibold">#{rental.orders.order_number}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(rental.orders.created_at).toLocaleDateString("uz-UZ", {
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{rental.orders.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{rental.orders.customer_phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span className="line-clamp-2">{rental.orders.delivery_address}</span>
                        </div>
                      </div>

                      {/* Rental Details */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Mahsulot:</span>
                          <span className="font-medium">{rental.products.name_uz}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Miqdor:</span>
                          <span className="font-medium">{rental.quantity} dona</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Arenda muddati:</span>
                          <span className="font-medium">
                            {rental.rental_duration} {formatTimeUnit(rental.rental_time_unit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-semibold border-t pt-2">
                          <span>Jami:</span>
                          <span>{rental.total_price.toLocaleString()} so'm</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallCustomer(rental.orders.customer_phone)}
                          className="ios-button bg-transparent"
                        >
                          <PhoneCall className="h-3 w-3 mr-1" />
                          Qo'ng'iroq
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        {!rental.was_returned && (
                          <Button
                            size="sm"
                            onClick={() => handleReturnProduct(rental.id)}
                            className="ios-button bg-green-600 hover:bg-green-700"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Mahsulot qaytarildi
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
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha joriy arendalar mavjud emas"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="returned">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="ios-card">
              <CardHeader>
                <CardTitle className="text-lg">Filter va qidiruv</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Arenda raqami, mijoz, mahsulot..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

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

                  <Button variant="outline" onClick={clearFilters} className="ios-button bg-transparent">
                    <Filter className="h-4 w-4 mr-2" />
                    Tozalash
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Returned Rentals List */}
            <div className="space-y-4">
              {rentals.map((rental) => (
                <Card key={rental.id} className="ios-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">#{rental.orders.order_number}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          Qaytarilgan:{" "}
                          {rental.return_date &&
                            new Date(rental.return_date).toLocaleDateString("uz-UZ", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-800 border-0">Qaytarilgan</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{rental.orders.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{rental.orders.customer_phone}</span>
                        </div>
                      </div>

                      {/* Rental Details */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Mahsulot:</span>
                          <span className="font-medium">{rental.products.name_uz}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Miqdor:</span>
                          <span className="font-medium">{rental.quantity} dona</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Arenda muddati:</span>
                          <span className="font-medium">
                            {rental.rental_duration} {formatTimeUnit(rental.rental_time_unit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-semibold border-t pt-2">
                          <span>Jami:</span>
                          <span>{rental.total_price.toLocaleString()} so'm</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {rentals.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Qaytarilgan arendalar topilmadi</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha qaytarilgan arendalar mavjud emas"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet data={rentals} onDataChange={setRentals} tableName="rentals" onRefresh={fetchRentals} />
        </TabsContent>
      </Tabs>

      {/* MD Password Dialog */}
      <Dialog open={mdPasswordDialogOpen} onOpenChange={setMdPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>MD Parolni kiriting</DialogTitle>
            <DialogDescription>Mahsulotni qaytarilgan deb belgilash uchun MD parolni kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="md-password">MD Parol</Label>
              <Input
                id="md-password"
                type="password"
                value={mdPassword}
                onChange={(e) => setMdPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleMdPasswordSubmit()}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMdPasswordDialogOpen(false)} className="flex-1">
                Bekor qilish
              </Button>
              <Button onClick={handleMdPasswordSubmit} className="flex-1">
                Tasdiqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
