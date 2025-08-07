"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, Loader2, Upload, Trash2, Router } from "lucide-react"
import Image from "next/image"

interface Ad {
  id?: string
  name: string
  image_url: string
  link: string
  is_active: boolean
  click_count: number
  sort_order: number
  created_at?: string
  updated_at?: string
}

interface AdDialogProps {
  ad?: Ad
  onSave: () => void
  trigger?: React.ReactNode
}

export function AdDialog({ ad, onSave, trigger }: AdDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<Ad>({
    name: "",
    image_url: "",
    link: "",
    is_active: true,
    click_count: 0,
    sort_order: 0,
  })

  useEffect(() => {
    if (ad) {
      setFormData(ad)
    } else {
      setFormData({
        name: "",
        image_url: "",
        link: "",
        is_active: true,
        click_count: 0,
        sort_order: 0,
      })
    }
  }, [ad, open])

  const handleInputChange = (field: keyof Ad, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
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
      alert("Rasmni yuklashda xatolik yuz berdi")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image_url: "",
    }))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.image_url) {
      alert("Reklama nomi va rasmini to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const saveData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      let result; // Natijani saqlash uchun o'zgaruvchi

      if (ad?.id) {
        // Mavjud reklamani yangilash
        result = await supabase.from("ads").update(saveData).eq("id", ad.id);
      } else {
        // Yangi reklama yaratish
        saveData.created_at = new Date().toISOString();
        result = await supabase.from("ads").insert([saveData]);
      }

      // Supabase chaqiruvidan qaytgan 'error' obyektini tekshirish
      if (result.error) {
        // Agar haqiqiy xatolik bo'lsa, uni tashla
        throw result.error;
      }

      // Agar xatolik bo'lmasa (yoki error null bo'lsa), muvaffaqiyatli bajarildi
      window.location.reload();
      setOpen(false);
    } catch (error) {
      console.error("Reklamani saqlashda xatolik yuz berdi:", error);
      // Foydalanuvchiga aniqroq xatolik xabarini ko'rsating
      alert(`Reklamani saqlashda xatolik yuz berdi: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="ios-button">
            <Plus className="h-4 w-4 mr-2" />
            Yangi reklama
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ad ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {ad ? "Reklamani tahrirlash" : "Yangi reklama qo'shish"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Reklama nomi *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Reklama nomi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Havola (URL)</Label>
              <Input
                id="link"
                value={formData.link}
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
                  disabled={!ad?.id}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Faol</Label>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Reklama rasmi *</Label>

            {formData.image_url ? (
              <div className="relative">
                <div className="aspect-[5/1] rounded-lg overflow-hidden border bg-muted">
                  <Image
                    src={formData.image_url || "/placeholder.svg"}
                    alt={formData.name}
                    width={90}
                    height={30}
                    className="object-cover w-full h-full"
                  />
                </div>
                <Button variant="destructive" size="sm" onClick={removeImage} className="absolute top-2 right-2">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  )}
                  <p className="text-lg font-medium mt-4">
                    {uploading ? "Yuklanmoqda..." : "Rasm yuklash uchun bosing"}
                  </p>
                  <p className="text-sm text-muted-foreground">PNG, JPG, GIF (max 5MB)</p>
                </label>
              </div>
            )}
          </div>

          {/* Preview */}
          
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
