"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { CategoryBar } from "@/components/layout/category-bar"
import { AdBanner } from "@/components/layout/ad-banner"
import { ProductCard } from "@/components/ui/product-card"
import { DraggableFab } from "@/components/ui/draggable-fab"
import { QuantityModal } from "@/components/ui/quantity-modal"
import { CartSidebar } from "@/components/layout/cart-sidebar"
import { Search, Package, TrendingUp, Star, Filter, User } from "lucide-react"

interface Product {
  id: string
  name_uz: string
  price: number
  unit: string
  images: string[]
  is_featured: boolean
  is_popular: boolean
  stock_quantity: number
  available_quantity: number
  has_delivery: boolean
  delivery_price: number
  delivery_limit: number
  product_type: "sale" | "rental"
  rental_price_per_unit?: number
  category: {
    name_uz: string
  }
  average_rating?: number
  review_count?: number
}

interface Worker {
  id: string
  first_name: string
  last_name: string
  profession_uz: string
  hourly_rate: number
  rating: number
  avatar_url?: string
  experience_years: number
}

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: "product" | "worker"
  image_url?: string
  price: number
  category: string
  rating: number
  has_delivery: boolean
}

interface Category {
  id: string
  name_uz: string
  icon_name: string
}

export default function HomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [popularSearches, setPopularSearches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"))
  const [sortBy, setSortBy] = useState<string>("featured")
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all")
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // searchQuery ni URL ga qarab yangilash uchun yangi useEffect
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "")
    setSelectedCategory(searchParams.get("category")) // Kategoriyani ham URL dan olish
  }, [searchParams])

  useEffect(() => {
    fetchCategories()
    if (searchQuery) {
      fetchSearchResults()
    } else {
      fetchProducts()
    }
    fetchPopularSearches()
  }, [searchQuery, selectedCategory, sortBy, deliveryFilter]) // searchQuery ni o'zgarishini kuzatish

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_uz, icon_name")
        .eq("is_active", true)
        .order("name_uz")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Categories fetch error:", error)
    }
  }

  const fetchPopularSearches = async () => {
    try {
      const { data, error } = await supabase.rpc("get_popular_searches", { limit_count: 8 })

      if (error) throw error
      setPopularSearches(data || [])
    } catch (error) {
      console.error("Popular searches error:", error)
    }
  }

  const fetchSearchResults = async () => {
    setLoading(true) // Qidiruv boshlanganda loading holatini faollashtirish
    try {
      const { data, error } = await supabase.rpc("search_all_content", {
        search_term: searchQuery,
        limit_count: 20,
      })

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error("Search results error:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAvailableQuantity = async (productId: string, stockQuantity: number) => {
    try {
      const { data: soldData, error: soldError } = await supabase
        .from("order_items")
        .select(`
          quantity,
          orders!inner(status)
        `)
        .eq("product_id", productId)
        .in("orders.status", ["confirmed", "processing", "shipped", "delivered"])

      if (soldError) throw soldError

      const soldQuantity = (soldData || []).reduce((sum, item) => sum + item.quantity, 0)
      return Math.max(0, stockQuantity - soldQuantity)
    } catch (error) {
      console.error("Available quantity calculation error:", error)
      return stockQuantity
    }
  }

  const fetchProducts = async () => {
    setLoading(true) // Mahsulotlar yuklanganda loading holatini faollashtirish
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          category:categories(name_uz)
        `)
        .eq("is_available", true)
        .gt("stock_quantity", 0)

      // Apply category filter
      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory)
      }

      // Apply delivery filter
      if (deliveryFilter === "available") {
        query = query.eq("has_delivery", true)
      } else if (deliveryFilter === "free") {
        query = query.eq("has_delivery", true).eq("delivery_price", 0)
      } else if (deliveryFilter === "none") {
        query = query.eq("has_delivery", false)
      }

      // Apply sorting
      switch (sortBy) {
        case "featured":
          query = query.order("is_featured", { ascending: false }).order("is_popular", { ascending: false })
          break
        case "popular":
          query = query.order("is_popular", { ascending: false }).order("view_count", { ascending: false })
          break
        case "price_low":
          query = query.order("price", { ascending: true })
          break
        case "price_high":
          query = query.order("price", { ascending: false })
          break
        case "newest":
          query = query.order("created_at", { ascending: false })
          break
        default:
          query = query.order("is_featured", { ascending: false })
      }

      query = query.limit(50)

      const { data, error } = await query

      if (error) throw error

      const productsWithAvailability = await Promise.all(
        (data || []).map(async (product) => {
          const availableQuantity = await calculateAvailableQuantity(product.id, product.stock_quantity)
          return {
            ...product,
            available_quantity: availableQuantity,
            average_rating: 4.0 + Math.random() * 1.0,
            review_count: Math.floor(Math.random() * 100) + 1,
          }
        }),
      )

      const availableProducts = productsWithAvailability.filter((product) => product.available_quantity > 0)

      setProducts(availableProducts)
    } catch (error) {
      console.error("Products fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    const params = new URLSearchParams()
    if (searchQuery) params.set("search", searchQuery)
    if (categoryId) params.set("category", categoryId)

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : "/")
  }

  const handleProductView = (productId: string) => {
    // Increment view count
    supabase.rpc("increment_product_view", { product_id_param: productId })
    router.push(`/product/${productId}`)
  }

  const handleWorkerView = (workerId: string) => {
    router.push(`/workers/${workerId}`)
  }

  const handleAddToCart = (product: Product) => {
    setSelectedProduct(product)
    setShowQuantityModal(true)
  }

  const handleSearchExample = (query: string) => {
    setSearchQuery(query) // Bu yerda searchQuery ni yangilaymiz
    router.push(`/?search=${encodeURIComponent(query)}`) // URL ni ham yangilaymiz
  }

  const getSectionTitle = () => {
    if (searchQuery) {
      return `"${searchQuery}" bo'yicha qidiruv natijalari`
    }
    if (selectedCategory) {
      const category = categories.find((c) => c.id === selectedCategory)
      return category ? `${category.name_uz} kategoriyasi` : "Mahsulotlar"
    }
    return "Barcha mahsulotlar"
  }

  const getSectionIcon = () => {
    if (searchQuery) return Search
    if (selectedCategory) return Filter
    return Package
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />
      <CategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />
      <AdBanner />

      <div className="container mx-auto px-4 py-6">
        {/* Search Examples - Show when no search query */}
        {!searchQuery && !selectedCategory && popularSearches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Mashhur qidiruvlar</h3>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchExample(search.query)}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
                >
                  {search.query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            {(() => {
              const Icon = getSectionIcon()
              return <Icon className="w-6 h-6 text-primary" />
            })()}
            <div>
              <h2 className="text-xl font-bold">{getSectionTitle()}</h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Yuklanmoqda..."
                  : searchQuery
                    ? `${searchResults.length} ta natija topildi`
                    : `${products.length} ta mahsulot topildi`}
              </p>
            </div>
          </div>

          {/* Filters - Only show for products - Responsive */}
          {!searchQuery && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              {/* Delivery Filter */}
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="all">Barchasi</option>
                <option value="available">Yetkazib berish mavjud</option>
                <option value="free">Tekin yetkazib berish</option>
                <option value="none">Yetkazib berish yo'q</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="featured">Tavsiya etilgan</option>
                <option value="popular">Mashhur</option>
                <option value="newest">Yangi</option>
                <option value="price_low">Arzon narx</option>
                <option value="price_high">Qimmat narx</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="bg-card rounded-lg border border-border p-4 animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-3"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Hech narsa topilmadi</h3>
                <p className="text-muted-foreground mb-6">"{searchQuery}" bo'yicha hech qanday natija topilmadi</p>
                <button
                  onClick={() => {
                    setSearchQuery("")
                    router.push("/")
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Barcha mahsulotlarni ko'rish
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="animate-slideInUp"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {result.type === "product" ? (
                      <div
                        onClick={() => handleProductView(result.id)}
                        className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                          {result.image_url && (
                            <img
                              src={result.image_url || "/placeholder.svg"}
                              alt={result.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">{result.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{result.category}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">
                            {new Intl.NumberFormat("uz-UZ").format(result.price)} so'm
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{(result.rating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                        {result.has_delivery && (
                          <div className="mt-2">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Yetkazib berish
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => handleWorkerView(result.id)}
                        className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                          {result.image_url ? (
                            <img
                              src={result.image_url || "/placeholder.svg"}
                              alt={result.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                              <User className="w-8 h-8 text-primary/50" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">{result.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{result.subtitle}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">
                            {new Intl.NumberFormat("uz-UZ").format(result.price)} so'm/soat
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{(result.rating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Grid - Only show when not searching */}
        {!searchQuery && (
          <>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="bg-card rounded-lg border border-border p-4 animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-3"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Hech narsa topilmadi</h3>
                <p className="text-muted-foreground mb-6">Bu kategoriyada mahsulotlar yo'q</p>
                <button
                  onClick={() => {
                    setSelectedCategory(null)
                    setDeliveryFilter("all")
                    router.push("/")
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Barcha mahsulotlarni ko'rish
                </button>
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product, index) => (
                  <div key={product.id} className="product-card" style={{ animationDelay: `${index * 50}ms` }}>
                    <ProductCard product={product} onQuickView={handleProductView} onAddToCart={handleAddToCart} />
                  </div>
                ))}
              </div>
            )}

            {/* Featured Products Section */}
            {!selectedCategory && (
              <div className="mt-12">
                <div className="flex items-center space-x-3 mb-6">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <div>
                    <h2 className="text-xl font-bold">Tavsiya etilgan mahsulotlar</h2>
                    <p className="text-sm text-muted-foreground">Eng yaxshi takliflar</p>
                  </div>
                </div>

                <div className="product-grid">
                  {products
                    .filter((product) => product.is_featured)
                    .slice(0, 10)
                    .map((product, index) => (
                      <div
                        key={`featured-${product.id}`}
                        className="product-card"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ProductCard product={product} onQuickView={handleProductView} onAddToCart={handleAddToCart} />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Popular Products Section */}
            {!selectedCategory && (
              <div className="mt-12">
                <div className="flex items-center space-x-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <div>
                    <h2 className="text-xl font-bold">Mashhur mahsulotlar</h2>
                    <p className="text-sm text-muted-foreground">Ko'p sotilayotgan mahsulotlar</p>
                  </div>
                </div>

                <div className="product-grid">
                  {products
                    .filter((product) => product.is_popular)
                    .slice(0, 10)
                    .map((product, index) => (
                      <div
                        key={`popular-${product.id}`}
                        className="product-card"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ProductCard product={product} onQuickView={handleProductView} onAddToCart={handleAddToCart} />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNavigation />
      

      {/* Quantity Modal */}
      <QuantityModal isOpen={showQuantityModal} onClose={() => setShowQuantityModal(false)} product={selectedProduct} />

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .product-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .product-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 1280px) {
          .product-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .product-card {
          animation: slideInUp 0.6s ease-out;
        }

        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}
