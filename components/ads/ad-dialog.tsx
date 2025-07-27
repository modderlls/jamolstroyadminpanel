"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { X, ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface AdDialogProps {
  ad?: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AdDialog({ ad, open, onOpenChange, onSaved }: AdDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    image_url: "",
    link: "",
    is_active: true,
    sort_order: 0,
  })
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  useEffect(() => {
    if (ad) {
      setFormData({
        name: ad.name || "",
        image_url: ad.image_url || "",
        link: ad.link || "",
        is_active: ad.is_active ?? true,
        sort_order: ad.sort_order || 0,
      })
      setImagePreview(ad.image_url || "")
    } else {
      setFormData({
        name: "",
        image_url: "",
        link: "",
        is_active: true,
        sort_order: 0,
      })
      setImagePreview("")
    }
    setImageFile(null)
  }, [ad, open])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
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

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = formData.image_url

      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const adData = {
        ...formData,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      }

      if (ad) {
        const { error } = await supabase.from("ads").update(adData).eq("id", ad.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("ads").insert([
          {
            ...adData,
            created_at: new Date().toISOString(),
          },
        ])

        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving ad:", error)
      alert("Reklamani saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ad ? "Reklamani tahrirlash" : "Yangi reklama qo'shish"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Reklama nomi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Reklama nomini kiriting"
                  required
                />
              </div>

              <div>
                <Label htmlFor="link">Havola (URL)</Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="sort_order">Tartib raqami</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sort_order: Number.parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Faol</Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Reklama rasmi *</Label>
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    {imagePreview ? (
                      <div className="relative">
                        <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                          <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImagePreview("")
                            setImageFile(null)
                            setFormData((prev) => ({ ...prev, image_url: "" }))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Rasm yuklash uchun bosing yoki shu yerga tashlang
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (max 5MB)</p>
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading || !formData.name || (!imagePreview && !formData.image_url)}>
              {loading ? "Saqlanmoqda..." : ad ? "Yangilash" : "Qo'shish"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
