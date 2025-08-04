"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./AuthContext"

interface CartItem {
  id: string
  product_id: string
  quantity: number
  rental_duration?: number
  rental_time_unit?: string
  variations?: any[]
  product: {
    id: string
    name_uz: string
    price: number
    unit: string
    images: string[]
    stock_quantity: number
    min_order_quantity: number
    product_type: "sale" | "rental"
    rental_price_per_unit?: number
    rental_deposit?: number
    has_delivery: boolean
    delivery_price: number
    delivery_limit: number
  }
}

interface DeliveryInfo {
  cart_total: number
  original_delivery_fee: number
  delivery_discount: number
  final_delivery_fee: number
  free_delivery_threshold: number
  has_delivery_items: boolean
  discount_percentage: number
}

interface CartContextType {
  items: CartItem[]
  totalItems: number
  uniqueItemsCount: number
  totalPrice: number
  deliveryInfo: DeliveryInfo | null
  grandTotal: number
  loading: boolean
  addToCart: (productId: string, quantity: number, options?: any) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeFromCart: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  refreshDeliveryInfo: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchCartItems()
    } else {
      setItems([])
      setDeliveryInfo(null)
    }
  }, [user])

  useEffect(() => {
    if (user && items.length > 0) {
      fetchDeliveryInfo()
    } else {
      setDeliveryInfo(null)
    }
  }, [user, items])

  const fetchCartItems = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          product:products(*)
        `)
        .eq("customer_id", user.id)

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Cart fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliveryInfo = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc("calculate_delivery_with_threshold", {
        customer_id_param: user.id,
      })

      if (error) throw error
      setDeliveryInfo(data)
    } catch (error) {
      console.error("Delivery info error:", error)
    }
  }

  const addToCart = async (productId: string, quantity: number, options: any = {}) => {
    if (!user) throw new Error("User not authenticated")

    try {
      // Check if item already exists
      const existingItem = items.find((item) => item.product_id === productId)

      if (existingItem) {
        // Update existing item
        await updateQuantity(existingItem.id, existingItem.quantity + quantity)
      } else {
        // Add new item
        const { error } = await supabase.from("cart_items").insert({
          customer_id: user.id,
          product_id: productId,
          quantity,
          rental_duration: options.rental_duration,
          rental_time_unit: options.rental_time_unit,
          variations: options.variations ? JSON.stringify(options.variations) : null,
        })

        if (error) throw error
        await fetchCartItems()
      }
    } catch (error) {
      console.error("Add to cart error:", error)
      throw error
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user) return

    try {
      if (quantity <= 0) {
        await removeFromCart(itemId)
        return
      }

      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId)

      if (error) throw error
      await fetchCartItems()
    } catch (error) {
      console.error("Update quantity error:", error)
      throw error
    }
  }

  const removeFromCart = async (itemId: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId)

      if (error) throw error
      await fetchCartItems()
    } catch (error) {
      console.error("Remove from cart error:", error)
    }
  }

  const clearCart = async () => {
    if (!user) return

    try {
      const { error } = await supabase.from("cart_items").delete().eq("customer_id", user.id)

      if (error) throw error
      setItems([])
      setDeliveryInfo(null)
    } catch (error) {
      console.error("Clear cart error:", error)
    }
  }

  const refreshCart = async () => {
    await fetchCartItems()
  }

  const refreshDeliveryInfo = async () => {
    await fetchDeliveryInfo()
  }

  // Calculate item total helper function
  const calculateItemTotal = (item: CartItem) => {
    if (item.product.product_type === "rental" && item.rental_duration) {
      return item.product.price * item.rental_duration * item.quantity
    }
    return item.product.price * item.quantity
  }

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const uniqueItemsCount = items.length
  const totalPrice = items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  const grandTotal = totalPrice + (deliveryInfo?.final_delivery_fee || 0)

  const value: CartContextType = {
    items,
    totalItems,
    uniqueItemsCount,
    totalPrice,
    deliveryInfo,
    grandTotal,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    refreshDeliveryInfo,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
