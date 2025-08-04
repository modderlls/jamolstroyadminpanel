"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Home, Package } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"

export default function OrderSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState("")

  useEffect(() => {
    const order = searchParams.get("order")
    if (order) {
      setOrderNumber(order)
    } else {
      router.push("/")
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-title-2 font-bold mb-2">Buyurtma muvaffaqiyatli qabul qilindi!</h1>
          <p className="text-body text-muted-foreground mb-6">
            Sizning buyurtmangiz #{orderNumber} raqami bilan ro'yxatga olindi.
          </p>

          {/* Order Info */}
          <div className="bg-card rounded-lg border border-border p-6 mb-6 text-left">
            <h3 className="text-headline font-semibold mb-4">Keyingi qadamlar:</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Buyurtmangiz ko'rib chiqiladi va tasdiqlash uchun siz bilan bog'lanamiz
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mahsulotlar tayyorlanadi va yetkazib berish uchun jo'natiladi
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground">Buyurtmangiz belgilangan manzilga yetkazib beriladi</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push("/orders")}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Buyurtmalarni ko'rish</span>
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-secondary text-secondary-foreground rounded-lg py-3 font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Bosh sahifaga qaytish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
