"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Star,
  DollarSign,
  FileText,
  ImageIcon,
  Calendar,
  BadgeIcon as IdCard,
  Loader2,
} from "lucide-react"
import Image from "next/image"

interface Worker {
  id: string
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
  created_at: string
  updated_at: string
}

interface WorkerDocument {
  passport_series?: string
  passport_number?: string
  birth_date?: string
  passport_image_url?: string
}

interface WorkerViewDialogProps {
  worker: Worker
  onClose: () => void
}

export function WorkerViewDialog({ worker, onClose }: WorkerViewDialogProps) {
  const [documentData, setDocumentData] = useState<WorkerDocument | null>(null)
  const [loadingDocuments, setLoadingDocuments] = useState(true)

  useEffect(() => {
    loadWorkerDocuments()
  }, [worker.id])

  const loadWorkerDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const { data, error } = await supabase.from("workers_documents").select("*").eq("worker_id", worker.id).single()

      if (error && error.code !== "PGRST116") throw error

      setDocumentData(data || null)
    } catch (error) {
      console.error("Error loading worker documents:", error)
      setDocumentData(null)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {worker.first_name} {worker.last_name}
          </DialogTitle>
          <DialogDescription>Ishchi haqida to'liq ma'lumot</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Umumiy</TabsTrigger>
            <TabsTrigger value="documents">Hujjatlar</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Asosiy ma'lumotlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">To'liq ism:</span>
                    <span className="font-medium">
                      {worker.first_name} {worker.last_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Kasb (O'zbek):</span>
                    <span className="font-medium">{worker.profession_uz}</span>
                  </div>

                  {worker.profession_ru && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Kasb (Rus):</span>
                      <span className="font-medium">{worker.profession_ru}</span>
                    </div>
                  )}

                  {worker.profession_en && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Kasb (Ingliz):</span>
                      <span className="font-medium">{worker.profession_en}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefon:
                    </span>
                    <span className="font-medium">{worker.phone_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Manzil:
                    </span>
                    <span className="font-medium">{worker.location}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Holat:</span>
                    <Badge variant={worker.is_available ? "default" : "secondary"}>
                      {worker.is_available ? "Mavjud" : "Band"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Professional ma'lumotlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Tajriba:
                    </span>
                    <span className="font-medium">{worker.experience_years} yil</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Reyting:
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{worker.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Soatlik narx:
                    </span>
                    <span className="font-medium text-primary">{worker.hourly_rate.toLocaleString()} so'm</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Kunlik narx:
                    </span>
                    <span className="font-medium text-primary">{worker.daily_rate.toLocaleString()} so'm</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Qo'shilgan:
                    </span>
                    <span className="font-medium">{formatDate(worker.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skills */}
            {worker.skills && worker.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ko'nikmalar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {worker.description_uz && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tavsif (O'zbek)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{worker.description_uz}</p>
                  </CardContent>
                </Card>
              )}

              {worker.description_ru && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tavsif (Rus)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{worker.description_ru}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Hujjatlar yuklanmoqda...</p>
                </div>
              </div>
            ) : documentData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Document Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      Passport ma'lumotlari
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {documentData.passport_series && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Seriya:</span>
                        <span className="font-medium">{documentData.passport_series}</span>
                      </div>
                    )}

                    {documentData.passport_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Raqam:</span>
                        <span className="font-medium">{documentData.passport_number}</span>
                      </div>
                    )}

                    {documentData.birth_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tug'ilgan sana:</span>
                        <span className="font-medium">{formatDate(documentData.birth_date)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Passport Image */}
                {documentData.passport_image_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Passport rasmi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <Image
                          src={documentData.passport_image_url || "/placeholder.svg"}
                          alt="Passport"
                          width={400}
                          height={300}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <IdCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Hujjatlar topilmadi</h3>
                  <p className="text-muted-foreground">Bu ishchi uchun hujjat ma'lumotlari kiritilmagan</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            {worker.portfolio_images && worker.portfolio_images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {worker.portfolio_images.map((image, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="aspect-square rounded-lg overflow-hidden border">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`Portfolio ${index + 1}`}
                          width={300}
                          height={300}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Portfolio rasmlari topilmadi</h3>
                  <p className="text-muted-foreground">Bu ishchi uchun portfolio rasmlari yuklanmagan</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} className="ios-button">
            Yopish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
