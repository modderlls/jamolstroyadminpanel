"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"
import { ProductCard } from "@/components/ui/product-card"
import { ArrowLeft, ChevronRight, Package, Filter, Grid, List } from "lucide-react"

interface Category {
  id: string
  name_uz: string
  name_ru: string
  icon_name: string
  parent_id: string | null
  level: number
  path: string
  sort_order: number
  product_count?: number
  subcategories?: Category[]
}

interface Product {
  id: string
  name_uz: string
  name_ru: string
  description_uz: string
  price: number
  unit: string
  product_type: "sale" | "rental"
  rental_time_unit?: "hour" | "day" | "week" | "month"
  rental_price_per_unit?: number
  images: string[]
  category_id: string
  stock_quantity: number
  is_available: boolean
  is_featured: boolean
  is_popular: boolean
  category?: {
    name_uz: string
  }
  rating?: number
  review_count?: number
}

export default function CatalogPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const categoryId = searchParams.get("category")
  const searchQuery = searchParams.get("search") || ""
  const productType = searchParams.get("type") || "all" // all, sale, rental

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (categoryId) {
      fetchCategoryData(categoryId)
    } else {
      fetchRootCategories()
    }
  }, [categoryId, searchQuery, productType])

  const fetchRootCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort_order")

      if (error) throw error

      // Get product counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const count = await getCategoryProductCount(category.id)
          return { ...category, product_count: count }
        }),
      )

      setCategories(categoriesWithCounts)
      setCurrentCategory(null)
      setBreadcrumb([])
      setProducts([])
    } catch (error) {
      console.error("Root kategoriyalarni yuklashda xatolik:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryData = async (catId: string) => {
    try {
      setLoading(true)

      // Get current category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("id", catId)
        .single()

      if (categoryError) throw categoryError

      setCurrentCategory(categoryData)

      // Build breadcrumb
      const breadcrumbPath = await buildBreadcrumb(categoryData)
      setBreadcrumb(breadcrumbPath)

      // Get subcategories
      const { data: subcategories, error: subcategoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", catId)
        .eq("is_active", true)
        .order("sort_order")

      if (subcategoriesError) throw subcategoriesError

      // Get product counts for subcategories
      const subcategoriesWithCounts = await Promise.all(
        (subcategories || []).map(async (category) => {
          const count = await getCategoryProductCount(category.id)
          return { ...category, product_count: count }
        }),
      )

      setCategories(subcategoriesWithCounts)

      // Get products in this category
      await fetchCategoryProducts(catId)
    } catch (error) {
      console.error("Kategoriya ma'lumotlarini yuklashda xatolik:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildBreadcrumb = async (category: Category): Promise<Category[]> => {
    const path: Category[] = [category]

    let currentCat = category
    while (currentCat.parent_id) {
      const { data: parentData, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", currentCat.parent_id)
        .single()

      if (error || !parentData) break

      path.unshift(parentData)
      currentCat = parentData
    }

    return path
  }

  const getCategoryProductCount = async (catId: string): Promise<number> => {
    try {
      // Get all subcategory IDs recursively
      const getAllSubcategoryIds = async (categoryId: string): Promise<string[]> => {
        const ids = [categoryId]

        const { data: subcats, error } = await supabase
          .from("categories")
          .select("id")
          .eq("parent_id", categoryId)
          .eq("is_active", true)

        if (error || !subcats) return ids

        for (const subcat of subcats) {
          const subIds = await getAllSubcategoryIds(subcat.id)
          ids.push(...subIds)
        }

        return ids
      }

      const categoryIds = await getAllSubcategoryIds(catId)

      let query = supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .in("category_id", categoryIds)
        .eq("is_available", true)

      // Apply product type filter
      if (productType !== "all") {
        query = query.eq("product_type", productType)
      }

      const { count, error } = await query

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error("Mahsulot sonini olishda xatolik:", error)
      return 0
    }
  }

  const fetchCategoryProducts = async (catId: string) => {
    try {
      // Get all subcategory IDs recursively
      const getAllSubcategoryIds = async (categoryId: string): Promise<string[]> => {
        const ids = [categoryId]

        const { data: subcats, error } = await supabase
          .from("categories")
          .select("id")
          .eq("parent_id", categoryId)
          .eq("is_active", true)

        if (error || !subcats) return ids

        for (const subcat of subcats) {
          const subIds = await getAllSubcategoryIds(subcat.id)
          ids.push(...subIds)
        }

        return ids
      }

      const categoryIds = await getAllSubcategoryIds(catId)

      let query = supabase
        .from("products")
        .select(`
          *,
          category:categories(name_uz)
        `)
        .in("category_id", categoryIds)
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(50)

      // Apply product type filter
      if (productType !== "all") {
        query = query.eq("product_type", productType)
      }

      // Search filter
      if (searchQuery) {
        query = query.or(`name_uz.ilike.%${searchQuery}%,description_uz.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Add mock ratings for display
      const productsWithRatings = (data || []).map((product) => ({
        ...product,
        rating: 4.0 + Math.random() * 1.0,
        review_count: Math.floor(Math.random() * 100) + 1,
      }))

      setProducts(productsWithRatings)
    } catch (error) {
      console.error("Mahsulotlarni yuklashda xatolik:", error)
      setProducts([])
    }
  }

  const handleCategoryClick = (category: Category) => {
    const params = new URLSearchParams()
    params.set("category", category.id)
    if (productType !== "all") params.set("type", productType)
    if (searchQuery) params.set("search", searchQuery)

    router.push(`/catalog?${params.toString()}`)
  }

  const handleProductTypeFilter = (type: string) => {
    const params = new URLSearchParams()
    if (categoryId) params.set("category", categoryId)
    if (searchQuery) params.set("search", searchQuery)
    if (type !== "all") params.set("type", type)

    router.push(`/catalog?${params.toString()}`)
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
      <header className="bg-background border-b border-border sticky top-16 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentCategory && (
                <button
                  onClick={() => {
                    if (breadcrumb.length > 1) {
                      const parentCategory = breadcrumb[breadcrumb.length - 2]
                      handleCategoryClick(parentCategory)
                    } else {
                      router.push("/catalog")
                    }
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold">{currentCategory ? currentCategory.name_uz : "Katalog"}</h1>
                <p className="text-sm text-muted-foreground">
                  {categories.length > 0 && `${categories.length} ta kategoriya`}
                  {products.length > 0 && ` • ${products.length} ta mahsulot`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Filter className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {viewMode === "grid" ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center space-x-2 mt-3 text-sm text-muted-foreground">
              <button onClick={() => router.push("/catalog")} className="hover:text-primary">
                Katalog
              </button>
              {breadcrumb.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4" />
                  <button
                    onClick={() => handleCategoryClick(item)}
                    className={`hover:text-primary ${
                      index === breadcrumb.length - 1 ? "text-foreground font-medium" : ""
                    }`}
                  >
                    {item.name_uz}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-3">Mahsulot turi</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleProductTypeFilter("all")}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    productType === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  Barchasi
                </button>
                <button
                  onClick={() => handleProductTypeFilter("sale")}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    productType === "sale" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  Sotish
                </button>
                <button
                  onClick={() => handleProductTypeFilter("rental")}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    productType === "rental" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  Ijara
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-semibold">{currentCategory ? "Ichki kategoriyalar" : "Kategoriyalar"}</h2>
            {categories.map((category) => (
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
                    {category.product_count || 0} ta mahsulot • {category.level + 1}-daraja
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Mahsulotlar</h2>
            <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-4"}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} className={viewMode === "list" ? "flex-row" : ""} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {categories.length === 0 && products.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? `"${searchQuery}" bo'yicha hech narsa topilmadi`
                : "Bu kategoriyada hozircha mahsulotlar yo'q"}
            </p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
