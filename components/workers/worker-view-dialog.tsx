"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { User, Phone, MapPin, Briefcase, Clock, Star, Calendar, FileText, ImageIcon } from "lucide-react"
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
  const [documents, setDocuments] = useState<WorkerDocument | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkerDocuments()
  }, [worker.id])

  const loadWorkerDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("workers_documents").select("*").eq("worker_id", worker.id).single()

      if (error && error.code !== "PGRST116") throw error
      setDocuments(data)
    } catch (error) {
      console.error("Error loading worker documents:", error)
    } finally {
      setLoading(false)
    }
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

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Umumiy</TabsTrigger>
            <TabsTrigger value="documents">Hujjatlar</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asosiy ma'lumotlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {worker.first_name} {worker.last_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.profession_uz}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.phone_number}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.location}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.experience_years} yil tajriba</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span>{worker.rating} reyting</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Qo'shilgan: {new Date(worker.created_at).toLocaleDateString("uz-UZ")}</span>
                  </div>

                  <div className="pt-2">
                    <Badge variant={worker.is_available ? "default" : "secondary"}>
                      {worker.is_available ? "Mavjud" : "Band"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Professional ma'lumotlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Soatlik narx:</span>
                    <span className="font-medium">{worker.hourly_rate.toLocaleString()} so'm</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kunlik narx:</span>
                    <span className="font-medium">{worker.daily_rate.toLocaleString()} so'm</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tajriba:</span>
                    <span className="font-medium">{worker.experience_years} yil</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reyting:</span>
                    <span className="font-medium">{worker.rating}/5</span>
                  </div>

                  {/* Skills */}
                  {worker.skills && worker.skills.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Ko'nikmalar:</span>
                      <div className="flex flex-wrap gap-1">
                        {worker.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Descriptions */}
            {(worker.description_uz || worker.description_ru) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tavsif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {worker.description_uz && (
                    <div>
                      <h4 className="font-medium mb-2">O'zbekcha:</h4>
                      <p className="text-muted-foreground">{worker.description_uz}</p>
                    </div>
                  )}
                  {worker.description_ru && (
                    <div>
                      <h4 className="font-medium mb-2">Ruscha:</h4>
                      <p className="text-muted-foreground">{worker.description_ru}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Hujjatlar yuklanmoqda...</p>
              </div>
            ) : documents ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Shaxsiy hujjatlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documents.passport_series && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Passport seriyasi:</span>
                      <span className="font-medium">{documents.passport_series}</span>
                    </div>
                  )}

                  {documents.passport_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Passport raqami:</span>
                      <span className="font-medium">{documents.passport_number}</span>
                    </div>
                  )}

                  {documents.birth_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tug'ilgan sana:</span>
                      <span className="font-medium">{new Date(documents.birth_date).toLocaleDateString("uz-UZ")}</span>
                    </div>
                  )}

                  {documents.passport_image_url && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Passport rasmi:</span>
                      <div className="aspect-video rounded-lg overflow-hidden border max-w-md">
                        <Image
                          src={documents.passport_image_url || "/placeholder.svg"}
                          alt="Passport"
                          width={400}
                          height={300}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Hujjatlar topilmadi</h3>
                  <p className="text-muted-foreground">Bu ishchi uchun hujjat ma'lumotlari kiritilmagan</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            {worker.portfolio_images && worker.portfolio_images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {worker.portfolio_images.map((image, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Portfolio ${index + 1}`}
                      width={300}
                      height={300}
                      className="object-cover w-full h-full hover:scale-105 transition-transform cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Portfolio rasmlari yo'q</h3>
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
