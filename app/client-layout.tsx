"use client"

import type React from "react"

import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TelegramProvider } from "@/contexts/TelegramContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { CartProvider } from "@/contexts/CartContext"
import { CartSidebar } from "@/components/layout/cart-sidebar"
import { useCart } from "@/contexts/CartContext"
import { ShoppingCart } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

const inter = Inter({ subsets: ["latin"] })

function CartFAB() {
  const { totalItems, grandTotal } = useCart()
  const [showCartSidebar, setShowCartSidebar] = useState(false)
  const [showFAB, setShowFAB] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setShowFAB(totalItems > 0 && !pathname.includes("/cart") && !pathname.includes("/checkout"))
  }, [totalItems, pathname])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  if (!showFAB) return null

  return (
    <>
      <button
        onClick={() => setShowCartSidebar(true)}
        className="fixed bottom-24 right-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all z-40 md:bottom-4 overflow-hidden"
      >
        {/* Mobile - Circular FAB */}
        <div className="md:hidden w-14 h-14 flex items-center justify-center">
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
        </div>

        {/* Desktop - Extended Bar */}
        <div className="hidden md:flex items-center space-x-3 px-4 py-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
          <div className="text-sm">
            <div className="font-medium">{totalItems} ta mahsulot</div>
            <div className="text-xs opacity-90">{formatPrice(grandTotal)} so'm</div>
          </div>
        </div>
      </button>

      <CartSidebar isOpen={showCartSidebar} onClose={() => setShowCartSidebar(false)} />
    </>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CartFAB />
    </>
  )
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <TelegramProvider>
            <AuthProvider>
              <CartProvider>
                <LayoutContent>{children}</LayoutContent>
              </CartProvider>
            </AuthProvider>
          </TelegramProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
