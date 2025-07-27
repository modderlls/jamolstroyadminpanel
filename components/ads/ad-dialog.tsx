"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Megaphone, Upload, X, Loader2, Save, LinkIcon, ImageIcon } from "lucide-react"
import Image from "next/image"

interface Ad {
  id?: string
  name: string
  image_url: string
  link?: string
  is_active: boolean
  click_count: number
  sort_order: number
}

interface AdDialogProps {
  ad?: Ad | null
  onClose: () => void
  onSaved: () => void
}

export function AdDialog({ ad, onClose, onSaved }: AdDialogProps) {
  const [formData, setFormData] = useState<Ad>({
    name: "",
    image_url: "",
    link: "",
    is_active: true,
    click_count: 0,
    sort_order: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (ad) {
      setFormData(ad)
    }
  }, [ad])

  const handleInputChange = (field: keyof Ad, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `ads/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage.from("products").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(fileName)

      setFormData((prev) => ({
        ...prev,
        image_url: publicUrl,
      }))
    } catch (error) {
      console.error("Error uploading image:", error)
      setError("Rasmni yuklashda xatolik yuz berdi")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error("Reklama nomi majburiy")
      }
      if (!formData.image_url.trim()) {
        throw new Error("Reklama rasmi majburiy")
      }

      const adData = {
        name: formData.name.trim(),
        image_url: formData.image_url.trim(),
        link: formData.link?.trim() || null,
        is_active: formData.is_active,
        click_count: formData.click_count,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString(),
      }

      if (ad?.id) {
        // Update existing ad
        const { error } = await supabase.from("ads").update(adData).eq("id", ad.id)
        if (error) throw error
      } else {
        // Create new ad
        const { error } = await supabase.from("ads").insert([adData])
        if (error) throw error
      }

      onSaved()
    } catch (error: any) {
      console.error("Error saving ad:", error)
      setError(error.message || "Reklamani saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {ad ? "Reklamani tahrirlash" : "Yangi reklama qo'shish"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Asosiy ma'lumotlar
              </h3>

              <div className="space-y-2">
                <Label htmlFor="name">Reklama nomi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Reklama nomi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">Havola (ixtiyoriy)</Label>
                <Input
                  id="link"
                  value={formData.link || ""}
                  onChange={(e) => handleInputChange("link", e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Tartib raqami</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => handleInputChange("sort_order", Number.parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="click_count">Bosilishlar soni</Label>
                  <Input
                    id="click_count"
                    type="number"
                    min="0"
                    value={formData.click_count}
                    onChange={(e) => handleInputChange("click_count", Number.parseInt(e.target.value) || 0)}
                    placeholder="0"
                    disabled={!ad} // Only allow editing for existing ads
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Faol</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Reklama rasmi *
              </h3>

              {formData.image_url ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={formData.image_url || "/placeholder.svg"}
                        alt="Reklama rasmi"
                        width={600}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-2 hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">Rasm URL manzili</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => handleInputChange("image_url", e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer">
                    {uploadingImage ? (
                      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    )}
                    <p className="text-lg font-medium mt-4">
                      {uploadingImage ? "Yuklanmoqda..." : "Rasm yuklash uchun bosing"}
                    </p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, JPEG formatida</p>
                  </label>
                </div>
              )}

              {!formData.image_url && (
                <div className="space-y-2">
                  <Label htmlFor="image_url_manual">Yoki rasm URL manzilini kiriting</Label>
                  <Input
                    id="image_url_manual"
                    value={formData.image_url}
                    onChange={(e) => handleInputChange("image_url", e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          {formData.image_url && (
            <Card className="ios-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Ko'rinish</h3>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{formData.name || "Reklama nomi"}</h4>
                    <div className="flex items-center gap-2">
                      {formData.is_active ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Faol</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Nofaol</span>
                      )}
                    </div>
                  </div>
                  <div className="aspect-video rounded overflow-hidden bg-background">
                    <Image
                      src={formData.image_url || "/placeholder.svg"}
                      alt="Preview"
                      width={400}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {formData.link && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <LinkIcon className="h-3 w-3" />
                      <span className="truncate">{formData.link}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 ios-button bg-transparent">
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading || !formData.image_url} className="flex-1 ios-button">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {ad ? "Yangilash" : "Saqlash"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
