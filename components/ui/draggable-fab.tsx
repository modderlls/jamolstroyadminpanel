"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/CartContext"

interface DraggableFabProps {
  onCartClick: () => void
}

export function DraggableFab({ onCartClick }: DraggableFabProps) {
  const { uniqueItemsCount } = useCart()
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Bu useEffect tugmaning o'ng pastki burchakda turishini taminlaydi
  useEffect(() => {
    const updatePosition = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      setPosition({
        x: windowWidth - 80, // o'ngdan 80px
        y: windowHeight - 160, // pastdan 160px (pastki navigatsiyadan yuqorida)
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    return () => window.removeEventListener("resize", updatePosition)
  }, [])

  // Agar savatchada mahsulot bo'lmasa, tugmani ko'rsatmaymiz
  if (uniqueItemsCount === 0) return null

  return (
    <button
      // Tugma bosilganda faqat onCartClick funksiyasi ishga tushadi
      onClick={onCartClick}
      className="fixed w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-40 md:hidden cursor-pointer hover:scale-110"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: "transform 0.2s ease",
      }}
    >
      <div className="relative">
        <ShoppingCart className="w-6 h-6" />
        {uniqueItemsCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse shadow-lg">
            {uniqueItemsCount > 99 ? "99+" : uniqueItemsCount}
          </span>
        )}
      </div>
    </button>
  )
}
