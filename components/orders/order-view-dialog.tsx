"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, MapPin, Calendar, Package, CreditCard } from "lucide-react"
import Image from "next/image"

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

interface OrderViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
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

export function OrderViewDialog({ open, onOpenChange, order }: OrderViewDialogProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Buyurtma #{order.order_number}</DialogTitle>
            <Badge className={`${statusColors[order.status as keyof typeof statusColors]} border-0`}>
              {statusLabels[order.status as keyof typeof statusLabels]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Mijoz ma'lumotlari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer_phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{order.delivery_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(order.created_at).toLocaleDateString("uz-UZ", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Buyurtma holati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Holat:</span>
                  <Badge className={`${statusColors[order.status as keyof typeof statusColors]} border-0`}>
                    {statusLabels[order.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>To'lov:</span>
                  <Badge variant={order.is_payed ? "default" : "secondary"}>
                    {order.is_payed ? "To'langan" : "To'lanmagan"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Kelishilgan:</span>
                  <Badge variant={order.is_agree ? "default" : "secondary"}>{order.is_agree ? "Ha" : "Yo'q"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Qabul qilingan:</span>
                  <Badge variant={order.is_claimed ? "default" : "secondary"}>{order.is_claimed ? "Ha" : "Yo'q"}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Buyurtma tarkibi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.products.images && item.products.images.length > 0 ? (
                        <Image
                          src={item.products.images[0] || "/placeholder.svg"}
                          alt={item.products.name_uz}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium">{item.products.name_uz}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Miqdor: {item.quantity}</span>
                        <span>Narx: {item.unit_price.toLocaleString()} so'm</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">{item.total_price.toLocaleString()} so'm</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Buyurtma xulosasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Mahsulotlar:</span>
                  <span className="font-medium">{order.subtotal.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span>Yetkazib berish:</span>
                  <span className="font-medium">{order.delivery_fee.toLocaleString()} so'm</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Jami:</span>
                    <span>{order.total_amount.toLocaleString()} so'm</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
