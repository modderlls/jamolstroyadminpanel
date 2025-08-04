"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, Loader2, Upload, X } from "lucide-react"
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

interface WorkerDocument {
  passport_series?: string
  passport_number?: string
  birth_date?: string
  passport_image_url?: string
}

interface WorkerDialogProps {
  worker?: Worker
  onSaved: () => void
  onClose: () => void
  open: boolean
}

export function WorkerDialog({ worker, onSaved, onClose, open }: WorkerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingPassport, setUploadingPassport] = useState(false)

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

  const [documentData, setDocumentData] = useState<WorkerDocument>({
    passport_series: "",
    passport_number: "",
    birth_date: "",
    passport_image_url: "",
  })

  useEffect(() => {
    if (worker) {
      setFormData({
        ...worker,
        skills: worker.skills || [],
        portfolio_images: worker.portfolio_images || [],
      })
      // Load worker documents if editing
      loadWorkerDocuments(worker.id!)
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
      setDocumentData({
        passport_series: "",
        passport_number: "",
        birth_date: "",
        passport_image_url: "",
      })
    }
  }, [worker, open])

  const loadWorkerDocuments = async (workerId: string) => {
    try {
      const { data, error } = await supabase.from("workers_documents").select("*").eq("worker_id", workerId).single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setDocumentData({
          passport_series: data.passport_series || "",
          passport_number: data.passport_number || "",
          birth_date: data.birth_date || "",
          passport_image_url: data.passport_image_url || "",
        })
      }
    } catch (error) {
      console.error("Error loading worker documents:", error)
    }
  }

  const handleInputChange = (field: keyof Worker, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleDocumentChange = (field: keyof WorkerDocument, value: any) => {
    setDocumentData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSkillsChange = (skillsText: string) => {
    const skills = skillsText
      .split("\n")
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

  const handlePassportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPassport(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `documents/passports/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage.from("documents").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName)

      setDocumentData((prev) => ({
        ...prev,
        passport_image_url: publicUrl,
      }))

      toast.success("Passport rasmi yuklandi")
    } catch (error) {
      console.error("Error uploading passport image:", error)
      toast.error("Passport rasmini yuklashda xatolik")
    } finally {
      setUploadingPassport(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      portfolio_images: prev.portfolio_images?.filter((_, i) => i !== index) || [],
    }))
  }

  const removePassportImage = () => {
    setDocumentData((prev) => ({
      ...prev,
      passport_image_url: "",
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

      let workerId: string

      if (worker?.id) {
        // Update existing worker
        const { error } = await supabase.from("workers").update(saveData).eq("id", worker.id)
        if (error) throw error
        workerId = worker.id
      } else {
        // Create new worker
        const newWorkerData = {
          ...saveData,
          created_at: new Date().toISOString(),
        }
        const { data, error } = await supabase.from("workers").insert([newWorkerData]).select().single()
        if (error) throw error
        workerId = data.id
      }

      // Save worker documents if any document data is provided
      if (
        documentData.passport_series ||
        documentData.passport_number ||
        documentData.birth_date ||
        documentData.passport_image_url
      ) {
        const documentSaveData = {
          worker_id: workerId,
          ...documentData,
          updated_at: new Date().toISOString(),
        }

        // Check if document already exists
        const { data: existingDoc } = await supabase
          .from("workers_documents")
          .select("id")
          .eq("worker_id", workerId)
          .single()

        if (existingDoc) {
          // Update existing document
          const { error } = await supabase.from("workers_documents").update(documentSaveData).eq("worker_id", workerId)
          if (error) throw error
        } else {
          // Create new document
          const { error } = await supabase.from("workers_documents").insert([
            {
              ...documentSaveData,
              created_at: new Date().toISOString(),
            },
          ])
          if (error) throw error
        }
      }

      toast.success(worker ? "Ishchi yangilandi" : "Ishchi qo'shildi")
      onSaved()
      onClose()
    } catch (error) {
      console.error("Error saving worker:", error)
      toast.error("Ishchini saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {worker ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {worker ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
          </DialogTitle>
          <DialogDescription>
            {worker ? "Mavjud ishchi ma'lumotlarini tahrirlang" : "Yangi ishchi ma'lumotlarini kiriting"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          

          <div className="space-y-2">
            <Label htmlFor="skills">Konikmalar</Label>
            <Textarea
            id="skills"
            value={formData.skills.join("\n")}
            onChange={(e) => {
              const skillsArray = e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s !== "")
              setFormData({ ...formData, skills: skillsArray })
            }}
             placeholder={`Qurilish\nTa'mirlash\nElektr ishlari`}
             rows={4}
           />
           {formData.skills.length > 0 && (
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

              
            </div>
          </div>

          {/* Documents and Portfolio */}
          <div className="space-y-4">
            {/* Document Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hujjat ma'lumotlari (ixtiyoriy)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passport_series">Passport seriyasi</Label>
                    <Input
                      id="passport_series"
                      value={documentData.passport_series || ""}
                      onChange={(e) => handleDocumentChange("passport_series", e.target.value)}
                      placeholder="AA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_number">Passport raqami</Label>
                    <Input
                      id="passport_number"
                      value={documentData.passport_number || ""}
                      onChange={(e) => handleDocumentChange("passport_number", e.target.value)}
                      placeholder="1234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Tug'ilgan sana</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={documentData.birth_date || ""}
                    onChange={(e) => handleDocumentChange("birth_date", e.target.value)}
                  />
                </div>

                {/* Passport Image Upload */}
                <div className="space-y-2">
                  <Label>Passport rasmi</Label>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePassportImageUpload}
                      className="hidden"
                      id="passport-upload"
                      disabled={uploadingPassport}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("passport-upload")?.click()}
                      disabled={uploadingPassport}
                      className="w-full ios-button bg-transparent"
                    >
                      {uploadingPassport ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Yuklanmoqda...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Passport rasmini yuklash
                        </>
                      )}
                    </Button>
                  </div>

                  {documentData.passport_image_url && (
                    <div className="relative group">
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <Image
                          src={documentData.passport_image_url || "/placeholder.svg"}
                          alt="Passport"
                          width={300}
                          height={200}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={removePassportImage}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Images */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Portfolio rasmlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    className="w-full ios-button bg-transparent"
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
                  <div className="grid grid-cols-2 gap-4">
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
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
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
      </DialogContent>
    </Dialog>
  )
}
