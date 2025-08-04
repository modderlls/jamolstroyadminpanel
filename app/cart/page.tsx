"use client"

import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/CartContext"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, AlertTriangle } from "lucide-react"
import Image from "next/image"

export default function CartPage() {
  const router = useRouter()
  const { items, totalItems, totalPrice, deliveryInfo, grandTotal, updateQuantity, removeFromCart } = useCart()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    try {
      await updateQuantity(itemId, newQuantity)
    } catch (error) {
      console.error("Miqdorni yangilashda xatolik:", error)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId)
    } catch (error) {
      console.error("Mahsulotni o'chirishda xatolik:", error)
    }
  }

  const handleCheckout = () => {
    router.push("/checkout")
  }

  const hasDeliveryItems = items.some((item) => item.product.has_delivery)
  const hasNonDeliveryItems = items.some((item) => !item.product.has_delivery)

  const calculateItemTotal = (item: any) => {
    if (item.product.product_type === "rental" && item.rental_duration) {
      return item.product.price * item.rental_duration * item.quantity
    }
    return item.product.price * item.quantity
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
            <h1 className="text-xl font-bold">Savatcha</h1>
            <p className="text-sm text-muted-foreground">{totalItems} ta mahsulot</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Savatcha bo'sh</h3>
            <p className="text-muted-foreground mb-6">Mahsulotlarni qo'shish uchun katalogga o'ting</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Xarid qilishni boshlash
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex space-x-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] ? (
                        <Image
                          src={item.product.images[0] || "/placeholder.svg"}
                          alt={item.product.name_uz}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted-foreground/20" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2 mb-2">{item.product.name_uz}</h3>

                      {/* Delivery Status */}
                      <div className="mb-3">
                        {item.product.has_delivery ? (
                          <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded">
                            Yetkazib berish mavjud
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded flex items-center space-x-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Yetkazib berish mavjud emas</span>
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-3">
                        <span className="text-lg font-bold">
                          {formatPrice(item.product.price)} so'm
                          <span className="text-sm text-muted-foreground ml-1">
                            {item.product.product_type === "rental"
                              ? `/${
                                  item.product.rental_time_unit === "hour"
                                    ? "soat"
                                    : item.product.rental_time_unit === "day"
                                      ? "kun"
                                      : item.product.rental_time_unit === "week"
                                        ? "hafta"
                                        : "oy"
                                } • ${item.product.unit}`
                              : `/${item.product.unit}`}
                          </span>
                        </span>
                        {item.product.product_type === "rental" && item.rental_duration && (
                          <div className="text-sm text-muted-foreground">
                            Ijara muddati: {item.rental_duration}{" "}
                            {item.product.rental_time_unit === "hour"
                              ? "soat"
                              : item.product.rental_time_unit === "day"
                                ? "kun"
                                : item.product.rental_time_unit === "week"
                                  ? "hafta"
                                  : "oy"}
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-lg font-semibold min-w-[2rem] text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Jami:</span>
                        <span className="font-bold text-primary">{formatPrice(calculateItemTotal(item))} so'm</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Info */}
            {deliveryInfo && (
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="font-semibold mb-3">Yetkazib berish ma'lumotlari</h3>

                {hasNonDeliveryItems && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Ba'zi mahsulotlarga yetkazib berish mavjud emas</span>
                    </div>
                  </div>
                )}

                {deliveryInfo.has_delivery_items && deliveryInfo.cart_total >= deliveryInfo.free_delivery_threshold && (
                  <div className="mb-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-600 mb-1">
                      <span className="text-sm font-medium">🎉 Yetkazib berish tekin!</span>
                    </div>
                    <p className="text-xs text-green-600">
                      Siz {formatPrice(deliveryInfo.free_delivery_threshold)} so'mdan yuqori mahsulot olyapsiz
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-4">Buyurtma xulosasi</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Mahsulotlar ({totalItems} ta):</span>
                  <span className="font-medium">{formatPrice(totalPrice)} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span>Yetkazib berish:</span>
                  <div className="text-right">
                    {deliveryInfo?.has_delivery_items ? (
                      deliveryInfo.delivery_discount > 0 ? (
                        <div>
                          <span className="line-through text-muted-foreground text-sm">
                            {formatPrice(deliveryInfo.original_delivery_fee)} so'm
                          </span>
                          <span className="ml-2 text-green-600 font-medium">0 so'm</span>
                          <div className="text-xs text-green-600">-{deliveryInfo.discount_percentage}% chegirma</div>
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(deliveryInfo.final_delivery_fee)} so'm</span>
                      )
                    ) : (
                      <span className="text-red-600 font-medium">Mavjud emas</span>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Jami:</span>
                    <span className="text-lg font-bold text-primary">{formatPrice(grandTotal)} so'm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full bg-primary text-primary-foreground rounded-lg py-4 font-medium hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
            >
              Buyurtma berish
            </button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
