"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Edit, Plus, MapPin, Home, Building } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNavigation } from "@/components/layout/bottom-navigation"

interface Address {
  id: string
  title: string
  full_address: string
  region: string
  district: string
  street: string
  house_number: string
  apartment_number?: string
  postal_code?: string
  is_default: boolean
  address_type: "home" | "work" | "other"
  created_at: string
}

const regions = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog'iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
]

export default function AddressesPage() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    full_address: "",
    region: "",
    district: "",
    street: "",
    house_number: "",
    apartment_number: "",
    postal_code: "",
    address_type: "home" as "home" | "work" | "other",
    is_default: false,
  })

  useEffect(() => {
    if (user) {
      fetchAddresses()
    }
  }, [user])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user?.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error("Error fetching addresses:", error)
      toast({
        title: "Xatolik",
        description: "Manzillarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Validate required fields
    if (
      !formData.title?.trim() ||
      !formData.region?.trim() ||
      !formData.district?.trim() ||
      !formData.street?.trim() ||
      !formData.house_number?.trim()
    ) {
      toast({
        title: "Xatolik",
        description: "Barcha majburiy maydonlarni to'ldiring",
        variant: "destructive",
      })
      return
    }

    try {
      const addressData = {
        user_id: user.id,
        title: formData.title.trim(),
        full_address: `${formData.region}, ${formData.district}, ${formData.street}, ${formData.house_number}${formData.apartment_number ? ", " + formData.apartment_number : ""}`,
        region: formData.region.trim(),
        district: formData.district.trim(),
        street: formData.street.trim(),
        house_number: formData.house_number.trim(),
        apartment_number: formData.apartment_number?.trim() || null,
        postal_code: formData.postal_code?.trim() || null,
        address_type: formData.address_type,
        is_default: formData.is_default,
      }

      if (editingAddress) {
        const { error } = await supabase
          .from("user_addresses")
          .update(addressData)
          .eq("id", editingAddress.id)
          .eq("user_id", user.id)

        if (error) throw error

        toast({
          title: "Muvaffaqiyat",
          description: "Manzil muvaffaqiyatli yangilandi",
        })
      } else {
        // If this is set as default, unset other defaults first
        if (formData.is_default) {
          await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id)
        }

        const { error } = await supabase.from("user_addresses").insert(addressData)

        if (error) throw error

        toast({
          title: "Muvaffaqiyat",
          description: "Manzil muvaffaqiyatli qo'shildi",
        })
      }

      setIsDialogOpen(false)
      resetForm()
      fetchAddresses()
    } catch (error) {
      console.error("Error saving address:", error)
      toast({
        title: "Xatolik",
        description: "Manzilni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("user_addresses").delete().eq("id", addressId).eq("user_id", user.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyat",
        description: "Manzil muvaffaqiyatli o'chirildi",
      })

      fetchAddresses()
    } catch (error) {
      console.error("Error deleting address:", error)
      toast({
        title: "Xatolik",
        description: "Manzilni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleSetDefault = async (addressId: string) => {
    if (!user) return

    try {
      // First unset all defaults
      await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id)

      // Then set the selected one as default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", user.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyat",
        description: "Asosiy manzil o'zgartirildi",
      })

      fetchAddresses()
    } catch (error) {
      console.error("Error setting default address:", error)
      toast({
        title: "Xatolik",
        description: "Asosiy manzilni o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      full_address: "",
      region: "",
      district: "",
      street: "",
      house_number: "",
      apartment_number: "",
      postal_code: "",
      address_type: "home",
      is_default: false,
    })
    setEditingAddress(null)
  }

  const openEditDialog = (address: Address) => {
    setEditingAddress(address)
    setFormData({
      title: address.title || "",
      full_address: address.full_address || "",
      region: address.region || "",
      district: address.district || "",
      street: address.street || "",
      house_number: address.house_number || "",
      apartment_number: address.apartment_number || "",
      postal_code: address.postal_code || "",
      address_type: address.address_type || "home",
      is_default: address.is_default || false,
    })
    setIsDialogOpen(true)
  }

  const getAddressIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="w-4 h-4" />
      case "work":
        return <Building className="w-4 h-4" />
      default:
        return <MapPin className="w-4 h-4" />
    }
  }

  const getAddressTypeLabel = (type: string) => {
    switch (type) {
      case "home":
        return "Uy"
      case "work":
        return "Ish"
      default:
        return "Boshqa"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="container mx-auto px-4 py-6 pb-20">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Manzillarim</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Yangi manzil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAddress ? "Manzilni tahrirlash" : "Yangi manzil qo'shish"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Manzil nomi *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Masalan: Uyim, Ishim"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address_type">Manzil turi</Label>
                  <Select
                    value={formData.address_type}
                    onValueChange={(value: "home" | "work" | "other") =>
                      setFormData((prev) => ({ ...prev, address_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Uy</SelectItem>
                      <SelectItem value="work">Ish</SelectItem>
                      <SelectItem value="other">Boshqa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="region">Viloyat/Shahar *</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Viloyatni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="district">Tuman/Shahar *</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="Tuman yoki shahar nomi"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="street">Ko'cha *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
                    placeholder="Ko'cha nomi"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="house_number">Uy raqami *</Label>
                    <Input
                      id="house_number"
                      value={formData.house_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, house_number: e.target.value }))}
                      placeholder="12A"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="apartment_number">Xonadon raqami</Label>
                    <Input
                      id="apartment_number"
                      value={formData.apartment_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, apartment_number: e.target.value }))}
                      placeholder="45"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="postal_code">Pochta indeksi</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="100000"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="is_default">Asosiy manzil sifatida belgilash</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingAddress ? "Yangilash" : "Qo'shish"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Bekor qilish
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {addresses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Manzillar yo'q</h3>
              <p className="text-muted-foreground mb-4">Buyurtma berish uchun manzil qo'shing</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Birinchi manzilni qo'shish
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id} className={address.is_default ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getAddressIcon(address.address_type)}
                      <CardTitle className="text-lg">{address.title}</CardTitle>
                      {address.is_default && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">Asosiy</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(address)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(address.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{address.full_address}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{getAddressTypeLabel(address.address_type)}</span>
                    {!address.is_default && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(address.id)}>
                        Asosiy qilish
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
