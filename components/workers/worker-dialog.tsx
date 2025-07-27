"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Plus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface Worker {
  id: string
  first_name: string
  last_name: string
  profession_uz: string
  profession_ru: string
  skills: string[]
  experience_years: number
  hourly_rate: number
  daily_rate: number
  rating: number
  review_count: number
  avatar_url: string
  phone_number: string
  is_available: boolean
  location: string
  specialization: string
  description: string
}

interface WorkerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  worker: Worker | null
  onSuccess: () => void
}

export function WorkerDialog({ open, onOpenChange, worker, onSuccess }: WorkerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [newSkill, setNewSkill] = useState("")

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    profession_uz: "",
    profession_ru: "",
    skills: [] as string[],
    experience_years: 0,
    hourly_rate: 0,
    daily_rate: 0,
    avatar_url: "",
    phone_number: "",
    is_available: true,
    location: "",
    specialization: "",
    description: "",
  })

  const [documentData, setDocumentData] = useState({
    passport_series: "",
    passport_number: "",
    passport_image_url: "",
  })

  useEffect(() => {
    if (worker) {
      setFormData({
        first_name: worker.first_name || "",
        last_name: worker.last_name || "",
        profession_uz: worker.profession_uz || "",
        profession_ru: worker.profession_ru || "",
        skills: worker.skills || [],
        experience_years: worker.experience_years || 0,
        hourly_rate: worker.hourly_rate || 0,
        daily_rate: worker.daily_rate || 0,
        avatar_url: worker.avatar_url || "",
        phone_number: worker.phone_number || "",
        is_available: worker.is_available ?? true,
        location: worker.location || "",
        specialization: worker.specialization || "",
        description: worker.description || "",
      })

      // Fetch worker documents if editing
      if (worker.id) {
        fetchWorkerDocuments(worker.id)
      }
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        profession_uz: "",
        profession_ru: "",
        skills: [],
        experience_years: 0,
        hourly_rate: 0,
        daily_rate: 0,
        avatar_url: "",
        phone_number: "",
        is_available: true,
        location: "",
        specialization: "",
        description: "",
      })
      setDocumentData({
        passport_series: "",
        passport_number: "",
        passport_image_url: "",
      })
    }
  }, [worker])

  const fetchWorkerDocuments = async (workerId: string) => {
    try {
      const { data, error } = await supabase.from("workers_documents").select("*").eq("worker_id", workerId).single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setDocumentData({
          passport_series: data.passport_series || "",
          passport_number: data.passport_number || "",
          passport_image_url: data.passport_image_url || "",
        })
      }
    } catch (error) {
      console.error("Error fetching worker documents:", error)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage.from("products").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(fileName)

      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }))
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Avatar yuklashda xatolik yuz berdi")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDocumentUpload = async (file: File) => {
    setUploadingDocuments(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `passport-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage.from("documents").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName)

      setDocumentData((prev) => ({ ...prev, passport_image_url: publicUrl }))
    } catch (error) {
      console.error("Error uploading document:", error)
      alert("Hujjat yuklashda xatolik yuz berdi")
    } finally {
      setUploadingDocuments(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let workerId = worker?.id

      if (worker) {
        // Update existing worker
        const { error } = await supabase
          .from("workers")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", worker.id)

        if (error) throw error
      } else {
        // Create new worker
        const { data, error } = await supabase
          .from("workers")
          .insert([
            {
              ...formData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single()

        if (error) throw error
        workerId = data.id
      }

      // Save worker documents
      if (
        workerId &&
        (documentData.passport_series || documentData.passport_number || documentData.passport_image_url)
      ) {
        const { error: docError } = await supabase.from("workers_documents").upsert({
          worker_id: workerId,
          ...documentData,
          updated_at: new Date().toISOString(),
        })

        if (docError) throw docError
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving worker:", error)
      alert("Ustani saqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{worker ? "Ustani tahrirlash" : "Yangi usta qo'shish"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Asosiy ma'lumotlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar */}
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-border">
                      <Image
                        src={formData.avatar_url || "/placeholder.svg"}
                        alt="Avatar"
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                        className="hidden"
                        id="avatar-upload"
                        disabled={uploadingAvatar}
                      />
                      <label htmlFor="avatar-upload">
                        <Button type="button" variant="outline" size="sm" disabled={uploadingAvatar} asChild>
                          <span>
                            {uploadingAvatar ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {uploadingAvatar ? "Yuklanmoqda..." : "Yuklash"}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ism *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Familiya *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kasbi (O'zbekcha) *</Label>
                  <Input
                    value={formData.profession_uz}
                    onChange={(e) => setFormData((prev) => ({ ...prev, profession_uz: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kasbi (Ruscha)</Label>
                  <Input
                    value={formData.profession_ru}
                    onChange={(e) => setFormData((prev) => ({ ...prev, profession_ru: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefon raqami</Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+998901234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Manzil</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_available: checked }))}
                  />
                  <Label>Mavjud</Label>
                </div>
              </CardContent>
            </Card>

            {/* Professional Info */}
            <Card>
              <CardHeader>
                <CardTitle>Professional ma'lumotlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tajriba (yil)</Label>
                  <Input
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData((prev) => ({ ...prev, experience_years: Number(e.target.value) }))}
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Soatlik narx (so'm)</Label>
                    <Input
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hourly_rate: Number(e.target.value) }))}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kunlik narx (so'm)</Label>
                    <Input
                      type="number"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, daily_rate: Number(e.target.value) }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mutaxassislik</Label>
                  <Input
                    value={formData.specialization}
                    onChange={(e) => setFormData((prev) => ({ ...prev, specialization: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tavsif</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <Label>Ko'nikmalar</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Ko'nikma qo'shish"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                    />
                    <Button type="button" onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Hujjatlar (Faqat adminlar uchun)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Passport seriyasi</Label>
                  <Input
                    value={documentData.passport_series}
                    onChange={(e) => setDocumentData((prev) => ({ ...prev, passport_series: e.target.value }))}
                    placeholder="AA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passport raqami</Label>
                  <Input
                    value={documentData.passport_number}
                    onChange={(e) => setDocumentData((prev) => ({ ...prev, passport_number: e.target.value }))}
                    placeholder="1234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Passport rasmi</Label>
                <div className="flex items-center gap-4">
                  {documentData.passport_image_url && (
                    <div className="document-preview">
                      <Image
                        src={documentData.passport_image_url || "/placeholder.svg"}
                        alt="Passport"
                        width={120}
                        height={160}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div className="document-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0])}
                      className="hidden"
                      id="document-upload"
                      disabled={uploadingDocuments}
                    />
                    <label htmlFor="document-upload">
                      <Button type="button" variant="outline" disabled={uploadingDocuments} asChild>
                        <span>
                          {uploadingDocuments ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {uploadingDocuments ? "Yuklanmoqda..." : "Passport rasmini yuklash"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading || uploadingAvatar || uploadingDocuments}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : worker ? (
                "Yangilash"
              ) : (
                "Qo'shish"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
