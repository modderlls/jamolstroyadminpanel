"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { CategorySelector } from "@/components/categories/category-selector"

interface Product {
  id: string
  name_uz: string
  name_ru: string
  description_uz: string
  description_ru: string
  price: number
  unit: string
  stock_quantity: number
  images: string[]
  is_available: boolean
  is_featured: boolean
  is_popular: boolean
  product_type: string
  has_delivery: boolean
  delivery_price: number
  minimum_order: number
  category_id: string
}

interface Category {
  id: string
  name_uz: string
  name_ru: string
  parent_id: string | null
  level: number
  path: string
}

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  categories: Category[]
  onSuccess: () => void
  onCategoriesUpdate: () => void
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
  onCategoriesUpdate,
}: ProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formData, setFormData] = useState({
    name_uz: "",
    name_ru: "",
    description_uz: "",
    description_ru: "",
    price: 0,
    unit: "dona",
    stock_quantity: 0,
    images: [] as string[],
    is_available: true,
    is_featured: false,
    is_popular: false,
    product_type: "sale",
    has_delivery: false,
    delivery_price: 0,
    minimum_order: 1,
    category_id: "",
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name_uz: product.name_uz || "",
        name_ru: product.name_ru || "",
        description_uz: product.description_uz || "",
        description_ru: product.description_ru || "",
        price: product.price || 0,
        unit: product.unit || "dona",
        stock_quantity: product.stock_quantity || 0,
        images: product.images || [],
        is_available: product.is_available ?? true,
        is_featured: product.is_featured ?? false,
        is_popular: product.is_popular ?? false,
        product_type: product.product_type || "sale",
        has_delivery: product.has_delivery ?? false,
        delivery_price: product.delivery_price || 0,
        minimum_order: product.minimum_order || 1,
        category_id: product.category_id || "",
      })
    } else {
      setFormData({
        name_uz: "",
        name_ru: "",
        description_uz: "",
        description_ru: "",
        price: 0,
        unit: "dona",
        stock_quantity: 0,
        images: [],
        is_available: true,
        is_featured: false,
        is_popular: false,
        product_type: "sale",
        has_delivery: false,
        delivery_price: 0,
        minimum_order: 1,
        category_id: "",
      })
    }
  }, [product])

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

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
        images: [...prev.images, ...uploadedUrls],
      }))
    } catch (error) {
      console.error("Error uploading images:", error)
      alert("Rasmlarni yuklashda xatolik yuz berdi")
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const productData = {
        ...formData,
        updated_at: new Date().toISOString(),
      }

      if (product) {
        // Update existing product
        const { error } = await supabase.from("products").update(productData).eq("id", product.id)

        if (error) throw error
      } else {
        // Create new product
        const { error } = await supabase.from("products").insert([
          {
            ...productData,
            created_at: new Date().toISOString(),
          },
        ])

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Mahsulotni saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images */}
          <div className="space-y-4">
            <Label>Mahsulot rasmlari</Label>

            {/* Image Upload */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
                disabled={uploadingImages}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  {uploadingImages ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {uploadingImages ? "Yuklanmoqda..." : "Rasmlarni yuklash uchun bosing yoki sudrab tashlang"}
                  </p>
                </div>
              </label>
            </div>

            {/* Image Preview */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`Product image ${index + 1}`}
                        width={200}
                        height={200}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Asosiy ma'lumotlar</h3>

                <div className="space-y-2">
                  <Label htmlFor="name_uz">Nomi (O'zbekcha) *</Label>
                  <Input
                    id="name_uz"
                    value={formData.name_uz}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name_uz: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_ru">Nomi (Ruscha)</Label>
                  <Input
                    id="name_ru"
                    value={formData.name_ru}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name_ru: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_uz">Tavsifi (O'zbekcha)</Label>
                  <Textarea
                    id="description_uz"
                    value={formData.description_uz}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description_uz: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description_ru">Tavsifi (Ruscha)</Label>
                  <Textarea
                    id="description_ru"
                    value={formData.description_ru}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description_ru: e.target.value }))}
                    rows={3}
                  />
                </div>

                <CategorySelector
                  value={formData.category_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  categories={categories}
                  onCategoriesUpdate={onCategoriesUpdate}
                />
              </CardContent>
            </Card>

            {/* Price & Stock */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Narx va miqdor</h3>

                <div className="space-y-2">
                  <Label htmlFor="price">Narxi (so'm) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_type">Mahsulot turi *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, product_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sotuv</SelectItem>
                      <SelectItem value="rental">Ijara</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">O'lchov birligi *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dona">Dona</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="m">Metr</SelectItem>
                      <SelectItem value="m2">Kvadrat metr</SelectItem>
                      <SelectItem value="m3">Kub metr</SelectItem>
                      <SelectItem value="litr">Litr</SelectItem>
                      <SelectItem value="paket">Paket</SelectItem>
                      <SelectItem value="quti">Quti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Mavjud miqdor</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_order">Minimal buyurtma</Label>
                  <Input
                    id="minimum_order"
                    type="number"
                    value={formData.minimum_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minimum_order: Number(e.target.value) }))}
                    min="1"
                  />
                </div>

                {/* Delivery */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_delivery"
                      checked={formData.has_delivery}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, has_delivery: checked }))}
                    />
                    <Label htmlFor="has_delivery">Yetkazib berish mavjud</Label>
                  </div>

                  {formData.has_delivery && (
                    <div className="space-y-2">
                      <Label htmlFor="delivery_price">Yetkazib berish narxi (so'm)</Label>
                      <Input
                        id="delivery_price"
                        type="number"
                        value={formData.delivery_price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, delivery_price: Number(e.target.value) }))}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Sozlamalar</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_available: checked }))}
                  />
                  <Label htmlFor="is_available">Mavjud</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Tavsiya</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_popular"
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_popular: checked }))}
                  />
                  <Label htmlFor="is_popular">Mashhur</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading || uploadingImages}>
              {loading ? "Saqlanmoqda..." : product ? "Yangilash" : "Qo'shish"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
