"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, Loader2, Camera, Upload, X } from "lucide-react"
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
  passport_series?: string
  passport_number?: string
  birth_date?: string
  passport_image?: string
  created_at?: string
  updated_at?: string
}

interface WorkerDialogProps {
  worker?: Worker
  onClose: () => void
  onSaved: () => void
}

export function WorkerDialog({ worker, onClose, onSaved }: WorkerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cameraMode, setCameraMode] = useState<"portfolio" | "passport" | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

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
    passport_series: "",
    passport_number: "",
    birth_date: "",
    passport_image: "",
  })

  useEffect(() => {
    if (worker) {
      setFormData({
        ...worker,
        skills: worker.skills || [],
        portfolio_images: worker.portfolio_images || [],
        passport_series: worker.passport_series || "",
        passport_number: worker.passport_number || "",
        birth_date: worker.birth_date || "",
        passport_image: worker.passport_image || "",
      })
    } else {
      setFormData({
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
        passport_series: "",
        passport_number: "",
        birth_date: "",
        passport_image: "",
      })
    }
  }, [worker])

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

  const startCamera = async (mode: "portfolio" | "passport") => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setStream(mediaStream)
      setCameraMode(mode)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Kameraga kirish imkoni yo'q")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCameraMode(null)
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      async (blob) => {
        if (!blob) return

        setUploading(true)
        try {
          const file = new File([blob], `${cameraMode}-${Date.now()}.jpg`, { type: "image/jpeg" })
          const uploadedUrl = await uploadSingleImage(file)

          if (cameraMode === "portfolio") {
            setFormData((prev) => ({
              ...prev,
              portfolio_images: [...(prev.portfolio_images || []), uploadedUrl],
            }))
          } else if (cameraMode === "passport") {
            setFormData((prev) => ({
              ...prev,
              passport_image: uploadedUrl,
            }))
          }

          stopCamera()
        } catch (error) {
          console.error("Error uploading captured photo:", error)
          alert("Rasmni yuklashda xatolik yuz berdi")
        } finally {
          setUploading(false)
        }
      },
      "image/jpeg",
      0.8,
    )
  }

  const uploadSingleImage = async (file: File): Promise<string> => {
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
    return publicUrl
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "portfolio" | "passport") => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      if (type === "passport") {
        const uploadedUrl = await uploadSingleImage(files[0])
        setFormData((prev) => ({
          ...prev,
          passport_image: uploadedUrl,
        }))
      } else {
        const uploadedUrls: string[] = []
        for (const file of Array.from(files)) {
          const uploadedUrl = await uploadSingleImage(file)
          uploadedUrls.push(uploadedUrl)
        }
        setFormData((prev) => ({
          ...prev,
          portfolio_images: [...(prev.portfolio_images || []), ...uploadedUrls],
        }))
      }
    } catch (error) {
      console.error("Error uploading images:", error)
      alert("Rasmlarni yuklashda xatolik yuz berdi")
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

  const removePassportImage = () => {
    setFormData((prev) => ({
      ...prev,
      passport_image: "",
    }))
  }

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.profession_uz) {
      alert("Ism, familiya va kasbni to'ldiring")
      return
    }

    setLoading(true)
    try {
      const saveData = {
        ...formData,
        updated_at: new Date().toISOString(),
      }

      if (worker?.id) {
        const { error } = await supabase.from("workers").update(saveData).eq("id", worker.id)
        if (error) throw error
      } else {
        saveData.created_at = new Date().toISOString()
        const { error } = await supabase.from("workers").insert([saveData])
        if (error) throw error
      }

      onSaved()
      onClose()
    } catch (error) {
      console.error("Error saving worker:", error)
      alert("Ishchini saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {worker ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {worker ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Camera Modal */}
          {cameraMode && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
              <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {cameraMode === "portfolio" ? "Portfolio rasmi" : "Passport rasmi"}
                    </h3>
                    <Button variant="outline" size="sm" onClick={stopCamera}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="relative">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <Button onClick={capturePhoto} disabled={uploading} className="w-full ios-button">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Yuklanmoqda...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Rasmga olish
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                <Label htmlFor="profession_uz">Kasb *</Label>
                <Input
                  id="profession_uz"
                  value={formData.profession_uz}
                  onChange={(e) => handleInputChange("profession_uz", e.target.value)}
                  placeholder="Masalan: Qurilish ustasi"
                />
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
                <Label htmlFor="birth_date">Tug'ilgan sana</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange("birth_date", e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="description_uz">Tavsif</Label>
                <Textarea
                  id="description_uz"
                  value={formData.description_uz || ""}
                  onChange={(e) => handleInputChange("description_uz", e.target.value)}
                  placeholder="Ishchi haqida qisqacha ma'lumot..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Passport Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Passport ma'lumotlari</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passport_series">Passport seriyasi</Label>
                <Input
                  id="passport_series"
                  value={formData.passport_series}
                  onChange={(e) => handleInputChange("passport_series", e.target.value)}
                  placeholder="AA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport_number">Passport raqami</Label>
                <Input
                  id="passport_number"
                  value={formData.passport_number}
                  onChange={(e) => handleInputChange("passport_number", e.target.value)}
                  placeholder="1234567"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Passport rasmi</Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startCamera("passport")}
                  disabled={uploading}
                  className="ios-button bg-transparent"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Rasmga olish
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "passport")}
                    className="hidden"
                    id="passport-upload"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("passport-upload")?.click()}
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
                        <Upload className="h-4 w-4 mr-2" />
                        Rasm yuklash
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {formData.passport_image && (
                <div className="relative inline-block">
                  <div className="w-32 h-20 rounded-lg overflow-hidden border">
                    <Image
                      src={formData.passport_image || "/placeholder.svg"}
                      alt="Passport"
                      width={128}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removePassportImage}
                    className="absolute -top-2 -right-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Portfolio Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Portfolio rasmlari</h3>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => startCamera("portfolio")}
                disabled={uploading}
                className="ios-button bg-transparent"
              >
                <Camera className="h-4 w-4 mr-2" />
                Rasmga olish
              </Button>

              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "portfolio")}
                  className="hidden"
                  id="portfolio-upload"
                  disabled={uploading}
                />
                <Button
                  type="button"
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
                      <Upload className="h-4 w-4 mr-2" />
                      Rasm yuklash
                    </>
                  )}
                </Button>
              </div>
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
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose} className="ios-button bg-transparent">
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
      </div>
    </div>
  )
}
