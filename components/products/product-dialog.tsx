"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Camera, Plus, Trash2, StopCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { CategorySelector } from "@/components/categories/category-selector"
import { toast } from "sonner"

interface Product {
  id: string
  name_uz: string
  description_uz: string
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
  specifications?: Record<string, Array<{ name: string; value: string; price?: number }>>
  rental_time_unit?: string
  rental_duration?: number
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
  onCategoriesUpdate?: () => void // <<<<< ProductDialogProps: Bu prop ixtiyoriy bo'lishi mumkin
}

interface SpecificationItem {
  name: string
  value: string
  price?: number
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
  const [useCamera, setUseCamera] = useState(false)
  const [showCameraPreview, setShowCameraPreview] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [formData, setFormData] = useState({
    name_uz: "",
    description_uz: "",
    price: 0,
    unit: "dona",
    stock_quantity: 1000000,
    images: [] as string[],
    is_available: true,
    is_featured: false,
    is_popular: false,
    product_type: "sale",
    has_delivery: false,
    delivery_price: 0,
    minimum_order: 1,
    category_id: "",
    specifications: {} as Record<string, SpecificationItem[]>,
    rental_time_unit: "day",
    rental_duration: 1,
  })

  // Specifications state
  const [newSpecType, setNewSpecType] = useState("")

  useEffect(() => {
    if (product) {
      setFormData({
        name_uz: product.name_uz || "",
        description_uz: product.description_uz || "",
        price: product.price || 0,
        unit: product.unit || "dona",
        stock_quantity: product.stock_quantity || 1000000,
        images: product.images || [],
        is_available: product.is_available ?? true,
        is_featured: product.is_featured ?? false,
        is_popular: product.is_popular ?? false,
        product_type: product.product_type || "sale",
        has_delivery: product.has_delivery ?? false,
        delivery_price: product.delivery_price || 0,
        minimum_order: product.minimum_order || 1,
        category_id: product.category_id || "",
        specifications: product.specifications || {},
        rental_time_unit: product.rental_time_unit || "day",
        rental_duration: product.rental_duration || 1,
      })
    } else {
      setFormData({
        name_uz: "",
        description_uz: "",
        price: 0,
        unit: "dona",
        stock_quantity: 1000000,
        images: [],
        is_available: true,
        is_featured: false,
        is_popular: false,
        product_type: "sale",
        has_delivery: false,
        delivery_price: 0,
        minimum_order: 1,
        category_id: "",
        specifications: {},
        rental_time_unit: "day",
        rental_duration: 1,
      })
    }
  }, [product])

  // Cleanup camera stream when dialog closes
  useEffect(() => {
    if (!open && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setShowCameraPreview(false)
    }
  }, [open])

