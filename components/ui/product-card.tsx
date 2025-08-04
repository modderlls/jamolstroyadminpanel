"use client"

import type React from "react"
import { Star, ShoppingCart, Clock, Calendar, Truck, X } from "lucide-react"
import Image from "next/image"

interface Product {
  id: string
  name_uz: string
  name_ru?: string
  description_uz?: string
  price: number
  unit: string
  product_type?: "sale" | "rental"
  rental_time_unit?: "hour" | "day" | "week" | "month"
  rental_price_per_unit?: number
  images?: string[]
  stock_quantity: number
  available_quantity: number
  is_available: boolean
  is_featured?: boolean
  is_popular?: boolean
  has_delivery: boolean
  delivery_price: number
  category?: {
    name_uz: string
  }
  rating?: number
  review_count?: number
  rental_deposit?: number
}

interface ProductCardProps {
  product: Product
  onQuickView?: (id: string) => void
  onAddToCart?: (product: Product) => void
  className?: string
}

export function ProductCard({ product, onQuickView, onAddToCart, className = "" }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

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
        return <Clock className="w-3 h-3" />
      case "day":
      case "week":
      case "month":
        return <Calendar className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAddToCart) {
      onAddToCart(product)
    }
  }

  const handleCardClick = () => {
    if (onQuickView) {
      onQuickView(product.id)
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative w-3 h-3">
            <Star className="w-3 h-3 text-gray-300 absolute" />
            <div className="overflow-hidden w-1/2">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            </div>
          </div>,
        )
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-gray-300" />)
      }
    }
    return stars
  }

  return (
    <div
      className={`bg-gradient-to-br from-card to-card/80 rounded-xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-200 cursor-pointer group ${className}`}
      onClick={handleCardClick}
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-muted rounded-t-xl overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name_uz}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {product.is_featured && (
            <span className="px-2 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-medium rounded shadow-sm">
              TOP
            </span>
          )}
          {product.is_popular && (
            <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium rounded shadow-sm">
              OMMABOP
            </span>
          )}
          {product.product_type === "rental" && (
            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded flex items-center space-x-1 shadow-sm">
              {getRentalIcon(product.rental_time_unit)}
              <span>IJARA</span>
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded shadow-sm ${
              product.available_quantity > 0
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                : "bg-gradient-to-r from-red-500 to-red-600 text-white"
            }`}
          >
            {product.available_quantity > 0 ? `${product.available_quantity} ${product.unit}` : "Tugagan"}
          </span>
        </div>

        {/* Delivery Status */}
        <div className="absolute bottom-2 right-2">
          {product.has_delivery ? (
            <div className="flex items-center space-x-1 px-2 py-1 bg-green-500 text-white text-xs rounded shadow-sm">
              <Truck className="w-3 h-3" />
              <span>{product.delivery_price === 0 ? "Tekin" : formatPrice(product.delivery_price)}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 px-2 py-1 bg-gray-500 text-white text-xs rounded shadow-sm">
              <X className="w-3 h-3" />
              <span>Yetkazib berish yo'q</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category */}
        {product.category && <p className="text-xs text-muted-foreground mb-1">{product.category.name_uz}</p>}

        {/* Product Name */}
        <h3 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name_uz}
        </h3>

        {/* Rating */}
        {product.rating && product.review_count && (
          <div className="flex items-center space-x-1 mb-2">
            <div className="flex items-center">{renderStars(product.rating)}</div>
            <span className="text-xs text-muted-foreground">({product.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="mb-3">
          {product.product_type === "rental" && product.rental_price_per_unit ? (
            <div>
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {formatPrice(product.rental_price_per_unit)} so'm
              </p>
              <p className="text-xs text-muted-foreground">
                /{getRentalTimeText(product.rental_time_unit)} • {product.unit}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {formatPrice(product.price)} so'm
              </p>
              <p className="text-xs text-muted-foreground">/{product.unit}</p>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={product.available_quantity <= 0}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-2 px-3 rounded-lg text-sm font-medium hover:from-primary/90 hover:to-primary hover:shadow-md hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>
            {product.product_type === "rental"
              ? "Ijaraga olish"
              : product.available_quantity <= 0
                ? "Tugagan"
                : "Savatga"}
          </span>
        </button>
      </div>
    </div>
  )
}
