"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"
import { ChevronRight, Package, ArrowLeft } from "lucide-react"

interface Category {
  id: string
  name_uz: string
  icon_name: string
  parent_id: string | null
  sort_order: number
  product_count?: number
  subcategories?: Category[]
}

interface Product {
  id: string
  name_uz: string
  price: number
  unit: string
  images: string[]
  category_id: string
}

export default function CatalogListPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")

      if (error) throw error

      // Build hierarchy
      const categoryMap = new Map<string, Category>()
      const rootCategories: Category[] = []

      // First pass: create map
      data?.forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, subcategories: [] })
      })

      // Second pass: build hierarchy
      data?.forEach((cat) => {
        const category = categoryMap.get(cat.id)!
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id)
          if (parent) {
            parent.subcategories!.push(category)
          }
        } else {
          rootCategories.push(category)
        }
      })

      // Get product counts
      for (const category of rootCategories) {
        await getProductCount(category)
      }

      setCategories(rootCategories)
    } catch (error) {
      console.error("Kategoriyalarni yuklashda xatolik:", error)
    } finally {
      setLoading(false)
    }
  }

  const getProductCount = async (category: Category) => {
    try {
      // Get all subcategory IDs
      const getAllSubcategoryIds = (cat: Category): string[] => {
        let ids = [cat.id]
        if (cat.subcategories) {
          cat.subcategories.forEach((sub) => {
            ids = ids.concat(getAllSubcategoryIds(sub))
          })
        }
        return ids
      }

      const categoryIds = getAllSubcategoryIds(category)

      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .in("category_id", categoryIds)
        .eq("is_available", true)

      if (error) throw error

      category.product_count = count || 0

      // Also get counts for subcategories
      if (category.subcategories) {
        for (const sub of category.subcategories) {
          await getProductCount(sub)
        }
      }
    } catch (error) {
      console.error("Mahsulot sonini olishda xatolik:", error)
      category.product_count = 0
    }
  }

  const fetchCategoryProducts = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Mahsulotlarni yuklashda xatolik:", error)
      setProducts([])
    }
  }

  const handleCategoryClick = async (category: Category) => {
    if (category.subcategories && category.subcategories.length > 0) {
      // Has subcategories, show them
      setSelectedCategory(category)
      setBreadcrumb([...breadcrumb, category])
      await fetchCategoryProducts(category.id)
    } else {
      // No subcategories, go to catalog
      router.push(`/catalog?category=${category.id}`)
    }
  }

  const handleBackClick = () => {
    if (breadcrumb.length > 0) {
      const newBreadcrumb = breadcrumb.slice(0, -1)
      setBreadcrumb(newBreadcrumb)
      if (newBreadcrumb.length > 0) {
        setSelectedCategory(newBreadcrumb[newBreadcrumb.length - 1])
        fetchCategoryProducts(newBreadcrumb[newBreadcrumb.length - 1].id)
      } else {
        setSelectedCategory(null)
        setProducts([])
      }
    }
  }

  const getIconForCategory = (iconName: string) => {
    const iconMap: { [key: string]: string } = {
      construction: "🏗️",
      electrical: "⚡",
      plumbing: "🚿",
      paint: "🎨",
      tools: "🔧",
      hardware: "🔩",
      garden: "🌱",
      safety: "🦺",
    }
    return iconMap[iconName] || "📦"
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const currentCategories = selectedCategory?.subcategories || categories

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4">
        <TopBar />
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-card rounded-xl animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
                <div className="w-6 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            {breadcrumb.length > 0 && (
              <button onClick={handleBackClick} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {selectedCategory ? selectedCategory.name_uz : "Barcha kategoriyalar"}
              </h1>
              <p className="text-sm text-muted-foreground">{currentCategories.length} ta kategoriya</p>
            </div>
          </div>

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center space-x-2 mt-3 text-sm text-muted-foreground">
              <button
                onClick={() => {
                  setBreadcrumb([])
                  setSelectedCategory(null)
                  setProducts([])
                }}
                className="hover:text-primary"
              >
                Bosh sahifa
              </button>
              {breadcrumb.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4" />
                  <button
                    onClick={() => {
                      const newBreadcrumb = breadcrumb.slice(0, index + 1)
                      setBreadcrumb(newBreadcrumb)
                      setSelectedCategory(item)
                      fetchCategoryProducts(item.id)
                    }}
                    className="hover:text-primary"
                  >
                    {item.name_uz}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Categories */}
        <div className="space-y-3 mb-8">
          {currentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className="w-full flex items-center space-x-4 p-4 bg-card rounded-xl border border-border hover:border-primary/20 hover:bg-card/80 transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                <span className="text-xl">{getIconForCategory(category.icon_name)}</span>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {category.name_uz}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {category.product_count || 0} ta mahsulot
                  {category.subcategories &&
                    category.subcategories.length > 0 &&
                    ` • ${category.subcategories.length} ta bo'lim`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>

        {/* Products in current category */}
        {products.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">{selectedCategory?.name_uz} mahsulotlari</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="bg-card rounded-xl p-4 border border-border hover:border-primary/20 hover:shadow-md transition-all text-left group"
                >
                  <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0] || "/placeholder.svg"}
                        alt={product.name_uz}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name_uz}
                  </h3>
                  <p className="text-primary font-semibold">{formatPrice(product.price)} so'm</p>
                  <p className="text-xs text-muted-foreground">/{product.unit}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