  const getStorageProvider = () => {
    const settings = localStorage.getItem("storage_settings")
    if (settings) {
      try {
        const parsed = JSON.parse(settings)
        return parsed.product_storage_provider || "supabase"
      } catch {
        return "supabase"
      }
    }
    return "supabase"
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setShowCameraPreview(true)
      }
    } catch (error) {
      console.error("Camera error:", error)
      toast.error("Kameraga kirish xatoligi")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowCameraPreview(false)
  }

  const capturePhoto = useCallback(async () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      const context = canvas.getContext("2d")
      context?.drawImage(videoRef.current, 0, 0)

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
            await uploadSingleImage(file)
          }
        },
        "image/jpeg",
        0.8,
      )
    }
  }, [])

  const uploadSingleImage = async (file: File) => {
    setUploadingImages(true)
    try {
      const storageProvider = getStorageProvider()
      let imageUrl = ""

      if (storageProvider === "r2") {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/r2/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        if (!data.success) throw new Error(data.error)
        imageUrl = data.file.url
      } else {
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

        imageUrl = publicUrl
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrl],
      }))

      toast.success("Rasm muvaffaqiyatli yuklandi")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Rasmni yuklashda xatolik yuz berdi")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      const storageProvider = getStorageProvider()

      for (const file of Array.from(files)) {
        if (storageProvider === "r2") {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/r2/upload", {
            method: "POST",
            body: formData,
          })

          const data = await response.json()
          if (!data.success) throw new Error(data.error)
          uploadedUrls.push(data.file.url)
        } else {
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
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }))

      toast.success("Rasmlar muvaffaqiyatli yuklandi")
    } catch (error) {
      console.error("Error uploading images:", error)
      toast.error("Rasmlarni yuklashda xatolik yuz berdi")
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

  const addSpecificationType = () => {
    if (!newSpecType.trim()) return

    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [newSpecType]: [],
      },
    }))

    setNewSpecType("")
  }

  const removeSpecificationType = (specType: string) => {
    setFormData((prev) => {
      const newSpecs = { ...prev.specifications }
      delete newSpecs[specType]
      return {
        ...prev,
        specifications: newSpecs,
      }
    })
  }

  const addSpecificationItem = (specType: string) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [specType]: [...(prev.specifications[specType] || []), { name: "", value: "", price: undefined }],
      },
    }))
  }

  const updateSpecificationItem = (specType: string, index: number, field: keyof SpecificationItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [specType]:
          prev.specifications[specType]?.map((item, i) => (i === index ? { ...item, [field]: value } : item)) || [],
      },
    }))
  }

  const removeSpecificationItem = (specType: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [specType]: prev.specifications[specType]?.filter((_, i) => i !== index) || [],
      },
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
        const { error } = await supabase.from("products").update(productData).eq("id", product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("products").insert([
          {
            ...productData,
            created_at: new Date().toISOString(),
          },
        ])
        if (error) throw error
      }

      toast.success(product ? "Mahsulot yangilandi" : "Mahsulot qo'shildi")
      onSuccess()
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Mahsulotni saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</DialogTitle>
          <DialogDescription>
            {product ? "Mavjud mahsulot ma'lumotlarini tahrirlang" : "Yangi mahsulot ma'lumotlarini kiriting"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Mahsulot rasmlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera/Upload Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="camera-mode"
                  checked={useCamera}
                  onCheckedChange={(checked) => {
                    setUseCamera(checked)
                    if (checked) {
                      startCamera()
                    } else {
                      stopCamera()
                    }
                  }}
                />
                <Label htmlFor="camera-mode">Kamera rejimi</Label>
              </div>

              {useCamera && (
                <div className="space-y-4">
                  {/* Camera Preview */}
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                      style={{ display: showCameraPreview ? "block" : "none" }}
                    />
                    {!showCameraPreview && (
                      <div className="w-full h-64 flex items-center justify-center">
                        <p className="text-white">Kamera yuklanmoqda...</p>
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      disabled={uploadingImages || !showCameraPreview}
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {uploadingImages ? "Yuklanmoqda..." : "Rasmga olish"}
                    </Button>
                    <Button type="button" variant="outline" onClick={stopCamera} disabled={!showCameraPreview}>
                      <StopCircle className="h-4 w-4 mr-2" />
                      To'xtatish
                    </Button>
                  </div>
                </div>
              )}

              {!useCamera && (
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
              )}

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
            </CardContent>
          </Card>

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
                  <Label htmlFor="description_uz">Tavsifi (O'zbekcha)</Label>
                  <Textarea
                    id="description_uz"
                    value={formData.description_uz}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description_uz: e.target.value }))}
                    rows={3}
                  />
                </div>

                <CategorySelector
    value={formData.category_id}
    onChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
    categories={categories}
    onCategoriesUpdate={onCategoriesUpdate} // <<<<< onCategoriesUpdate propini CategorySelectorga uzatamiz
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

                {/* Rental specific fields */}
                {formData.product_type === "rental" && (
                  <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm">Ijara sozlamalari</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="rental_time_unit">Vaqt birligi</Label>
                        <Select
                          value={formData.rental_time_unit}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, rental_time_unit: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hour">Soat</SelectItem>
                            <SelectItem value="day">Kun</SelectItem>
                            <SelectItem value="week">Hafta</SelectItem>
                            <SelectItem value="month">Oy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rental_duration">Muddati</Label>
                        <Input
                          id="rental_duration"
                          type="number"
                          min="1"
                          value={formData.rental_duration}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, rental_duration: Number(e.target.value) }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                  <Label htmlFor="stock_quantity">Mavjud miqdor (ixtiyoriy)</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Default: 1,000,000</p>
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

                  
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Mahsulot turlari (ixtiyoriy)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Specification Type */}
              <div className="flex gap-2">
                <Input
                  placeholder="Yangi tur nomi (masalan: rang, quvvat)"
                  value={newSpecType}
                  onChange={(e) => setNewSpecType(e.target.value)}
                />
                <Button type="button" onClick={addSpecificationType} disabled={!newSpecType.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tur qo'shish
                </Button>
              </div>

              {/* Existing Specifications */}
              {Object.entries(formData.specifications).map(([specType, items]) => (
                <Card key={specType} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize">{specType}</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSpecificationType(specType)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Nomi</Label>
                          <Input
                            placeholder="Ko'k"
                            value={item.name}
                            onChange={(e) => updateSpecificationItem(specType, index, "name", e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Qiymati</Label>
                          <Input
                            placeholder="blue"
                            value={item.value}
                            onChange={(e) => updateSpecificationItem(specType, index, "value", e.target.value)}
                          />
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSpecificationItem(specType, index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSpecificationItem(specType)}
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      {specType} qo'shish
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {Object.keys(formData.specifications).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Hozircha hech qanday tur qo'shilmagan</p>
                  <p className="text-sm">Yuqoridagi maydondan yangi tur qo'shing</p>
                </div>
              )}
            </CardContent>
          </Card>

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
