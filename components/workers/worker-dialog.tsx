"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { User, Briefcase, Upload, X, Loader2, Save } from "lucide-react"
import Image from "next/image"

interface Worker {
  id?: string
  first_name: string
  last_name: string
  profession_uz: string
  phone_number: string
  experience_years: number
  hourly_rate: number
  daily_rate: number
  rating: number
  is_available: boolean
  location: string
  description_uz?: string
  skills?: string[]
  portfolio_images?: string[]
}

interface WorkerDialogProps {
  worker?: Worker | null
  onClose: () => void
  onSaved: () => void
}

export function WorkerDialog({ worker, onClose, onSaved }: WorkerDialogProps) {
  const [formData, setFormData] = useState<Worker>({
    first_name: "",
    last_name: "",
    profession_uz: "",
    phone_number: "",
    experience_years: 0,
    hourly_rate: 0,
    daily_rate: 0,
    rating: 0,
    is_available: true,
    location: "",
    description_uz: "",
    skills: [],
    portfolio_images: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploadingImages, setUploadingImages] = useState(false)
  const [newSkill, setNewSkill] = useState("")

  useEffect(() => {
    if (worker) {
      setFormData({
        ...worker,
        skills: worker.skills || [],
        portfolio_images: worker.portfolio_images || [],
      })
    }
  }, [worker])

  const handleInputChange = (field: keyof Worker, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
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
    } catch (error) {
      console.error("Error uploading images:", error)
      setError("Rasmlarni yuklashda xatolik yuz berdi")
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      portfolio_images: prev.portfolio_images?.filter((_, i) => i !== index) || [],
    }))
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills?.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills?.filter((skill) => skill !== skillToRemove) || [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validation
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error("Ism va familiya majburiy")
      }
      if (!formData.profession_uz.trim()) {
        throw new Error("Kasb majburiy")
      }
      if (!formData.phone_number.trim()) {
        throw new Error("Telefon raqami majburiy")
      }

      const workerData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        profession_uz: formData.profession_uz.trim(),
        phone_number: formData.phone_number.trim(),
        experience_years: formData.experience_years,
        hourly_rate: formData.hourly_rate,
        daily_rate: formData.daily_rate,
        rating: formData.rating,
        is_available: formData.is_available,
        location: formData.location.trim(),
        description_uz: formData.description_uz?.trim() || null,
        skills: formData.skills || [],
        portfolio_images: formData.portfolio_images || [],
        updated_at: new Date().toISOString(),
      }

      if (worker?.id) {
        // Update existing worker
        const { error } = await supabase.from("workers").update(workerData).eq("id", worker.id)
        if (error) throw error
      } else {
        // Create new worker
        const { error } = await supabase.from("workers").insert([workerData])
        if (error) throw error
      }

      onSaved()
    } catch (error: any) {
      console.error("Error saving worker:", error)
      setError(error.message || "Ustani saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {worker ? "Ustani tahrirlash" : "Yangi usta qo'shish"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="ios-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Asosiy ma'lumotlar
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Ism *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      placeholder="Ism"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Familiya *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      placeholder="Familiya"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession_uz">Kasb *</Label>
                  <Input
                    id="profession_uz"
                    value={formData.profession_uz}
                    onChange={(e) => handleInputChange("profession_uz", e.target.value)}
                    placeholder="Masalan: Qurilish ustasi"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Telefon raqami *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                    placeholder="+998901234567"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Manzil</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Toshkent shahar"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_available">Mavjud</Label>
                  <Switch
                    id="is_available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => handleInputChange("is_available", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card className="ios-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Professional ma'lumotlar
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="experience_years">Tajriba (yil)</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => handleInputChange("experience_years", Number.parseInt(e.target.value) || 0)}
                    placeholder="5"
                  />
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
                      placeholder="50000"
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
                      placeholder="400000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Reyting (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => handleInputChange("rating", Number.parseFloat(e.target.value) || 0)}
                    placeholder="4.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_uz">Tavsif</Label>
                  <Textarea
                    id="description_uz"
                    value={formData.description_uz || ""}
                    onChange={(e) => handleInputChange("description_uz", e.target.value)}
                    placeholder="Usta haqida qo'shimcha ma'lumot..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Ko'nikmalar</h3>

              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Yangi ko'nikma qo'shish..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                />
                <Button type="button" onClick={addSkill} variant="outline" className="ios-button bg-transparent">
                  Qo'shish
                </Button>
              </div>

              {formData.skills && formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Images */}
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Portfolio rasmlari</h3>

              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="portfolio-upload"
                  disabled={uploadingImages}
                />
                <label htmlFor="portfolio-upload" className="flex flex-col items-center justify-center cursor-pointer">
                  {uploadingImages ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mt-2">
                    {uploadingImages ? "Yuklanmoqda..." : "Rasmlarni yuklash uchun bosing"}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, JPEG formatida</p>
                </label>
              </div>

              {formData.portfolio_images && formData.portfolio_images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.portfolio_images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`Portfolio ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 ios-button bg-transparent">
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 ios-button">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {worker ? "Yangilash" : "Saqlash"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
