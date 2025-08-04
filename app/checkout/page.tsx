"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { supabase } from "@/lib/supabase"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { ArrowLeft, User, Truck, Plus, Check, Home, AlertCircle } from "lucide-react"
import Image from "next/image"

interface Address {
  id: string
  name: string
  address: string
  city?: string
  region?: string
  is_default: boolean
}

interface CompanyInfo {
  phone_number: string
  address: string
}

interface DeliverySummary {
  has_delivery_products: boolean
  has_no_delivery_products: boolean
  delivery_products: any[]
  no_delivery_products: any[]
  max_delivery_fee: number
  company_address: string
}

export default function CheckoutPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { items, totalPrice, deliveryInfo, grandTotal, clearCart } = useCart()

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryWithService, setDeliveryWithService] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddressName, setNewAddressName] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummary | null>(null)
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserData()
      fetchAddresses()
      fetchCompanyInfo()
      fetchDeliverySummary()
      getCurrentLocation()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomerLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.log("Location access denied:", error)
        },
      )
    }
  }

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("phone_number, address")
        .eq("is_active", true)
        .single()

      if (error) throw error
      setCompanyInfo(data)
    } catch (error) {
      console.error("Company info error:", error)
    }
  }

  const fetchDeliverySummary = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc("get_delivery_summary", { customer_id_param: user.id })

      if (error) throw error
      setDeliverySummary(data)
    } catch (error) {
      console.error("Delivery summary error:", error)
    }
  }

  const fetchUserData = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, phone_number")
        .eq("id", user.id)
        .single()

      if (error) throw error

      setCustomerName(`${data.first_name || ""} ${data.last_name || ""}`.trim())
      setCustomerPhone(data.phone_number || "")
    } catch (error) {
      console.error("Foydalanuvchi ma'lumotlarini yuklashda xatolik:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAddresses = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })

      if (error) throw error

      setAddresses(data || [])

      const defaultAddress = data?.find((addr) => addr.is_default)
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
        setDeliveryAddress(defaultAddress.address)
      }
    } catch (error) {
      console.error("Addresses error:", error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("uz-UZ").format(price)
  }

  const generateOrderNumber = () => {
    return `JM${Date.now().toString().slice(-8)}`
  }

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId)
    const selected = addresses.find((addr) => addr.id === addressId)
    if (selected) {
      setDeliveryAddress(selected.address)
    }
  }

  const handleAddNewAddress = async () => {
    if (!user || !newAddressName.trim() || !newAddress.trim()) {
      alert("Iltimos, barcha maydonlarni to'ldiring")
      return
    }

    try {
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          name: newAddressName.trim(),
          address: newAddress.trim(),
          is_default: addresses.length === 0,
        })
        .select()
        .single()

      if (error) throw error

      fetchAddresses()
      setSelectedAddressId(data.id)
      setDeliveryAddress(data.address)

      setNewAddressName("")
      setNewAddress("")
      setShowAddressForm(false)
    } catch (error) {
      console.error("Address creation error:", error)
      alert("Manzil qo'shishda xatolik yuz berdi")
    }
  }

  const calculateItemTotal = (item: any) => {
    if (item.product.product_type === "rental" && item.rental_duration) {
      return item.product.price * item.rental_duration * item.quantity
    }
    return item.product.price * item.quantity
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, "") // Raqamlardan boshqa hamma narsani olib tashlash
    let formattedInput = "+998"

    if (input.length > 3) {
      formattedInput += " " + input.substring(3, 5)
    }
    if (input.length > 5) {
      formattedInput += " " + input.substring(5, 8)
    }
    if (input.length > 8) {
      formattedInput += " " + input.substring(8, 10)
    }
    if (input.length > 10) {
      formattedInput += " " + input.substring(10, 12)
    }
    setCustomerPhone(formattedInput)
  }

  const handleSubmitOrder = async () => {
    if (!user || items.length === 0) return

    const [firstName, ...lastNameParts] = customerName.trim().split(" ")
    const lastName = lastNameParts.join(" ")

    if (!firstName.trim() || !customerPhone.trim()) {
      alert("Iltimos, ism va telefon raqamini kiriting")
      return
    }

    // Telefon raqami formatini tekshirish
    const phoneRegex = /^\+998 \d{2} \d{3} \d{2} \d{2}$/
    if (!phoneRegex.test(customerPhone)) {
      alert("Iltimos, telefon raqamini to'g'ri formatda kiriting: +998 XX YYY YY YY")
      return
    }

    if (deliveryWithService && deliverySummary?.has_delivery_products && !deliveryAddress.trim()) {
      alert("Yetkazib berish uchun manzil kiriting")
      return
    }

    if (!deliveryWithService && hasDeliveryItems) {
      const companyAddressText = companyInfo?.address || "Kompaniya manzili"
      alert(
        `Diqqat! Siz yetkazib berish xizmatini tanlamadingiz. Siz o'zingiz ${companyAddressText} ga telefoningiz bilan borib mahsulotingizni olib kelishingiz mumkin va o'zingiz bilan mahsulot pulini ham olib boring.`,
      )
    }

    setIsSubmitting(true)

    try {
      // Foydalanuvchi ma'lumotlarini yangilash
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          first_name: firstName,
          last_name: lastName || null,
          phone_number: customerPhone.trim(),
        })
        .eq("id", user.id)

      if (userUpdateError) throw userUpdateError

      const orderNumber = generateOrderNumber()
      const finalDeliveryFee =
        deliveryWithService && deliveryInfo?.has_delivery_items ? deliveryInfo?.final_delivery_fee || 0 : 0
      const finalAddress =
        deliveryWithService && deliverySummary?.has_delivery_products
          ? deliveryAddress.trim()
          : `O'zim olib ketaman: ${companyInfo?.address || "Kompaniya manzili"}`

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          delivery_address: finalAddress,
          address_id: selectedAddressId,
          delivery_with_service: deliveryWithService && deliverySummary?.has_delivery_products,
          subtotal: totalPrice,
          delivery_fee: finalDeliveryFee,
          total_amount: totalPrice + finalDeliveryFee,
          notes: notes.trim() || null,
          status: "pending",
          customer_location: customerLocation ? JSON.stringify(customerLocation) : null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = items.map((item) => {
        const variations = item.variations ? JSON.stringify(item.variations) : null

        return {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: calculateItemTotal(item),
          variations: variations,
          rental_duration: item.rental_duration,
          rental_time_unit: item.rental_time_unit,
        }
      })

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) throw itemsError

      await clearCart()

      alert("Buyurtma muvaffaqiyatli berildi! Tez orada aloqaga chiqamiz.")
      router.push("/orders")
    } catch (error) {
      console.error("Buyurtma berishda xatolik:", error)
      alert("Buyurtma berishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4 flex items-center justify-center flex-col">
        <TopBar />
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Yuklanmoqda...</p>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  if (items.length === 0) {
    router.push("/")
    return null
  }

  const hasDeliveryItems = items.some((item) => item.product.has_delivery)
  const hasNonDeliveryItems = items.some((item) => !item.product.has_delivery)

  const currentDeliveryFee =
    deliveryWithService && hasDeliveryItems
      ? deliveryInfo?.delivery_discount > 0
        ? 0
        : deliveryInfo?.final_delivery_fee || 0
      : 0

  const currentGrandTotal = totalPrice + currentDeliveryFee

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      <div className="container mx-auto px-4 py-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Buyurtma berish</h1>
            <p className="text-sm text-muted-foreground">{items.length} ta mahsulot</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Order Items */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-semibold mb-4">Buyurtma tarkibi</h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex space-x-3 items-center animate-slideInUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                    {item.product.images?.[0] ? (
                      <Image
                        src={item.product.images[0] || "/placeholder.svg"}
                        alt={item.product.name_uz}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="48px"
                        className="transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted-foreground/20 flex items-center justify-center text-xs text-muted">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-1">{item.product.name_uz}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} {item.product.unit} × {formatPrice(item.product.price)} so'm
                        {item.product.product_type === "rental" && item.rental_duration && (
                          <span className="block">
                            {item.rental_duration}{" "}
                            {item.rental_time_unit === "hour"
                              ? "soat"
                              : item.rental_time_unit === "day"
                                ? "kun"
                                : item.rental_time_unit === "week"
                                  ? "hafta"
                                  : "oy"}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold">{formatPrice(calculateItemTotal(item))} so'm</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              Buyurtmachi ma'lumotlari
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium mb-2 text-foreground">
                  Ism-familiya *
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all placeholder:text-muted-foreground"
                  placeholder="Ism-familiyangizni kiriting"
                />
              </div>
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium mb-2 text-foreground">
                  Telefon raqam *
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all placeholder:text-muted-foreground"
                  placeholder="+998 90 123 45 67"
                  pattern="^\+998 \d{2} \d{3} \d{2} \d{2}$"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-semibold mb-4">Qo'shimcha izoh</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all resize-none placeholder:text-muted-foreground"
              placeholder="Buyurtma haqida qo'shimcha ma'lumot (ixtiyoriy)"
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Delivery Summary */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-primary" />
              Yetkazib berish ma'lumotlari
            </h3>

            {/* Products with delivery */}
            {hasDeliveryItems && (
              <div className="mb-4">
                <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                  Yetkazib berish mavjud mahsulotlar:
                </h4>
                <div className="space-y-2">
                  {items
                    .filter((item) => item.product.has_delivery)
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm bg-green-50 dark:bg-gray-800 p-2 rounded text-gray-800 dark:text-gray-200"
                      >
                        <span>
                          {item.product.name_uz} ({item.quantity} ta)
                        </span>
                        <span className="font-medium">{formatPrice(item.product.delivery_price)} so'm</span>
                      </div>
                    ))}
                </div>

                {/* Free delivery notification */}
                {deliveryInfo && deliveryInfo.cart_total >= deliveryInfo.free_delivery_threshold && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-gray-900 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 mb-1">
                      <span className="text-sm font-medium">🎉 Yetkazib berish tekin!</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      Siz {formatPrice(deliveryInfo.free_delivery_threshold)} so'mdan yuqori mahsulot olyapsiz
                    </p>
                  </div>
                )}

                {/* Delivery service option */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-gray-900 rounded-lg shadow-sm">
                  <button
                    onClick={() => setDeliveryWithService(!deliveryWithService)}
                    className="flex items-center space-x-3 w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg p-1 -m-1 transition-all"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        deliveryWithService ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {deliveryWithService && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 text-gray-800 dark:text-gray-200">
                      <span className="font-medium">Yetkazib berish xizmatini qo'shish</span>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        {deliveryInfo && deliveryWithService && deliveryInfo.delivery_discount > 0 ? (
                          <span>
                            <span className="line-through">{formatPrice(deliveryInfo.original_delivery_fee)} so'm</span>
                            <span className="ml-2 text-green-600 dark:text-green-400 font-medium">0 so'm</span>
                            <span className="ml-1 text-green-600 dark:text-green-400">
                              (-{deliveryInfo.discount_percentage}% chegirma)
                            </span>
                          </span>
                        ) : (
                          `Narx: ${formatPrice(deliveryInfo?.original_delivery_fee || 0)} so'm`
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Products without delivery */}
            {hasNonDeliveryItems && (
              <div className="mb-4">
                <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Yetkazib berish mavjud emas:</h4>
                <div className="space-y-2">
                  {items
                    .filter((item) => !item.product.has_delivery)
                    .map((item, index) => (
                      <div
                        key={index}
                        className="text-sm bg-orange-50 dark:bg-gray-800 p-2 rounded text-gray-800 dark:text-gray-200"
                      >
                        {item.product.name_uz} ({item.quantity} ta)
                      </div>
                    ))}
                </div>
                <div className="mt-2 p-3 bg-orange-100 dark:bg-gray-900 rounded-lg shadow-sm">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        Bu mahsulotlarni o'zingiz olib ketishingiz kerak
                      </p>
                      <p className="text-orange-700 dark:text-orange-300 mt-1">
                        Manzil: {companyInfo?.address || "Kompaniya manzili"}
                      </p>
                      <p className="text-orange-700 dark:text-orange-300 mt-1">
                        O'zingiz bilan ID kodingiz va telegramingiz orqali tasdiqlash uchun telefoningizni ham olib
                        keling.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address input for delivery */}
            {deliveryWithService && hasDeliveryItems && (
              <div className="mt-4">
                <h4 className="font-medium mb-3">Yetkazib berish manzili</h4>

                {addresses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-foreground">Saqlangan manzillar</label>
                    <div className="grid grid-cols-1 gap-3">
                      {addresses.map((address) => (
                        <button
                          key={address.id}
                          onClick={() => handleAddressSelect(address.id)}
                          className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                            selectedAddressId === address.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border bg-muted/50 hover:border-primary/50"
                          } focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        >
                          <div className="flex items-start">
                            <div className="mr-3">
                              <Home
                                className={`w-5 h-5 ${selectedAddressId === address.id ? "text-primary" : "text-muted-foreground"}`}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{address.name}</span>
                                {selectedAddressId === address.id && (
                                  <Check className="w-4 h-4 text-primary animate-scaleIn" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{address.address}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!showAddressForm ? (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center space-x-2 text-primary hover:text-primary/80 mb-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md p-1 -m-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yangi manzil qo'shish</span>
                  </button>
                ) : (
                  <div className="bg-muted/30 dark:bg-gray-800 p-4 rounded-lg mb-4 shadow-inner animate-fadeIn">
                    <h4 className="font-medium mb-3 text-foreground">Yangi manzil</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-1 text-foreground">Manzil nomi *</label>
                        <input
                          type="text"
                          value={newAddressName}
                          onChange={(e) => setNewAddressName(e.target.value)}
                          className="w-full px-3 py-2 bg-background rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                          placeholder="Masalan: Uy, Ish"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-foreground">To'liq manzil *</label>
                        <textarea
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-background rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none placeholder:text-muted-foreground"
                          placeholder="To'liq manzilni kiriting"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowAddressForm(false)}
                          className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors duration-200"
                        >
                          Bekor qilish
                        </button>
                        <button
                          onClick={handleAddNewAddress}
                          disabled={!newAddressName.trim() || !newAddress.trim()}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
                        >
                          Saqlash
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {addresses.length === 0 && !showAddressForm && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Yetkazib berish manzili *</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all resize-none placeholder:text-muted-foreground"
                      placeholder="To'liq manzilni kiriting"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm animate-fadeIn">
            <h3 className="text-lg font-semibold mb-4">To'lov xulosasi</h3>
            <div className="space-y-3 text-foreground">
              <div className="flex justify-between">
                <span>Mahsulotlar:</span>
                <span className="font-medium">{formatPrice(totalPrice)} so'm</span>
              </div>

              <div className="flex justify-between">
                <span>Yetkazib berish:</span>
                <div className="text-right">
                  {hasDeliveryItems ? (
                    deliveryWithService ? (
                      deliveryInfo && deliveryInfo.delivery_discount > 0 ? (
                        <div>
                          <span className="line-through text-muted-foreground text-sm">
                            {formatPrice(deliveryInfo.original_delivery_fee)} so'm
                          </span>
                          <span className="ml-2 text-green-600 font-medium">0 so'm</span>
                          <div className="text-xs text-green-600">-{deliveryInfo.discount_percentage}% chegirma</div>
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(currentDeliveryFee)} so'm</span>
                      )
                    ) : (
                      <span className="text-red-600 font-medium">Yetkazib berish tanlanmagan</span>
                    )
                  ) : (
                    <span className="text-red-600 font-medium">Yetkazib berish mavjud emas</span>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold">Jami to'lov:</span>
                  <span className="text-lg font-bold text-primary">{formatPrice(currentGrandTotal)} so'm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            onClick={handleSubmitOrder}
            disabled={
              isSubmitting ||
              !customerName.trim() ||
              !customerPhone.trim() ||
              !/^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(customerPhone)
            }
            className="w-full bg-primary text-primary-foreground rounded-lg py-4 font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] animate-pulseOnLoad"
          >
            {isSubmitting ? "Buyurtma berilmoqda..." : "Buyurtmani tasdiqlash"}
          </button>
        </div>
      </div>

      <BottomNavigation />
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseOnLoad {
            0% { transform: scale(1); box-shadow: 0 0 0 rgba(var(--primary-rgb), 0.4); }
            50% { transform: scale(1.01); box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.6); }
            100% { transform: scale(1); box-shadow: 0 0 0 rgba(var(--primary-rgb), 0.4); }
        }

        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideInUp { animation: slideInUp 0.4s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
        .animate-pulseOnLoad { animation: pulseOnLoad 2s infinite ease-in-out; }

        /* Custom properties for primary color if not defined by Tailwind config */
        :root {
          --primary-rgb: 79, 70, 229; /* Example for indigo-600, adjust to your theme's primary color */
        }
      `}</style>
    </div>
  )
}
