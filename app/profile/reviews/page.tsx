"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { ArrowLeft, Star, MessageCircle, Check, Package } from "lucide-react"

interface UserReview {
  id: string
  product_name: string
  rating: number
  comment: string
  is_verified: boolean
  created_at: string
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState<UserReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetchUserReviews()
  }, [user, router])

  const fetchUserReviews = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc("get_user_reviews", {
        user_id_param: user.id,
      })

      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error("Reviews fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />,
      )
    }
    return stars
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4">
        <TopBar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      {/* Header */}
      <div className="container mx-auto px-4 py-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Sharhlarim</h1>
            <p className="text-sm text-muted-foreground">{reviews.length} ta sharh</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Sharhlar yo'q</h3>
            <p className="text-muted-foreground mb-6">Hali hech qanday mahsulotga sharh qoldirmadingiz</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Mahsulotlarni ko'rish
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Package className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">{review.product_name}</h3>
                      {review.is_verified && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">Tasdiqlangan</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center">{renderStars(review.rating)}</div>
                      <span className="text-sm text-muted-foreground">({review.rating}/5)</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("uz-UZ")}
                  </div>
                </div>

                {review.comment && (
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <p className="text-sm leading-relaxed">{review.comment}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sharh ID: {review.id.slice(0, 8)}...</span>
                  <span>{review.is_verified ? "Tasdiqlangan sharh" : "Tasdiqlanmagan"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Statistics */}
        {reviews.length > 0 && (
          <div className="mt-8 bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Sharh statistikasi</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{reviews.length}</div>
                <div className="text-sm text-muted-foreground">Jami sharhlar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{reviews.filter((r) => r.is_verified).length}</div>
                <div className="text-sm text-muted-foreground">Tasdiqlangan</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {reviews.length > 0
                    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                    : "0"}
                </div>
                <div className="text-sm text-muted-foreground">O'rtacha baho</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reviews.filter((r) => r.comment && r.comment.trim()).length}
                </div>
                <div className="text-sm text-muted-foreground">Izohli sharhlar</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
