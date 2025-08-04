"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import {
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Star,
  Edit,
  LogOut,
  AlertTriangle,
  Building2,
  MessageCircle,
} from "lucide-react"

interface UserStats {
  totalOrders: number
  totalSpent: number
  averageRating: number
  joinDate: string
}

interface CompanyInfo {
  name: string
  description: string
  established_year: number
  employee_count: number
  services: string[]
  phone_number: string
  location: string
  time: string
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [mathQuestion, setMathQuestion] = useState("")
  const [mathAnswer, setMathAnswer] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState(0)
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "company">("profile")
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetchUserStats()
    fetchCompanyInfo()
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone_number: user.phone_number || "",
    })
  }, [user, router])

  const fetchUserStats = async () => {
    if (!user) return

    try {
      // Fetch only confirmed orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("customer_id", user.id)
        .eq("status", "confirmed") // Only confirmed orders

      if (ordersError) throw ordersError

      const totalOrders = orders?.length || 0
      const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

      setStats({
        totalOrders,
        totalSpent,
        averageRating: 4.8, // Mock rating
        joinDate: user.created_at,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase.from("company").select("*").eq("is_active", true).single()

      if (error) throw error
      setCompanyInfo(data)
    } catch (error) {
      console.error("Company info error:", error)
    }
  }

  const formatPhoneInput = (value: string) => {
    if (!value) return ""

    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "")

    // Format as +998 XX XXX XX XX
    if (digits.length <= 3) {
      return `+${digits}`
    } else if (digits.length <= 5) {
      return `+${digits.slice(0, 3)} ${digits.slice(3)}`
    } else if (digits.length <= 8) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
    } else if (digits.length <= 10) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
    } else {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
    }
  }

  const handleEditProfile = async () => {
    if (!user) return

    // Validate required fields
    if (!editForm.first_name?.trim() || !editForm.last_name?.trim()) {
      alert("Ism va familiya majburiy maydonlar")
      return
    }

    setIsUpdating(true)
    try {
      const { data, error } = await supabase.rpc("update_user_profile", {
        user_id_param: user.id,
        first_name_param: editForm.first_name.trim(),
        last_name_param: editForm.last_name.trim(),
        phone_number_param: editForm.phone_number?.trim() || "",
        email_param: "", // Email not needed
      })

      if (error) throw error

      if (data.success) {
        alert(data.message)
        setShowEditForm(false)
        // Update local form with formatted phone
        if (data.formatted_phone) {
          setEditForm((prev) => ({ ...prev, phone_number: data.formatted_phone }))
        }
        // Refresh user data would require updating the auth context
        window.location.reload()
      } else {
        alert(data.message)
      }
    } catch (error) {
      console.error("Profile update error:", error)
      alert("Profilni yangilashda xatolik yuz berdi")
    } finally {
      setIsUpdating(false)
    }
  }

  const generateMathQuestion = () => {
    const operations = ["+", "-", "*"]
    const operation = operations[Math.floor(Math.random() * operations.length)]
    let num1, num2, answer

    switch (operation) {
      case "+":
        num1 = Math.floor(Math.random() * 20) + 1
        num2 = Math.floor(Math.random() * 20) + 1
        answer = num1 + num2
        break
      case "-":
        num1 = Math.floor(Math.random() * 20) + 10
        num2 = Math.floor(Math.random() * 10) + 1
        answer = num1 - num2
        break
      case "*":
        num1 = Math.floor(Math.random() * 10) + 1
        num2 = Math.floor(Math.random() * 10) + 1
        answer = num1 * num2
        break
      default:
        num1 = 2
        num2 = 2
        answer = 4
    }

    setMathQuestion(`${num1} ${operation} ${num2} = ?`)
    setCorrectAnswer(answer)
  }

  const handleLogoutClick = () => {
    generateMathQuestion()
    setShowLogoutConfirm(true)
    setMathAnswer("")
    setShowFinalConfirm(false)
  }

  const handleMathSubmit = () => {
    if (Number.parseInt(mathAnswer) === correctAnswer) {
      setShowFinalConfirm(true)
    } else {
      alert("Noto'g'ri javob! Qaytadan urinib ko'ring.")
      generateMathQuestion()
      setMathAnswer("")
    }
  }

  const handleFinalLogout = async () => {
    try {
      // Clear all website login sessions for this user
      if (user) {
        await supabase.from("website_login_sessions").delete().eq("user_id", user.id)
      }

      // Sign out
      signOut()
      router.push("/")
    } catch (error) {
      console.error("Error during logout:", error)
      signOut()
      router.push("/")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      <div className="container mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === "profile"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil</span>
          </button>
          <button
            onClick={() => setActiveTab("company")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === "company"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Kompaniya</span>
          </button>
        </div>

        {activeTab === "profile" ? (
          <>
            {/* Profile Header */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-2xl font-bold">
                    {user.first_name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">
                    {user.first_name || ""} {user.last_name || ""}
                  </h1>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {user.phone_number && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone_number}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>A'zo bo'lgan: {formatDate(user.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Qashqadaryo viloyati, G'uzor tumani</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <div className="text-sm text-muted-foreground">Tasdiqlangan buyurtmalar</div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(stats.totalSpent)}</div>
                  <div className="text-sm text-muted-foreground">Jami xarid</div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.averageRating}</div>
                  <div className="text-sm text-muted-foreground">Reyting</div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <User className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">VIP</div>
                  <div className="text-sm text-muted-foreground">Status</div>
                </div>
              </div>
            )}

            {/* Delivery Info */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-xl border border-border p-6 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">🚚</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Yetkazib berish xizmati</h3>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    200,000 so'mdan yuqori xaridlarda tekin yetkazib berish!
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>• Tez va xavfsiz yetkazib berish</p>
                <p>• Qashqadaryo viloyati bo'ylab</p>
                <p>• Professional kuryer xizmati</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => router.push("/orders")}
                className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span className="font-medium">Buyurtmalarim</span>
                </div>
                <span className="text-muted-foreground">→</span>
              </button>

              <button
                onClick={() => router.push("/profile/addresses")}
                className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium">Manzillarim</span>
                </div>
                <span className="text-muted-foreground">→</span>
              </button>

              <button
                onClick={() => router.push("/profile/reviews")}
                className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <span className="font-medium">Sharhlarim</span>
                </div>
                <span className="text-muted-foreground">→</span>
              </button>
            </div>

            {/* Logout Section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                Xavfsizlik
              </h3>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Hisobdan chiqish</span>
              </button>
            </div>
          </>
        ) : (
          /* Company Tab */
          companyInfo && (
            <div className="space-y-6">
              {/* Company Header */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">{companyInfo.name}</h1>
                    <p className="text-muted-foreground leading-relaxed">{companyInfo.description}</p>
                  </div>
                </div>
              </div>

              {/* Company Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{companyInfo.established_year}</div>
                  <div className="text-sm text-muted-foreground">Tashkil etilgan</div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">100+</div>
                  <div className="text-sm text-muted-foreground">Xodimlar</div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-muted-foreground">Xizmat</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Aloqa ma'lumotlari</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <span>{companyInfo.phone_number}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>Qashqadaryo viloyati, G'uzor tumani</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>Ish vaqti: {companyInfo.time}</span>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Xizmatlarimiz</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {companyInfo.services.map((service, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-xl border border-border p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">🚚</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                      Yetkazib berish xizmati
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      200,000 so'mdan yuqori xaridlarda tekin yetkazib berish!
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>• Tez va xavfsiz yetkazib berish</p>
                  <p>• Qashqadaryo viloyati bo'ylab</p>
                  <p>• Professional kuryer xizmati</p>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Profilni tahrirlash</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ism *</label>
                <input
                  type="text"
                  value={editForm.first_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                  placeholder="Ismingizni kiriting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Familiya *</label>
                <input
                  type="text"
                  value={editForm.last_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                  placeholder="Familiyangizni kiriting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefon raqam</label>
                <input
                  type="tel"
                  value={editForm.phone_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: formatPhoneInput(e.target.value) })}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditForm(false)}
                disabled={isUpdating}
                className="flex-1 py-2 px-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleEditProfile}
                disabled={isUpdating || !editForm.first_name?.trim() || !editForm.last_name?.trim()}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <span>Saqlash</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-center">Hisobdan chiqish</h3>

            {!showFinalConfirm ? (
              <>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Xavfsizlik uchun quyidagi savolga javob bering:
                </p>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold mb-2">{mathQuestion}</div>
                  <input
                    type="number"
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all text-center"
                    placeholder="Javobni kiriting"
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2 px-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleMathSubmit}
                    disabled={!mathAnswer}
                    className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Tekshirish
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Rozimisiz o'chirishga? Bu amalni bekor qilib bo'lmaydi.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2 px-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Yo'q
                  </button>
                  <button
                    onClick={handleFinalLogout}
                    className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Ha, chiqish
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}
