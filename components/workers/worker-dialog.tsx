"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface Worker {
  id?: string
  first_name: string
  last_name: string
  profession_uz: string
  profession_ru?: string
  profession_en?: string
  phone_number: string
  experience_years: number
  hourly_rate: number
  daily_rate: number
  rating: number
  is_available: boolean
  location: string
  description_uz?: string
  description_ru?: string
  description_en?: string
  skills?: string[]
  portfolio_images?: string[]
  created_at?: string
  updated_at?: string
}

interface WorkerDialogProps {
  worker?: Worker
  onSave: () => void
  trigger?: React.ReactNode
}

export function WorkerDialog({ worker, onSave, trigger }: WorkerDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<Worker>({
    first_name: "",
    last_name: "",
    profession_uz: "",
    profession_ru: "",
    profession_en: "",
    phone_number: "",
    experience_years: 0,
    hourly_rate: 0,
    daily_rate: 0,
    rating: 0,
    is_available: true,
    location: "",
    description_uz: "",
    description_ru: "",
    description_en: "",
    skills: [],
    portfolio_images: [],
  })

  useEffect(() => {
    if (worker) {
      setFormData({
        ...worker,
        skills: worker.skills || [],
        portfolio_images: worker.portfolio_images || [],
      })
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        profession_uz: "",
        profession_ru: "",
        profession_en: "",
        phone_number: "",
        experience_years: 0,
        hourly_rate: 0,
        daily_rate: 0,
        rating: 0,
        is_available: true,
        location: "",
        description_uz: "",
        description_ru: "",
        description_en: "",
        skills: [],
        portfolio_images: [],
      })
    }
  }, [worker, open])

  const handleInputChange = (field: keyof Worker, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSkillsChange = (skillsText: string) => {
    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
    setFormData((prev) => ({
      ...prev,
      skills,
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop()
        const fileName = `workers/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

        const { data, error } = await supabase.storage.from("products").upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

        if (error) throw error

        const {
          data: { publicUrl },
        } = supabase.storage.from("products").getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }

      setFormData((prev) => ({
        ...prev,
        portfolio_images: [...(prev.portfolio_images || []), ...uploadedUrls],
      }))

      toast.success("Rasmlar muvaffaqiyatli yuklandi")
    } catch (error) {
      console.error("Error uploading images:", error)
      toast.error("Rasmlarni yuklashda xatolik yuz berdi")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      portfolio_images: prev.portfolio_images?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.profession_uz) {
      toast.error("Ism, familiya va kasbni to'ldiring")
      return
    }

    setLoading(true)
    try {
      const saveData = {
        ...formData,
        updated_at: new Date().toISOString(),
      }

      if (worker?.id) {
        // Update existing worker
        const { error } = await supabase.from("workers").update(saveData).eq("id", worker.id)
        if (error) throw error
      } else {
        // Create new worker
        const newWorkerData = {
          ...saveData,
          created_at: new Date().toISOString(),
        }
        const { error } = await supabase.from("workers").insert([newWorkerData])
        if (error) throw error
      }

      toast.success(worker ? "Ishchi yangilandi" : "Ishchi qo'shildi")
      onSave()
      setOpen(false)
    } catch (error) {
      console.error("Error saving worker:", error)
      toast.error("Ishchini saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="ios-button">
            <Plus className="h-4 w-4 mr-2" />
            Yangi ishchi
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {worker ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {worker ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
          </DialogTitle>
          <DialogDescription>
            {worker ? "Mavjud ishchi ma'lumotlarini tahrirlang" : "Yangi ishchi ma'lumotlarini kiriting"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Asosiy ma'lumotlar</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Ism *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Ism"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Familiya *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Familiya"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession_uz">Kasb (O'zbek) *</Label>
              <Input
                id="profession_uz"
                value={formData.profession_uz}
                onChange={(e) => handleInputChange("profession_uz", e.target.value)}
                placeholder="Masalan: Qurilish ustasi"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profession_ru">Kasb (Rus)</Label>
                <Input
                  id="profession_ru"
                  value={formData.profession_ru || ""}
                  onChange={(e) => handleInputChange("profession_ru", e.target.value)}
                  placeholder="Например: Строитель"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession_en">Kasb (Ingliz)</Label>
                <Input
                  id="profession_en"
                  value={formData.profession_en || ""}
                  onChange={(e) => handleInputChange("profession_en", e.target.value)}
                  placeholder="Example: Builder"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Telefon raqami</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange("phone_number", e.target.value)}
                placeholder="+998901234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Manzil</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Toshkent, Chilonzor tumani"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => handleInputChange("is_available", checked)}
              />
              <Label htmlFor="is_available">Hozir mavjud</Label>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Professional ma'lumotlar</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience_years">Tajriba (yil)</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange("experience_years", Number.parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Reyting (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => handleInputChange("rating", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Soatlik narx (so'm)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange("hourly_rate", Number.parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_rate">Kunlik narx (so'm)</Label>
                <Input
                  id="daily_rate"
                  type="number"
                  min="0"
                  value={formData.daily_rate}
                  onChange={(e) => handleInputChange("daily_rate", Number.parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Ko'nikmalar (vergul bilan ajrating)</Label>
              <Input
                id="skills"
                value={formData.skills?.join(", ") || ""}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="Qurilish, Ta'mirlash, Elektr ishlari"
              />
              {formData.skills && formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Descriptions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description_uz">Tavsif (O'zbek)</Label>
                <Textarea
                  id="description_uz"
                  value={formData.description_uz || ""}
                  onChange={(e) => handleInputChange("description_uz", e.target.value)}
                  placeholder="Ishchi haqida qisqacha ma'lumot..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_ru">Tavsif (Rus)</Label>
                <Textarea
                  id="description_ru"
                  value={formData.description_ru || ""}
                  onChange={(e) => handleInputChange("description_ru", e.target.value)}
                  placeholder="Краткая информация о работнике..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Images */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Portfolio rasmlari</h3>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="portfolio-upload"
                disabled={uploading}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("portfolio-upload")?.click()}
                disabled={uploading}
                className="ios-button bg-transparent"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Rasm qo'shish
                  </>
                )}
              </Button>
            </div>

            {formData.portfolio_images && formData.portfolio_images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.portfolio_images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`Portfolio ${index + 1}`}
                        width={200}
                        height={200}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} className="ios-button bg-transparent">
            Bekor qilish
          </Button>
          <Button onClick={handleSave} disabled={loading} className="ios-button">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Saqlash
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
