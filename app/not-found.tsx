"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { Home, ArrowLeft, Phone } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface CompanyInfo {
  phone_number: string
}

export default function NotFound() {
  const router = useRouter()
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)

  useEffect(() => {
    fetchCompanyInfo()
  }, [])

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase.from("company").select("phone_number").eq("is_active", true).single()

      if (error) throw error
      setCompanyInfo(data)
    } catch (error) {
      console.error("Company info error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      <div className="container mx-auto px-4 py-12">
        <div className="text-center max-w-md mx-auto">
          {/* Sad emoji sticker */}
          <div className="text-8xl mb-6">😢</div>

          {/* JamolStroy logo and branding */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-2">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
            <span className="text-xl font-bold">JamolStroy</span>
          </div>

          <p className="text-muted-foreground text-sm mb-6">dan yomon xabar</p>

          {/* Main message */}
          <h1 className="text-2xl font-bold mb-4">Bu sahifa mavjud emas</h1>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Kechirasiz, siz qidirayotgan sahifa topilmadi yoki o'chirilgan bo'lishi mumkin.
          </p>

          {/* Action buttons */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Bosh sahifaga o'tish</span>
            </button>

            <button
              onClick={() => router.back()}
              className="w-full flex items-center justify-center space-x-2 bg-muted text-muted-foreground py-3 px-6 rounded-lg hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Orqaga qaytish</span>
            </button>
          </div>

          {/* Help section */}
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Agar muammo davom etsa, bizning <strong>katalog</strong> bo'limiga tashrif buyuring yoki qo'ng'iroq
              qiling.
            </p>

            <div className="flex items-center justify-center space-x-2 text-sm">
              <Phone className="w-4 h-4" />
              <span className="font-medium">{companyInfo?.phone_number || "+998 90 123 45 67"}</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
