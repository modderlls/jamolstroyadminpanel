"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/CartContext"
import { X, Minus, Plus, Trash2, ShoppingCart, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const router = useRouter()
  const { items, totalItems, totalPrice, deliveryInfo, grandTotal, updateQuantity, removeFromCart } = useCart()
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setUpdatingItems((prev) => new Set(prev).add(itemId))
    try {
      await updateQuantity(itemId, newQuantity)
    } catch (error) {
      console.error("Miqdorni yangilashda xatolik:", error)
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId))
    try {
      await removeFromCart(itemId)
    } catch (error) {
      console.error("Mahsulotni o'chirishda xatolik:", error)
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const handleCheckout = () => {
    onClose()
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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-background shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-background to-muted/20">
          <h2 className="text-lg font-semibold">Savatcha</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Savatcha bo'sh</h3>
              <p className="text-muted-foreground text-sm">Mahsulotlarni qo'shish uchun katalogga o'ting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => {
                const isUpdating = updatingItems.has(item.id)

                return (
                  <div
                    key={item.id}
                    className="bg-gradient-to-r from-card to-card/80 rounded-lg border border-border p-3 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex space-x-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0 group">
                        {item.product.images?.[0] ? (
                          <Image
                            src={item.product.images[0] || "/placeholder.svg"}
                            alt={item.product.name_uz}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.product.name_uz}</h4>
                        <div className="text-sm font-bold mb-2">
                          {formatPrice(item.product.price)} so'm
                          <span className="text-xs text-muted-foreground ml-1">
                            {item.product.product_type === "rental"
                              ? `/${
                                  item.rental_time_unit === "hour"
                                    ? "soat"
                                    : item.rental_time_unit === "day"
                                      ? "kun"
                                      : item.rental_time_unit === "week"
                                        ? "hafta"
                                        : "oy"
                                } • ${item.product.unit}`
                              : `/${item.product.unit}`}
                          </span>
                          {item.product.product_type === "rental" && item.rental_duration && (
                            <div className="text-xs text-muted-foreground">
                              Muddat: {item.rental_duration}{" "}
                              {item.rental_time_unit === "hour"
                                ? "soat"
                                : item.rental_time_unit === "day"
                                  ? "kun"
                                  : item.rental_time_unit === "week"
                                    ? "hafta"
                                    : "oy"}
                            </div>
                          )}
                        </div>

                        {/* Delivery Status */}
                        <div className="mb-2">
                          {item.product.has_delivery ? (
                            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded">
                              Yetkazib berish mavjud
                            </span>
                          ) : (
                            <span className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Yetkazib berish mavjud emas</span>
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={isUpdating || item.quantity <= 1}
                              className="w-6 h-6 bg-gradient-to-r from-muted to-muted/80 rounded flex items-center justify-center hover:from-muted/80 hover:to-muted hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold min-w-[1.5rem] text-center">
                              {isUpdating ? "..." : item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={isUpdating}
                              className="w-6 h-6 bg-gradient-to-r from-muted to-muted/80 rounded flex items-center justify-center hover:from-muted/80 hover:to-muted hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isUpdating}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Jami:</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatPrice(calculateItemTotal(item))} so'm
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="border-t border-border bg-background">
              {/* Delivery Info */}
              {deliveryInfo && (
                <div className="p-4 space-y-2">
                  {hasNonDeliveryItems && (
                    <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Ba'zi mahsulotlarga yetkazib berish mavjud emas</span>
                    </div>
                  )}

                  {deliveryInfo.has_delivery_items &&
                    deliveryInfo.cart_total >= deliveryInfo.free_delivery_threshold && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 text-green-600 mb-1">
                          <span className="text-sm font-medium">🎉 Yetkazib berish tekin!</span>
                        </div>
                        <p className="text-xs text-green-600">
                          Siz {formatPrice(deliveryInfo.free_delivery_threshold)} so'mdan yuqori mahsulot olyapsiz
                        </p>
                      </div>
                    )}

                  {deliveryInfo.has_delivery_items &&
                    deliveryInfo.cart_total < deliveryInfo.free_delivery_threshold && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <div className="text-sm text-blue-600">
                          Yana {formatPrice(deliveryInfo.free_delivery_threshold - deliveryInfo.cart_total)} so'm
                          mahsulot qo'shing va yetkazib berish tekin bo'lsin!
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Summary */}
              <div className="px-4 pb-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Mahsulotlar ({totalItems} ta):</span>
                  <span>{formatPrice(totalPrice)} so'm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Yetkazib berish:</span>
                  <div className="text-right">
                    {deliveryInfo?.has_delivery_items ? (
                      deliveryInfo.delivery_discount > 0 ? (
                        <div>
                          <span className="line-through text-muted-foreground text-xs">
                            {formatPrice(deliveryInfo.original_delivery_fee)} so'm
                          </span>
                          <span className="ml-2 text-green-600 font-medium">0 so'm</span>
                          <div className="text-xs text-green-600">-{deliveryInfo.discount_percentage}% chegirma</div>
                        </div>
                      ) : (
                        <span>{formatPrice(deliveryInfo.final_delivery_fee)} so'm</span>
                      )
                    ) : (
                      <span className="text-red-600">Mavjud emas</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>Jami:</span>
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {formatPrice(grandTotal)} so'm
                  </span>
                </div>
              </div>

              {/* Checkout Button - Always visible */}
              <div className="p-4 pt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg py-3 font-medium hover:from-primary/90 hover:to-primary hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
                >
                  Buyurtma berish
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
