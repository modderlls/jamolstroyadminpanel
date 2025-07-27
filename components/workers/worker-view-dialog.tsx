"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Phone, MapPin, Clock, User, FileText } from "lucide-react"
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
  created_at: string
  updated_at: string
}

interface WorkerViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  worker: Worker | null
}

export function WorkerViewDialog({ open, onOpenChange, worker }: WorkerViewDialogProps) {
  if (!worker) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Usta ma'lumotlari</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="worker-avatar">
              <Image
                src={worker.avatar_url || "/placeholder.svg"}
                alt={`${worker.first_name} ${worker.last_name}`}
                width={80}
                height={80}
                className="worker-avatar"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {worker.first_name} {worker.last_name}
              </h2>
              <p className="text-lg text-muted-foreground">{worker.profession_uz}</p>
              {worker.profession_ru && <p className="text-sm text-muted-foreground">{worker.profession_ru}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={worker.is_available ? "default" : "secondary"}>
                  {worker.is_available ? "Mavjud" : "Band"}
                </Badge>
                {worker.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm">
                      {worker.rating.toFixed(1)} ({worker.review_count})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Aloqa ma'lumotlari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {worker.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.phone_number}</span>
                  </div>
                )}
                {worker.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Professional ma'lumotlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Tajriba:</span>
                  <span className="font-medium">{worker.experience_years} yil</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Soatlik narx:</span>
                  <span className="font-medium">{worker.hourly_rate.toLocaleString()} so'm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Kunlik narx:</span>
                  <span className="font-medium">{worker.daily_rate.toLocaleString()} so'm</span>
                </div>
                {worker.specialization && (
                  <div>
                    <span className="text-sm text-muted-foreground">Mutaxassislik:</span>
                    <p className="font-medium">{worker.specialization}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          {worker.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ko'nikmalar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill, index) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {worker.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tavsif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{worker.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Tizim ma'lumotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Qo'shilgan:</span>
                <span>{new Date(worker.created_at).toLocaleDateString("uz-UZ")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Yangilangan:</span>
                <span>{new Date(worker.updated_at).toLocaleDateString("uz-UZ")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
