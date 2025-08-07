"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Filter, Edit, Trash2, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { ProductDialog } from "@/components/products/product-dialog"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"

interface Product {
  id: string
  name_uz: string
  name_ru: string
  description_uz: string
  description_ru: string
  price: number
  unit: string
  stock_quantity: number
  images: string[]
  is_available: boolean
  is_featured: boolean
  is_popular: boolean
  product_type: string // is_rental o'rniga
  has_delivery: boolean
  delivery_price: number
  minimum_order: number
  view_count: number
  average_rating: number
  category_id: string
  created_at: string
  updated_at: string
  categories: {
    name_uz: string
    name_ru: string
  }
}

interface Category {
  id: string
  name_uz: string
  name_ru: string
}

const ITEMS_PER_PAGE = 100

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("main")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [priceFilter, setPriceFilter] = useState("")
  const [unitFilter, setUnitFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("")

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [currentPage, searchQuery, priceFilter, unitFilter, typeFilter, categoryFilter, availabilityFilter])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name_uz")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      let query = supabase.from("products").select(
        `
          *,
          categories!inner(name_uz, name_ru)
        `,
        { count: "exact" },
      )

      // Apply filters
      if (searchQuery) {
        query = query.or(
          `name_uz.ilike.%${searchQuery}%,name_ru.ilike.%${searchQuery}%,description_uz.ilike.%${searchQuery}%`,
        )
      }

      if (priceFilter) {
        if (priceFilter === "expensive") {
          query = query.gte("price", 1000000)
        } else if (priceFilter === "cheap") {
          query = query.lt("price", 100000)
        } else if (priceFilter === "medium") {
          query = query.gte("price", 100000).lt("price", 1000000)
        }
      }

      if (unitFilter) {
        query = query.eq("unit", unitFilter)
      }

      if (typeFilter) {
        if (typeFilter === "rental") {
          query = query.eq("product_type", "rental")
        } else if (typeFilter === "sale") {
          query = query.eq("product_type", "sale")
        }
      }

      if (categoryFilter) {
        query = query.eq("category_id", categoryFilter)
      }

      if (availabilityFilter) {
        query = query.eq("is_available", availabilityFilter === "available")
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query.order("updated_at", { ascending: false }).range(from, to)

      if (error) throw error

      setProducts(data || [])
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm("Bu mahsulotni o'chirishni tasdiqlaysizmi?")) {
      try {
        const { error } = await supabase.from("products").delete().eq("id", productId)
        if (error) throw error
        await fetchProducts()
      } catch (error) {
        console.error("Error deleting product:", error)
        alert("Mahsulotni o'chirishda xatolik yuz berdi")
      }
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductDialogOpen(true)
  }

  const handleAddProduct = () => {
    setEditingProduct(null)
    setIsProductDialogOpen(true)
  }

  const clearFilters = () => {
    setPriceFilter("")
    setUnitFilter("")
    setTypeFilter("")
    setCategoryFilter("")
    setAvailabilityFilter("")
    setSearchQuery("")
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mahsulotlar</h1>
          <p className="text-muted-foreground">Jami {totalCount} ta mahsulot</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="main">Asosiy</TabsTrigger>
             
          </TabsList>
        </div>

        <TabsContent value="main">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="ios-card">
              <CardHeader>
                <CardTitle className="text-lg">Filter va qidiruv</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Mahsulot qidirish..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="pl-10"
                    />
                  </div>

                  <Select
                    value={priceFilter}
                    onValueChange={(value) => {
                      setPriceFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Narx bo'yicha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheap">Arzon (100k gacha)</SelectItem>
                      <SelectItem value="medium">O'rtacha (100k-1M)</SelectItem>
                      <SelectItem value="expensive">Qimmat (1M+)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={typeFilter}
                    onValueChange={(value) => {
                      setTypeFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Turi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sotuv</SelectItem>
                      <SelectItem value="rental">Ijara</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => {
                      setCategoryFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategoriya" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name_uz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select
                    value={unitFilter}
                    onValueChange={(value) => {
                      setUnitFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder="O'lchov" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dona">Dona</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="m">Metr</SelectItem>
                      <SelectItem value="m2">Kvadrat metr</SelectItem>
                      <SelectItem value="m3">Kub metr</SelectItem>
                      <SelectItem value="litr">Litr</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={availabilityFilter}
                    onValueChange={(value) => {
                      setAvailabilityFilter(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder="Mavjudlik" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Mavjud</SelectItem>
                      <SelectItem value="unavailable">Mavjud emas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={clearFilters} className="ios-button bg-transparent">
                    <Filter className="h-4 w-4 mr-2" />
                    Tozalash
                  </Button>

                  <Button onClick={handleAddProduct} className="ios-button ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Mahsulot qo'shish
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Products List */}
            <div className="space-y-4">
              {products.map((product) => (
                <Card key={product.id} className="ios-card hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0] || "/placeholder.svg"}
                            alt={product.name_uz}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg line-clamp-1">{product.name_uz}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description_uz}</p>

                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <span className="text-lg font-bold text-foreground">
                                  {product.price.toLocaleString()} so'm
                                </span>
                                <span className="text-sm text-muted-foreground ml-1">/ {product.unit}</span>
                              </div>

                              <div className="text-sm text-muted-foreground">
                                Miqdor: {product.stock_quantity} {product.unit}
                              </div>

                              {product.minimum_order > 1 && (
                                <div className="text-sm text-muted-foreground">
                                  Min: {product.minimum_order} {product.unit}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant={product.is_available ? "default" : "secondary"}>
                                {product.is_available ? "Mavjud" : "Mavjud emas"}
                              </Badge>

                              <Badge variant={product.product_type === "rental" ? "outline" : "secondary"}>
                                {product.product_type === "rental" ? "Ijara" : "Sotuv"}
                              </Badge>

                              {product.is_featured && <Badge variant="default">Tavsiya</Badge>}

                              {product.is_popular && <Badge variant="outline">Mashhur</Badge>}

                              {product.has_delivery && (
                                <Badge variant="outline">
                                  Yetkazib berish{" "}
                                  {product.delivery_price > 0 && `(${product.delivery_price.toLocaleString()} so'm)`}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="ios-button"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="ios-button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="ios-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} /{" "}
                      {totalCount}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="ios-button"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-sm font-medium px-3">
                        {currentPage} / {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="ios-button"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {products.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Mahsulotlar topilmadi</h3>
                  <p className="text-muted-foreground">
                    Filter sozlamalarini o'zgartiring yoki yangi mahsulot qo'shing
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet
            data={products}
            onDataChange={setProducts}
            tableName="products"
            categories={categories}
            onRefresh={fetchProducts}
          />
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <ProductDialog
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        product={editingProduct}
        categories={categories}
        onSuccess={() => {
          fetchProducts()
          setIsProductDialogOpen(false)
          setEditingProduct(null)
        }}
      />
    </div>
  )
}
