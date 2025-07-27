"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Phone, MapPin, Star, Calendar, Briefcase, FileText, Eye, Shield } from "lucide-react"
import { MDPasswordDialog } from "@/components/md-password-dialog"

interface WorkerViewDialogProps {
  worker: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkerViewDialog({ worker, open, onOpenChange }: WorkerViewDialogProps) {
  const [showDocuments, setShowDocuments] = useState(false)
  const [showMDPassword, setShowMDPassword] = useState(false)

  const handleViewDocuments = () => {
    setShowMDPassword(true)
  }

  const handleMDPasswordSuccess = () => {
    setShowMDPassword(false)
    setShowDocuments(true)
  }

  if (!worker) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={worker.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {worker.first_name?.[0]}
                  {worker.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">
                  {worker.first_name} {worker.last_name}
                </h2>
                <p className="text-sm text-muted-foreground">{worker.profession_uz}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Asosiy ma'lumotlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.phone_number || "Telefon ko'rsatilmagan"}</span>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.location || "Manzil ko'rsatilmagan"}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.specialization || "Mutaxassislik ko'rsatilmagan"}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.experience_years} yil tajriba</span>
                </div>

                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span>{worker.rating || 0}/5</span>
                    <Badge variant="secondary">{worker.review_count || 0} ta sharh</Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <Badge variant={worker.is_available ? "default" : "secondary"}>
                    {worker.is_available ? "Mavjud" : "Band"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Skills and Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Ko'nikmalar va narxlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Ko'nikmalar:</h4>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills && worker.skills.length > 0 ? (
                      worker.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Ko'nikmalar ko'rsatilmagan</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Soatlik narx:</h4>
                    <p className="text-lg font-semibold">
                      {worker.hourly_rate ? `${worker.hourly_rate.toLocaleString()} so'm` : "Ko'rsatilmagan"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Kunlik narx:</h4>
                    <p className="text-lg font-semibold">
                      {worker.daily_rate ? `${worker.daily_rate.toLocaleString()} so'm` : "Ko'rsatilmagan"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {worker.description && (
              <Card className="md:col-span-2">
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

            {/* Documents Section */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Hujjatlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleViewDocuments}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Eye className="h-4 w-4" />
                  Hujjatlarni ko'rish
                </Button>

                {showDocuments && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Passport ma'lumotlari va hujjatlar:</p>
                    {/* Documents will be loaded here after MD password verification */}
                    <div className="space-y-2">
                      <p>
                        <strong>Passport seriya:</strong> {worker.passport_series || "Ko'rsatilmagan"}
                      </p>
                      <p>
                        <strong>Passport raqam:</strong> {worker.passport_number || "Ko'rsatilmagan"}
                      </p>
                      {worker.passport_image && (
                        <div>
                          <strong>Passport rasmi:</strong>
                          <img
                            src={worker.passport_image || "/placeholder.svg"}
                            alt="Passport"
                            className="mt-2 max-w-xs rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <MDPasswordDialog
        open={showMDPassword}
        onOpenChange={setShowMDPassword}
        onSuccess={handleMDPasswordSuccess}
        title="Hujjatlarni ko'rish"
        description="Ishchi hujjatlarini ko'rish uchun MD parolni kiriting"
      />
    </>
  )
}
