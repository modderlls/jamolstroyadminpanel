"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ChevronRight } from "lucide-react"

interface Category {
  id: string
  name_uz: string
  name_ru: string
  icon_name: string
  sort_order: number
  is_active: boolean
}

export function CategoryBar() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
        .limit(8)

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Kategoriyalarni yuklashda xatolik:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/catalog?category=${categoryId}`)
  }

  if (loading) {
    return (
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex-shrink-0 w-32 h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-background via-muted/5 to-background border-b border-border">
      <div className="container mx-auto px-4 py-2">
        {/* Mobile - Single Row - balandlik kamaytirildi */}
        <div className="md:hidden">
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="flex-shrink-0 bg-gradient-to-br from-card to-card/80 rounded-lg p-2 border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 min-w-[100px] group"
              >
                <div className="text-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform duration-200">
                    <span className="text-primary text-xs">📦</span>
                  </div>
                  <span className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                    {category.name_uz}
                  </span>
                </div>
              </button>
            ))}
            <button
              onClick={() => router.push("/catalog")}
              className="flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-2 border border-primary/20 hover:border-primary/50 hover:shadow-md transition-all duration-200 min-w-[100px] group"
            >
              <div className="text-center">
                <div className="w-6 h-6 bg-gradient-to-br from-primary/30 to-primary/20 rounded-lg flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform duration-200">
                  <ChevronRight className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs font-medium text-primary">Barchasi</span>
              </div>
            </button>
          </div>
        </div>

        {/* Desktop - 4x2 Grid */}
        <div className="hidden md:block">
          <div className="grid grid-cols-4 gap-4">
            {categories.slice(0, 8).map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="bg-gradient-to-br from-card to-card/80 rounded-lg p-4 border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-primary">📦</span>
                  </div>
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                    {category.name_uz}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
