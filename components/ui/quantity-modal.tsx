"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { X, Minus, Plus, ShoppingCart, Clock, Calendar } from "lucide-react"

interface Product {
  id: string
  name_uz: string
  price: number
  unit: string
  product_type: "sale" | "rental"
  rental_time_unit?: string
  rental_min_duration?: number
  rental_max_duration?: number
  min_order_quantity: number
  available_quantity: number
}

interface QuantityModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export function QuantityModal({ isOpen, onClose, product }: QuantityModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [rentalDuration, setRentalDuration] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  if (!isOpen || !product) return null

  const getRentalTimeText = (unit?: string) => {
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
        return "vaqt"
    }
  }

  const getRentalIcon = (unit?: string) => {
    switch (unit) {
      case "hour":
        return <Clock className="w-4 h-4" />
      case "day":
      case "week":
      case "month":
        return <Calendar className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const calculateTotal = () => {
    if (product.product_type === "rental") {
      return product.price * rentalDuration * quantity
    }
    return product.price * quantity
  }

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    setIsAdding(true)
    try {
      if (product.product_type === "rental") {
        await addToCart(product.id, quantity, {
          rental_duration: rentalDuration,
          rental_time_unit: product.rental_time_unit,
        })
      } else {
        await addToCart(product.id, quantity)
      }

      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("Mahsulot savatga qo'shildi!")
      }
      onClose()
    } catch (error) {
      console.error("Error adding to cart:", error)
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("Xatolik yuz berdi")
      }
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl border border-border p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Miqdorni tanlang</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <h4 className="font-medium mb-2">{product.name_uz}</h4>
          <div className="text-sm text-muted-foreground">
            {formatPrice(product.price)} so'm
            <span className="ml-1">
              {product.product_type === "rental"
                ? `/${getRentalTimeText(product.rental_time_unit)} • ${product.unit}`
                : `/${product.unit}`}
            </span>
          </div>
        </div>

        {/* Rental Duration - for rental products */}
        {product.product_type === "rental" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 flex items-center">
              {getRentalIcon(product.rental_time_unit)}
              <span className="ml-2">Ijara muddati</span>
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setRentalDuration(Math.max(product.rental_min_duration || 1, rentalDuration - 1))}
                disabled={rentalDuration <= (product.rental_min_duration || 1)}
                className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center">
                <span className="text-xl font-semibold">{rentalDuration}</span>
                <p className="text-xs text-muted-foreground">{getRentalTimeText(product.rental_time_unit)}</p>
              </div>
              <button
                onClick={() => setRentalDuration(Math.min(product.rental_max_duration || 365, rentalDuration + 1))}
                disabled={rentalDuration >= (product.rental_max_duration || 365)}
                className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Miqdor</label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setQuantity(Math.max(product.min_order_quantity, quantity - 1))}
              disabled={quantity <= product.min_order_quantity}
              className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-xl font-semibold">{quantity}</span>
              <p className="text-xs text-muted-foreground">{product.unit}</p>
            </div>
            <button
              onClick={() => setQuantity(Math.min(product.available_quantity, quantity + 1))}
              disabled={quantity >= product.available_quantity}
              className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="mb-6 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Jami:</span>
            <span className="text-lg font-bold text-primary">{formatPrice(calculateTotal())} so'm</span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding || quantity > product.available_quantity}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isAdding ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-5 h-5" />
          )}
          <span>
            {isAdding ? "Qo'shilmoqda..." : product.product_type === "rental" ? "Ijaraga olish" : "Savatga qo'shish"}
          </span>
        </button>
      </div>
    </div>
  )
}
