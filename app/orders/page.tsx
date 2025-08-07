"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  DollarSign,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
// ModderSheetga teginmaymiz, lekin uni hali ham import qilamiz, agar u alohida yo'l bilan ishlatilsa
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { OrderViewDialog } from "@/components/orders/order-view-dialog"
import { PaymentConfirmDialog } from "@/components/orders/payment-confirm-dialog"
import { ManualPriceInputDialog } from "@/components/orders/manual-price-input-dialog" // NEW import for the dialog
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { uz } from "date-fns/locale"

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
  delivery_with_service: boolean
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
      specifications?: any
    }
    variations?: any // Assuming variations are on order_items
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
  const [newOrderIds, setNewOrderIds] = useState<string[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  // Dialog states
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Manual Price Input Dialog states - for handling 'Qabul qilish' with unpriced manual variations
  const [isManualPriceInputDialogOpen, setIsManualPriceInputDialogOpen] = useState(false);
  const [orderToAcceptWithManualPrice, setOrderToAcceptWithManualPrice] = useState<Order | null>(null);

  // ModderSheet usage - These states are NOT used to open ModderSheet as a popup from this page's 'Edit' button
  // They are kept here only if ModderSheet has other generic uses within your OrdersPage (e.g., a dedicated "Table View" tab)
  const [modderSheetOrder, setModderSheetOrder] = useState<Order | null>(null);
  const [isModderSheetOpen, setIsModderSheetOpen] = useState(false);


  const newOrderSoundRef = useRef<HTMLAudioElement | null>(null);
  const updatedOrderSoundRef = useRef<HTMLAudioElement | null>(null);

  const router = useRouter()

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from("orders").select(
        `
          *,
          customers:customer_id(first_name, last_name, phone_number),
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            products(name_uz, images, specifications),
            variations
          )
        `,
        { count: "exact" },
      )

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

      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

      if (error) throw error

      const fetchedOrders: Order[] = (data || []).map(order => ({
        ...order,
        order_items: order.order_items || []
      }));

      setOrders(fetchedOrders)
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Buyurtmalarni yuklashda xatolik yuz berdi.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, statusFilter, paymentFilter, dateFilter]);


  useEffect(() => {
    // Initialize audio elements only once
    if (!newOrderSoundRef.current) {
      newOrderSoundRef.current = new Audio('/sounds/new-order.mp3');
      newOrderSoundRef.current.load(); // Preload for faster playback
    }
    if (!updatedOrderSoundRef.current) {
      updatedOrderSoundRef.current = new Audio('/sounds/update-order.mp3');
      updatedOrderSoundRef.current.load(); // Preload
    }

    // Initial fetch
    fetchOrders();

    // Supabase Realtime Subscription
    // Supabase Realtime clients usually manage reconnection attempts automatically.
    // If you experience frequent disconnects, ensure your Supabase project's Realtime
    // settings are configured correctly (e.g., enable for 'orders' table)
    // and check your browser's console for WebSocket errors or network issues.
    const channel = supabase
      .channel("orders_realtime_channel") // Use a unique channel name to avoid conflicts
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all changes (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          console.log("Realtime change received!", payload);

          // Attempt to play sound, handling potential autoplay restrictions
          const playSound = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
            audioRef.current?.play().catch(e => {
              if (e.name === 'NotAllowedError') {
                console.warn("Autoplay was prevented. User must interact with the document first for sound to play: https://goo.gl/xX8pDD");
              } else {
                console.error("Error playing sound:", e);
              }
            });
          };

          // Function to fetch full order data, including nested `order_items` and `customers`
          const fetchAndProcessOrder = async (id: string) => {
            const { data: fullOrderData, error } = await supabase.from("orders").select(`
              *,
              customers:customer_id(first_name, last_name, phone_number),
              order_items(
                id,
                quantity,
                unit_price,
                total_price,
                products(name_uz, images, specifications),
                variations
              )
            `).eq("id", id).single();

            if (error) {
              console.error("Error fetching full order details during realtime update:", error);
              return null;
            }
            // Ensure order_items is always an array, even if null from DB
            return { ...fullOrderData, order_items: fullOrderData.order_items || [] } as Order;
          };


          if (payload.eventType === "INSERT") {
            const newOrder = await fetchAndProcessOrder(payload.new.id);
            if (newOrder) {
              setOrders((prevOrders) => [newOrder, ...prevOrders]);
              setNewOrderIds((prevIds) => [...prevIds, newOrder.id]);
              toast.info(`Yangi buyurtma qo'shildi: #${newOrder.order_number}`);
              setTotalCount((prevCount) => prevCount + 1);
              playSound(newOrderSoundRef);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = await fetchAndProcessOrder(payload.new.id);
            if (updatedOrder) {
              setOrders((prevOrders) =>
                prevOrders.map((order) =>
                  order.id === updatedOrder.id ? updatedOrder : order
                )
              );
              toast.info(`Buyurtma yangilandi: #${updatedOrder.order_number}`);
              playSound(updatedOrderSoundRef);
            }
          } else if (payload.eventType === "DELETE") {
            const deletedOrderId = payload.old?.id;
            if (deletedOrderId) {
              setOrders((prevOrders) =>
                prevOrders.filter((order) => order.id !== deletedOrderId)
              );
              setTotalCount((prevCount) => prevCount - 1);
              toast.info(`Buyurtma o'chirildi: #${payload.old?.order_number || ''}`);
            }
          }
        }
      )
      .subscribe();

    // Cleanup function: Unsubscribe from the channel when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]); // `fetchOrders` is a dependency here because we want to trigger it on mount


  const handleAcceptOrder = async (orderId: string) => {
    try {
      const orderToAccept = orders.find(order => order.id === orderId);
      if (orderToAccept) {
        // Check for manual variations with unassigned additional_price (0, null, or undefined)
        const requiresPriceInput = (orderToAccept.order_items || []).some(item => {
          if (item.variations) {
            let variations;
            try {
              variations = typeof item.variations === 'string' ? JSON.parse(item.variations) : item.variations;
            } catch (e) {
              console.error("Error parsing variations for price check:", e);
              return false;
            }
            return Array.isArray(variations) && variations.some(
              (variation: any) => variation.manual_type === true && (variation.additional_price === 0 || variation.additional_price === null || typeof variation.additional_price === 'undefined')
            );
          }
          return false;
        });

        if (requiresPriceInput) {
          // Open the manual price input dialog if manual prices are needed
          setOrderToAcceptWithManualPrice(orderToAccept);
          setIsManualPriceInputDialogOpen(true);
          return; // Stop the acceptance process here, it will resume after dialog submission
        }
      }

      // If no manual price input is required, proceed directly with acceptance
      const { error } = await supabase
        .from("orders")
        .update({
          is_agree: true,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select(); // Select the updated row to get the latest data

      if (error) throw error
      toast.success("Buyurtma qabul qilindi!")
      // Realtime listener will handle UI update
    } catch (error) {
      console.error("Error accepting order:", error)
      toast.error("Buyurtmani qabul qilishda xatolik yuz berdi")
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
          .select(); // Select the updated row to get the latest data

        if (error) throw error
        toast.success("Buyurtma rad etildi.")
        // Realtime listener will update the UI
      } catch (error) {
        console.error("Error rejecting order:", error)
        toast.error("Buyurtmani rad etishda xatolik yuz berdi")
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

  // HandleEditOrder will now navigate to a separate page, not open ModderSheet as a dialog
  const handleEditOrder = (order: Order) => {
    router.push(`/orders/edit/${order.id}`); // Navigate to a dynamic edit route
  };

  const clearFilters = () => {
    setStatusFilter("")
    setPaymentFilter("")
    setDateFilter("")
    setSearchQuery("")
    setCurrentPage(1)
  }

  const getAnalyticsData = () => {
    let analyticsOrders = orders

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
              order.customer_phone.includes(searchLower))
        }

        return matches
      })
    }

    const validOrders = analyticsOrders.filter((order) => order.status !== "cancelled")

    return {
      totalOrders: validOrders.length,
      pendingOrders: analyticsOrders.filter((o) => o.status === "pending").length,
      deliveredOrders: analyticsOrders.filter((o) => o.status === "delivered").length,
      totalAmount: validOrders.reduce((sum, order) => sum + order.total_amount, 0),
    }
  }

  const getProductSpecifications = (specificationsData?: any) => {
    if (!specificationsData) return null;

    let specifications;
    if (typeof specificationsData === 'string') {
      try {
        specifications = JSON.parse(specificationsData);
      } catch (error) {
        console.error("Error parsing specifications string:", specificationsData, error);
        return null;
      }
    } else {
      specifications = specificationsData;
    }

    if (typeof specifications === 'object' && !Array.isArray(specifications)) {
      const specEntries = Object.entries(specifications);
      if (specEntries.length > 0) {
        const [type, values] = specEntries[0];
        if (Array.isArray(values) && values.length > 0 && values[0].name) {
          return `${type}: ${values[0].name}`;
        }
      }
    } else if (Array.isArray(specifications) && specifications.length > 0) {
      const spec = specifications[0];
      if (spec.type && spec.name) {
        return `${spec.type}: ${spec.name}`;
      }
    }

    return null;
  };

  const getProductVariations = (variationsData?: any) => {
    if (!variationsData) return null;

    let variations;
    try {
      variations = typeof variationsData === 'string' ? JSON.parse(variationsData) : variationsData;
    } catch (error) {
      console.error("Error parsing variations string:", variationsData, error);
      return null;
    }

    if (Array.isArray(variations) && variations.length > 0) {
      return variations.map((variation: any) => {
        if (variation.manual_type) {
          // Display "narx belgilanmagan" if additional_price is 0, null, or undefined
          return `${variation.type}: ${variation.name} (Mijoz kiritgan${variation.additional_price === 0 || variation.additional_price === null || typeof variation.additional_price === 'undefined' ? ", narx belgilanmagan" : ""})`;
        } else {
          return `${variation.type}: ${variation.name}`;
        }
      }).join(", ");
    }

    return null;
  };

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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list">Ro'yxat</TabsTrigger>
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
                <Card
                  key={order.id}
                  className={`ios-card hover:shadow-md transition-all duration-300 ${
                    newOrderIds.includes(order.id) ? "border-red-500 ring-2 ring-red-300" : ""
                  }`}
                  onAnimationEnd={() => setNewOrderIds((prev) => prev.filter((id) => id !== order.id))}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">#{order.order_number}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(order.created_at), "PPP, HH:mm", { locale: uz })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
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
                          <span className="font-medium">
                            {order.delivery_with_service
                              ? `${order.delivery_fee.toLocaleString()} so'm`
                              : "Mavjud emas"}
                          </span>
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
                              {getProductVariations(item.variations) && (
                                <p className="text-xs text-muted-foreground">
                                  {getProductVariations(item.variations)}
                                </p>
                              )}
                              {getProductSpecifications(item.products.specifications) && (
                                <p className="text-xs text-muted-foreground">
                                  {getProductSpecifications(item.products.specifications)}
                                </p>
                              )}
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
                          onClick={() => handleEditOrder(order)}
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

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Manual Price Input Dialog - This dialog will appear as a popup */}
      {isManualPriceInputDialogOpen && orderToAcceptWithManualPrice && (
        <ManualPriceInputDialog
          open={isManualPriceInputDialogOpen}
          onOpenChange={setIsManualPriceInputDialogOpen}
          order={orderToAcceptWithManualPrice}
          onSuccess={() => {
            fetchOrders(); // Refresh orders after successful price update and acceptance
            setOrderToAcceptWithManualPrice(null); // Clear the order being processed
          }}
        />
      )}

      {/* ModderSheet (if you have a separate "Table View" tab or similar where it's used) */}
      {/* As per your request, ModderSheet will NOT be used as a popup from 'Edit' button, */}
      {/* so this block below is commented out or removed. If you have a different tab that uses it, */}
      {/* ensure its props are compatible with your current ModderSheet.tsx file. */}
      {/* {isModderSheetOpen && modderSheetOrder && (
        <ModderSheet
          open={isModderSheetOpen}
          onOpenChange={(isOpen) => {
            setIsModderSheetOpen(isOpen);
            if (!isOpen) {
              setModderSheetOrder(null);
              fetchOrders();
            }
          }}
          data={[modderSheetOrder]}
          onDataChange={(updatedRecords: any[]) => {
            if (updatedRecords.length > 0) {
              const updatedOrder = updatedRecords[0] as Order;
              setOrders((prevOrders) =>
                prevOrders.map((order) =>
                  order.id === updatedOrder.id ? updatedOrder : order
                )
              );
            }
          }}
          tableName="orders"
          onRefresh={fetchOrders}
          isEditingSingleRecord={true}
          editingRecordId={modderSheetOrder.id}
        />
      )} */}
    </div>
  )
}