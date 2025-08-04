"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, Phone, MapPin } from "lucide-react"
import Image from "next/image"

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product: {
    name_uz: string
    images: string[]
    unit: string
  }
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_with_service: boolean
  subtotal: number
  delivery_fee: number
  total_amount: number
  status: string
  notes?: string
  created_at: string
  order_items: OrderItem[]
}

export default function OrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetchOrders()
  }, [user, router])

  const fetchOrders = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            product:products(name_uz, images, unit)
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Orders fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPhone = (phone: string) => {
    // Format phone number as +998 XX XXX XX XX
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 12 && digits.startsWith("998")) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
    }
    return phone
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Kutilmoqda",
          color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
          icon: Clock,
        }
      case "confirmed":
        return {
          label: "Tasdiqlangan",
          color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
          icon: CheckCircle,
        }
      case "processing":
        return {
          label: "Tayyorlanmoqda",
          color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20",
          icon: Package,
        }
      case "shipped":
        return {
          label: "Yetkazilmoqda",
          color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20",
          icon: Truck,
        }
      case "delivered":
        return {
          label: "Yetkazildi",
          color: "text-green-600 bg-green-50 dark:bg-green-950/20",
          icon: CheckCircle,
        }
      case "cancelled":
        return {
          label: "Bekor qilindi",
          color: "text-red-600 bg-red-50 dark:bg-red-950/20",
          icon: XCircle,
        }
      default:
        return {
          label: "Noma'lum",
          color: "text-gray-600 bg-gray-50 dark:bg-gray-950/20",
          icon: Package,
        }
    }
  }

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetail(true)
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Bu buyurtmani bekor qilishni xohlaysizmi?")) return

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("customer_id", user?.id)

      if (error) throw error
      fetchOrders()
      setShowOrderDetail(false)
    } catch (error) {
      console.error("Cancel order error:", error)
      alert("Buyurtmani bekor qilishda xatolik yuz berdi")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4">
        <TopBar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      <div className="container mx-auto px-4 py-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Buyurtmalarim</h1>
            <p className="text-sm text-muted-foreground">{orders.length} ta buyurtma</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Buyurtmalar yo'q</h3>
            <p className="text-muted-foreground mb-6">Siz hali hech qanday buyurtma bermagansiz</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Xarid qilishni boshlash
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold mb-1">#{order.order_number}</h3>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mb-3">
                    {order.order_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.images?.[0] ? (
                          <Image
                            src={item.product.images[0] || "/placeholder.svg"}
                            alt={item.product.name_uz}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted-foreground/20" />
                        )}
                      </div>
                    ))}
                    {order.order_items.length > 3 && (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">+{order.order_items.length - 3}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{order.order_items.length} ta mahsulot</p>
                      {order.delivery_with_service && <p className="text-xs text-green-600">Yetkazib berish bilan</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatPrice(order.total_amount)} so'm</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Buyurtma #{selectedOrder.order_number}</h3>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Holat</h4>
                  <div
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getStatusInfo(selectedOrder.status).color}`}
                  >
                    {(() => {
                      const StatusIcon = getStatusInfo(selectedOrder.status).icon
                      return <StatusIcon className="w-4 h-4" />
                    })()}
                    <span className="text-sm font-medium">{getStatusInfo(selectedOrder.status).label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Buyurtma sanasi</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="font-medium mb-3">Buyurtmachi ma'lumotlari</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Ism:</span>
                    <span className="text-sm font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatPhone(selectedOrder.customer_phone)}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{selectedOrder.delivery_address}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Buyurtma tarkibi</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex space-x-3 bg-muted/30 rounded-lg p-3">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.product.images?.[0] ? (
                          <Image
                            src={item.product.images[0] || "/placeholder.svg"}
                            alt={item.product.name_uz}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium line-clamp-2 mb-1">{item.product.name_uz}</h5>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {item.quantity} {item.product.unit} × {formatPrice(item.unit_price)} so'm
                          </span>
                          <span className="font-medium">{formatPrice(item.total_price)} so'm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Qo'shimcha izoh</h4>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div>
                <h4 className="font-medium mb-3">To'lov xulosasi</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Mahsulotlar:</span>
                    <span className="text-sm font-medium">{formatPrice(selectedOrder.subtotal)} so'm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Yetkazib berish:</span>
                    <span className="text-sm font-medium">
                      {selectedOrder.delivery_fee > 0 ? formatPrice(selectedOrder.delivery_fee) + " so'm" : "0 so'm"}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Jami:</span>
                      <span className="font-bold text-primary">{formatPrice(selectedOrder.total_amount)} so'm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedOrder.status === "pending" && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Buyurtmani bekor qilish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}
