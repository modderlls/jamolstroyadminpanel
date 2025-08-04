"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { ProductCard } from "@/components/ui/product-card"
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Truck,
  Shield,
  MessageCircle,
  User,
  Clock,
  Calendar,
  Info,
  Check,
  Send,
} from "lucide-react"
import Image from "next/image"

interface ProductSpecification {
  name: string
  value: string
  price?: number | null
}

interface ProductVariation {
  type: string
  options: ProductSpecification[]
}

interface Product {
  id: string
  name_uz: string
  description_uz: string
  price: number
  unit: string
  product_type: "sale" | "rental"
  rental_time_unit?: "hour" | "day" | "week" | "month"
  rental_price_per_unit?: number
  rental_deposit?: number
  rental_min_duration?: number
  rental_max_duration?: number
  images: string[]
  stock_quantity: number
  min_order_quantity: number
  delivery_limit: number
  delivery_price: number
  has_delivery: boolean
  is_available: boolean
  is_featured: boolean
  is_popular: boolean
  view_count: number
  specifications: Record<string, any> | null
  category: {
    name_uz: string
  }
  average_rating?: number
  review_count?: number
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  reviewer: {
    first_name: string
    last_name: string
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [rentalDuration, setRentalDuration] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [selectedVariations, setSelectedVariations] = useState<Record<string, ProductSpecification>>({})
  const [availableQuantity, setAvailableQuantity] = useState(0)
  const [canReview, setCanReview] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
    }
  }, [params.id])

  useEffect(() => {
    if (product && user) {
      checkIfCanReview()
    }
  }, [product, user])

  const fetchProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name_uz)
        `)
        .eq("id", productId)
        .eq("is_available", true)
        .single()

      if (error) throw error

      setProduct(data)
      setQuantity(data.min_order_quantity || 1)
      setRentalDuration(data.rental_min_duration || 1)

      // Calculate available quantity
      const availableQty = await calculateAvailableQuantity(data.id, data.stock_quantity)
      setAvailableQuantity(availableQty)

      // Parse specifications if available
      if (data.specifications) {
        parseSpecifications(data.specifications)
      }

      // Fetch similar products
      fetchSimilarProducts(data.category_id, productId)

      // Fetch product reviews
      fetchProductReviews(productId)

      // Update view count
      await supabase
        .from("products")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", productId)
    } catch (error) {
      console.error("Mahsulotni yuklashda xatolik:", error)
      router.push("/catalog")
    } finally {
      setLoading(false)
    }
  }

  const parseSpecifications = (specs: Record<string, any>) => {
    const parsedVariations: ProductVariation[] = []

    // Group specifications by type
    Object.entries(specs).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        parsedVariations.push({
          type: key,
          options: value.map((option: any) => {
            if (typeof option === "object" && option !== null) {
              return {
                name: option.name || option.value || "",
                value: option.value || option.name || "",
                price: option.price || null,
              }
            } else {
              return {
                name: option?.toString() || "",
                value: option?.toString() || "",
                price: null,
              }
            }
          }),
        })
      }
    })

    setVariations(parsedVariations)

    // Set default selected variations (first option of each type)
    const defaultSelected: Record<string, ProductSpecification> = {}
    parsedVariations.forEach((variation) => {
      if (variation.options.length > 0) {
        defaultSelected[variation.type] = variation.options[0]
      }
    })

    setSelectedVariations(defaultSelected)
  }

  const calculateAvailableQuantity = async (productId: string, stockQuantity: number) => {
    try {
      // Calculate sold quantity from confirmed orders
      const { data: soldData, error: soldError } = await supabase
        .from("order_items")
        .select(`
          quantity,
          orders!inner(status)
        `)
        .eq("product_id", productId)
        .in("orders.status", ["confirmed", "processing", "shipped"])

      if (soldError) throw soldError

      const soldQuantity = (soldData || []).reduce((sum, item) => sum + item.quantity, 0)
      return Math.max(0, stockQuantity - soldQuantity)
    } catch (error) {
      console.error("Available quantity calculation error:", error)
      return stockQuantity
    }
  }

  const fetchSimilarProducts = async (categoryId: string, currentProductId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name_uz)
        `)
        .eq("category_id", categoryId)
        .eq("is_available", true)
        .gt("stock_quantity", 0)
        .neq("id", currentProductId)
        .limit(6)

      if (error) throw error

      setSimilarProducts(data || [])
    } catch (error) {
      console.error("O'xshash mahsulotlarni yuklashda xatolik:", error)
    }
  }

  const fetchProductReviews = async (productId: string) => {
    try {
      // Fetch reviews from the product_reviews table
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:customer_id(
            first_name,
            last_name
          )
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      // Convert to review format
      const formattedReviews: Review[] = (data || []).map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment || "Yaxshi mahsulot!",
        created_at: review.created_at,
        reviewer: {
          first_name: review.reviewer?.first_name || "Mijoz",
          last_name: review.reviewer?.last_name || "",
        },
      }))

      setReviews(formattedReviews)
    } catch (error) {
      console.error("Sharhlarni yuklashda xatolik:", error)
      setReviews([])
    }
  }

  const checkIfCanReview = async () => {
    if (!user || !product) return

    try {
      // Check if user has confirmed orders with this product
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select(`
          id,
          orders!inner(id, status, customer_id)
        `)
        .eq("product_id", product.id)
        .eq("orders.customer_id", user.id)
        .eq("orders.status", "confirmed")

      if (orderError) throw orderError

      if (orderItems && orderItems.length > 0) {
        // Check if user already reviewed this product
        const { data: existingReview, error: reviewError } = await supabase
          .from("product_reviews")
          .select("id")
          .eq("product_id", product.id)
          .eq("customer_id", user.id)
          .single()

        if (reviewError && reviewError.code !== "PGRST116") {
          throw reviewError
        }

        // Can review if no existing review
        setCanReview(!existingReview)
      } else {
        setCanReview(false)
      }
    } catch (error) {
      console.error("Review check error:", error)
      setCanReview(false)
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!product) return

    setIsAddingToCart(true)
    try {
      // Prepare variation data
      const variationData = Object.entries(selectedVariations).map(([type, spec]) => ({
        type,
        name: spec.name,
        value: spec.value,
        price: spec.price,
      }))

      if (product.product_type === "rental") {
        await addToCart(product.id, quantity, {
          rental_duration: rentalDuration,
          rental_time_unit: product.rental_time_unit,
          variations: variationData,
        })
      } else {
        await addToCart(product.id, quantity, {
          variations: variationData,
        })
      }

      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("Mahsulot savatga qo'shildi!")
      }
    } catch (error) {
      console.error("Savatga qo'shishda xatolik:", error)
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert("Xatolik yuz berdi")
      }
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleSelectVariation = (type: string, option: ProductSpecification) => {
    setSelectedVariations((prev) => ({
      ...prev,
      [type]: option,
    }))
  }

  const handleSubmitReview = async () => {
    if (!user || !product || reviewRating < 1 || reviewRating > 5) return

    setIsSubmittingReview(true)
    try {
      // Get the order ID
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select(`
          orders!inner(id, status, customer_id)
        `)
        .eq("product_id", product.id)
        .eq("orders.customer_id", user.id)
        .eq("orders.status", "confirmed")
        .limit(1)

      if (orderError) throw orderError
      if (!orderItems || orderItems.length === 0) throw new Error("No confirmed orders found")

      const orderId = orderItems[0].orders.id

      // Submit review
      const { error: reviewError } = await supabase.from("product_reviews").insert({
        product_id: product.id,
        customer_id: user.id,
        order_id: orderId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      })

      if (reviewError) throw reviewError

      // Refresh reviews and update can review status
      fetchProductReviews(product.id)
      setCanReview(false)
      setShowReviewForm(false)
      setReviewComment("")
      setReviewRating(5)

      alert("Sharhingiz uchun rahmat!")
    } catch (error) {
      console.error("Review submission error:", error)
      alert("Sharh yuborishda xatolik yuz berdi")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // Calculate variation price additions (not replacements)
  const calculateVariationPriceAddition = () => {
    let priceAddition = 0

    Object.values(selectedVariations).forEach((variation) => {
      if (variation.price !== null && variation.price !== undefined && variation.price > 0) {
        priceAddition += variation.price
      }
    })

    return priceAddition
  }

  // Calculate total price with variations
  const calculateTotalPrice = () => {
    if (!product) return 0

    const basePrice =
      product.product_type === "rental" && product.rental_price_per_unit ? product.rental_price_per_unit : product.price

    const variationAddition = calculateVariationPriceAddition()

    if (product.product_type === "rental") {
      const rentalTotal = (basePrice + variationAddition) * rentalDuration * quantity
      const depositTotal = (product.rental_deposit || 0) * quantity
      return rentalTotal + depositTotal
    }

    return (basePrice + variationAddition) * quantity
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const getRentalTimeText = (unit?: string) => {
    switch (unit) {
      case "hour":
        return "soat"
      case "day":
        return "kun"
      case "week":
        return "hafta"
      case "month":
        return "oy"
      default:
        return "vaqt"
    }
  }

  const getRentalIcon = (unit?: string) => {
    switch (unit) {
      case "hour":
        return <Clock className="w-4 h-4" />
      case "day":
      case "week":
      case "month":
        return <Calendar className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative w-4 h-4">
            <Star className="w-4 h-4 text-gray-300 absolute" />
            <div className="overflow-hidden w-1/2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>,
        )
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />)
      }
    }
    return stars
  }

  const renderRatingInput = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => setReviewRating(star)} className="focus:outline-none">
            <Star className={`w-6 h-6 ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="text-center py-20">
          <h2 className="text-xl font-bold mb-2">Mahsulot topilmadi</h2>
          <p className="text-muted-foreground mb-4">Bu mahsulot mavjud emas yoki o'chirilgan</p>
          <button
            onClick={() => router.push("/catalog")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Katalogga qaytish
          </button>
        </div>
      </div>
    )
  }

  const basePrice =
    product.product_type === "rental" && product.rental_price_per_unit ? product.rental_price_per_unit : product.price
  const variationAddition = calculateVariationPriceAddition()
  const calculatedPrice = basePrice + variationAddition

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-4">
      <TopBar />

      {/* Header */}
      <div className="container mx-auto px-4 py-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold line-clamp-1">{product.name_uz}</h1>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">{product.category.name_uz}</p>
              {product.product_type === "rental" && (
                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded flex items-center space-x-1">
                  {getRentalIcon(product.rental_time_unit)}
                  <span>IJARA</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Product Images */}
        <div className="mb-6">
          {/* Main Image */}
          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-4 max-w-md mx-auto md:max-w-lg">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[selectedImageIndex] || "/placeholder.svg"}
                alt={product.name_uz}
                width={500}
                height={500}
                className="w-full h-full object-cover animate-fadeIn transition-all duration-500"
                priority
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="w-16 h-16 bg-muted-foreground/20 rounded-lg" />
              </div>
            )}
          </div>

          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-2 justify-center">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedImageIndex === index
                      ? "border-primary scale-105 shadow-md"
                      : "border-transparent hover:border-primary/50"
                  }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${product.name_uz} ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title and Price */}
          <div className="animate-slideInUp">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold flex-1">{product.name_uz}</h1>
              {product.is_featured && (
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded ml-2 animate-pulse">
                  TOP
                </span>
              )}
            </div>

            {/* Base Price */}
            <div className="mb-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(basePrice)} so'm</span>
                <span className="text-muted-foreground">
                  {product.product_type === "rental"
                    ? `/${getRentalTimeText(product.rental_time_unit)} • ${product.unit}`
                    : `/${product.unit}`}
                </span>
              </div>
              {product.product_type === "rental" && product.rental_deposit && product.rental_deposit > 0 && (
                <p className="text-sm text-muted-foreground">
                  Kafolat puli: {formatPrice(product.rental_deposit)} so'm/{product.unit}
                </p>
              )}
            </div>

            {/* Calculated Price with Variations */}
            {variationAddition > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-600">Hisoblangan narx:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatPrice(calculatedPrice)} so'm
                    {product.product_type === "rental"
                      ? ` /${getRentalTimeText(product.rental_time_unit)}`
                      : ` /${product.unit}`}
                  </span>
                </div>
                <div className="text-xs text-blue-600/80 mt-1">
                  Asosiy narx + turlar qo'shimchasi ({formatPrice(variationAddition)} so'm)
                </div>
              </div>
            )}

            {product.description_uz && (
              <p className="text-muted-foreground leading-relaxed animate-fadeIn">{product.description_uz}</p>
            )}
          </div>

          {/* Product Variations */}
          {variations.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6 animate-slideInUp">
              <h3 className="text-lg font-semibold mb-4">Mahsulot turlari</h3>
              <div className="space-y-4">
                {variations.map((variation) => (
                  <div key={variation.type}>
                    <h4 className="font-medium mb-2 capitalize">{variation.type}</h4>
                    <div className="flex flex-wrap gap-2">
                      {variation.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSelectVariation(variation.type, option)}
                          className={`px-3 py-2 rounded-lg border transition-all duration-300 transform hover:scale-105 ${
                            selectedVariations[variation.type]?.value === option.value
                              ? "border-primary bg-primary/10 text-primary font-medium scale-105 shadow-md"
                              : "border-border bg-muted hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {selectedVariations[variation.type]?.value === option.value && (
                              <Check className="w-4 h-4 animate-scaleIn" />
                            )}
                            <span>{option.name}</span>
                          </div>
                          {option.price !== null && option.price !== undefined && option.price > 0 && (
                            <div className="text-xs mt-1 font-medium text-green-600">
                              +{formatPrice(option.price)} so'm
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock and Minimum Order */}
          <div className="grid grid-cols-2 gap-4 animate-slideInUp">
            <div className="bg-muted/50 rounded-xl p-4 transform hover:scale-105 transition-transform duration-300">
              <h4 className="text-sm text-muted-foreground mb-1">Omborda</h4>
              <p className="font-semibold">
                {availableQuantity} {product.unit}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 transform hover:scale-105 transition-transform duration-300">
              <h4 className="text-sm text-muted-foreground mb-1">
                {product.product_type === "rental" ? "Minimal muddat" : "Minimal buyurtma"}
              </h4>
              <p className="font-semibold">
                {product.product_type === "rental"
                  ? `${product.rental_min_duration} ${getRentalTimeText(product.rental_time_unit)}`
                  : `${product.min_order_quantity} ${product.unit}`}
              </p>
            </div>
          </div>

          {/* Rental Duration Selector - Desktop Only */}
          {product.product_type === "rental" && (
            <div className="hidden md:block bg-card rounded-xl border border-border p-6 animate-slideInUp">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                {getRentalIcon(product.rental_time_unit)}
                <span className="ml-2">Ijara muddatini tanlang</span>
              </h3>
              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={() => setRentalDuration(Math.max(product.rental_min_duration || 1, rentalDuration - 1))}
                  disabled={rentalDuration <= (product.rental_min_duration || 1)}
                  className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50 hover:scale-110"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <span className="text-2xl font-semibold animate-countUp">{rentalDuration}</span>
                  <p className="text-sm text-muted-foreground">{getRentalTimeText(product.rental_time_unit)}</p>
                </div>
                <button
                  onClick={() => setRentalDuration(Math.min(product.rental_max_duration || 365, rentalDuration + 1))}
                  disabled={rentalDuration >= (product.rental_max_duration || 365)}
                  className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50 hover:scale-110"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-gray-900 rounded-lg p-4 animate-fadeIn">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-600 dark:text-blue-300">Ijara hisob-kitobi</span>
                </div>
                <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                  <div className="flex justify-between">
                    <span>Ijara narxi:</span>
                    <span className="animate-countUp">
                      {formatPrice(calculatedPrice * rentalDuration * quantity)} so'm
                    </span>
                  </div>
                  {product.rental_deposit && product.rental_deposit > 0 && (
                    <div className="flex justify-between">
                      <span>Kafolat puli:</span>
                      <span className="animate-countUp">{formatPrice(product.rental_deposit * quantity)} so'm</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1 border-gray-200 dark:border-gray-700">
                    <span>Jami to'lov:</span>
                    <span className="animate-countUp">{formatPrice(calculateTotalPrice())} so'm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quantity Selector - Desktop Only */}
          <div className="hidden md:block bg-card rounded-xl border border-border p-6 animate-slideInUp">
            <h3 className="text-lg font-semibold mb-4">Miqdorni tanlang</h3>
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => setQuantity(Math.max(product.min_order_quantity, quantity - 1))}
                disabled={quantity <= product.min_order_quantity}
                className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50 hover:scale-110"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-semibold min-w-[4rem] text-center animate-countUp">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                disabled={quantity >= availableQuantity}
                className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50 hover:scale-110"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-lg">Jami narx:</span>
              <span className="text-2xl font-bold text-primary animate-countUp">
                {formatPrice(calculateTotalPrice())} so'm
              </span>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || quantity > availableQuantity}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm hover:shadow-lg hover:scale-[1.02] transform"
            >
              {isAddingToCart ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <ShoppingCart className="w-5 h-5 animate-bounce" />
              )}
              <span>
                {isAddingToCart
                  ? "Qo'shilmoqda..."
                  : product.product_type === "rental"
                    ? "Ijaraga olish"
                    : "Savatga qo'shish"}
              </span>
            </button>
          </div>

          {/* Delivery Info */}
          <div className="bg-card rounded-xl border border-border p-4 animate-slideInUp">
            <h4 className="font-semibold mb-3 flex items-center">
              <Truck className="w-5 h-5 mr-2" />
              {product.product_type === "rental" ? "Yetkazib berish va qaytarish" : "Yetkazib berish"}
            </h4>
            <div className="space-y-2">
              {product.has_delivery ? (
                <>
                  {product.delivery_limit > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-green-600">
                        {formatPrice(product.delivery_limit)} so'mdan yuqori buyurtmalarda tekin
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Yetkazib berish: <span className="font-medium">{formatPrice(product.delivery_price)} so'm</span>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Taxminiy yetkazib berish vaqti: {product.product_type === "rental" ? "2-4 soat" : "1-3 ish kuni"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-orange-600">Bu mahsulot uchun yetkazib berish mavjud emas</span>
                </p>
              )}
              {product.product_type === "rental" && (
                <p className="text-sm text-muted-foreground">
                  Qaytarish: Ijara muddati tugagach, mahsulotni qaytarib berish kerak
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 animate-slideInUp">
            <div className="flex items-center space-x-2 text-sm transform hover:scale-105 transition-transform duration-300">
              <Shield className="w-4 h-4 text-green-600" />
              <span>Sifat kafolati</span>
            </div>
            <div className="flex items-center space-x-2 text-sm transform hover:scale-105 transition-transform duration-300">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Yuqori sifat</span>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-card rounded-xl border border-border p-6 animate-slideInUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Mijozlar sharhlari ({reviews.length})
              </h3>

              {canReview && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all duration-300 flex items-center space-x-2 transform hover:scale-105"
                >
                  <Star className="w-4 h-4" />
                  <span>Sharh qoldirish</span>
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-muted/30 rounded-lg p-4 mb-6 animate-slideInDown">
                <h4 className="font-medium mb-3">Mahsulot haqida fikringizni qoldiring</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Baholash</label>
                    {renderRatingInput()}
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Izoh (ixtiyoriy)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-3 py-2 bg-background rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-300"
                      rows={3}
                      placeholder="Mahsulot haqida fikringiz..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all duration-300"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center space-x-2 transform hover:scale-105"
                    >
                      {isSubmittingReview ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Yuborish</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div
                    key={review.id}
                    className="border-b border-border pb-4 last:border-b-0 last:pb-0 animate-slideInUp"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">
                            {review.reviewer.first_name} {review.reviewer.last_name}
                          </span>
                          <div className="flex items-center">{renderStars(review.rating)}</div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{review.comment}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("uz-UZ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Bu mahsulot haqida hali sharhlar yo'q</p>
              </div>
            )}
          </div>

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div className="animate-slideInUp">
              <h3 className="text-lg font-semibold mb-4">O'xshash mahsulotlar</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {similarProducts.map((similarProduct, index) => (
                  <div
                    key={similarProduct.id}
                    className="animate-slideInUp"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ProductCard product={similarProduct} onQuickView={(id) => router.push(`/product/${id}`)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar - Mobile Only - Very Compact and Responsive */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-2 md:hidden z-30 safe-area-bottom animate-slideInUp">
        <div className="max-w-sm mx-auto">
          {/* Rental Duration Selector for Mobile - Compact */}
          {product.product_type === "rental" && (
            <div className="mb-2 p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Muddat:</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setRentalDuration(Math.max(product.rental_min_duration || 1, rentalDuration - 1))}
                    disabled={rentalDuration <= (product.rental_min_duration || 1)}
                    className="w-6 h-6 bg-muted rounded flex items-center justify-center disabled:opacity-50 hover:scale-110 transition-transform duration-300"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold min-w-[3rem] text-center animate-countUp">
                    {rentalDuration} {getRentalTimeText(product.rental_time_unit)}
                  </span>
                  <button
                    onClick={() => setRentalDuration(Math.min(product.rental_max_duration || 365, rentalDuration + 1))}
                    disabled={rentalDuration >= (product.rental_max_duration || 365)}
                    className="w-6 h-6 bg-muted rounded flex items-center justify-center disabled:opacity-50 hover:scale-110 transition-transform duration-300"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quantity and Add to Cart - Very Compact */}
          <div className="flex items-center space-x-2">
            {/* Quantity Selector - Compact */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setQuantity(Math.max(product.min_order_quantity, quantity - 1))}
                disabled={quantity <= product.min_order_quantity}
                className="w-7 h-7 bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50 hover:scale-110"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-semibold min-w-[2rem] text-center animate-countUp">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                disabled={quantity >= availableQuantity}
                className="w-7 h-7 bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50 hover:scale-110"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Price and Add to Cart - Compact */}
            <div className="flex-1 flex flex-col">
              <div className="text-right mb-1">
                <div className="text-sm font-bold animate-countUp">{formatPrice(calculateTotalPrice())} so'm</div>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || quantity > availableQuantity}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-1 shadow-sm hover:shadow-md hover:scale-[1.02] transform"
              >
                {isAddingToCart ? (
                  <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <ShoppingCart className="w-3 h-3 animate-bounce" />
                )}
                <span className="text-xs">
                  {isAddingToCart
                    ? "Qo'shilmoqda..."
                    : product.product_type === "rental"
                      ? "Ijaraga olish"
                      : "Savatga qo'shish"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
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
        
        @keyframes slideInDown {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes countUp {
          from { 
            opacity: 0;
            transform: scale(0.8);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out;
        }
        
        .animate-slideInDown {
          animation: slideInDown 0.4s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .animate-countUp {
          animation: countUp 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
