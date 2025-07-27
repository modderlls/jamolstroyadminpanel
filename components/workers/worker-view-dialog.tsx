"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Star, MapPin, Phone, Briefcase, Clock, DollarSign, User, FileText, Shield, Loader2, Eye } from "lucide-react"
import Image from "next/image"

interface Worker {
  id: string
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
  created_at: string
}

interface WorkerViewDialogProps {
  worker: Worker
  onClose: () => void
}

export function WorkerViewDialog({ worker, onClose }: WorkerViewDialogProps) {
  const [showDocuments, setShowDocuments] = useState(false)
  const [documentPassword, setDocumentPassword] = useState("")
  const [documentError, setDocumentError] = useState("")
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentsVerified, setDocumentsVerified] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])

  const verifyDocumentAccess = async () => {
    if (!documentPassword) {
      setDocumentError("MD parolni kiriting")
      return
    }

    setDocumentLoading(true)
    setDocumentError("")

    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: documentPassword }),
      })

      const data = await response.json()

      if (data.valid) {
        setDocumentsVerified(true)
        setDocumentPassword("")
        // Fetch worker documents
        await fetchWorkerDocuments()
      } else {
        setDocumentError(data.error || "Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setDocumentError("Parolni tekshirishda xatolik yuz berdi")
    } finally {
      setDocumentLoading(false)
    }
  }

  const fetchWorkerDocuments = async () => {
    try {
      // This would fetch from workers_documents table
      // For now, we'll show placeholder data
      setDocuments([
        {
          id: "1",
          document_type: "passport",
          document_number: "AA1234567",
          issue_date: "2020-01-15",
          expiry_date: "2030-01-15",
          issued_by: "Toshkent shahar IIB",
          document_images: ["/placeholder.svg"],
        },
      ])
    } catch (error) {
      console.error("Error fetching documents:", error)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {worker.first_name} {worker.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {worker.first_name} {worker.last_name}
                    </h3>
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <Briefcase className="h-4 w-4" />
                      {worker.profession_uz}
                    </p>
                  </div>
                  <Badge variant={worker.is_available ? "default" : "secondary"}>
                    {worker.is_available ? "Mavjud" : "Band"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.phone_number}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.experience_years} yil tajriba</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span>{worker.rating} reyting</span>
                  </div>
                </div>

                {worker.description_uz && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Tavsif</h4>
                    <p className="text-sm text-muted-foreground">{worker.description_uz}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            {worker.skills && worker.skills.length > 0 && (
              <Card className="ios-card">
                <CardContent className="p-6">
                  <h4 className="font-medium mb-3">Ko'nikmalar</h4>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio */}
            {worker.portfolio_images && worker.portfolio_images.length > 0 && (
              <Card className="ios-card">
                <CardContent className="p-6">
                  <h4 className="font-medium mb-3">Portfolio</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {worker.portfolio_images.map((image, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`Portfolio ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents Section */}
            <Card className="ios-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Hujjatlar
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDocuments(true)}
                    className="ios-button bg-transparent"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Hujjatlarni ko'rish
                  </Button>
                </div>

                {showDocuments && !documentsVerified && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Himoyalangan ma'lumot</span>
                    </div>

                    {documentError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                        {documentError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="document-password">MD Parol</Label>
                      <Input
                        id="document-password"
                        type="password"
                        value={documentPassword}
                        onChange={(e) => setDocumentPassword(e.target.value)}
                        placeholder="MD parolni kiriting"
                        pattern="[0-9]*"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            verifyDocumentAccess()
                          }
                        }}
                      />
                    </div>

                    <Button
                      onClick={verifyDocumentAccess}
                      disabled={documentLoading || !documentPassword}
                      className="w-full ios-button"
                    >
                      {documentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Tekshirilmoqda...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Hujjatlarni ko'rish
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {documentsVerified && (
                  <div className="space-y-4">
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Hujjatlar topilmadi</p>
                    ) : (
                      documents.map((doc) => (
                        <div key={doc.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">
                              {doc.document_type === "passport" ? "Pasport" : doc.document_type}
                            </h5>
                            <Badge variant="outline">{doc.document_number}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Berilgan sana:</span>
                              <p>{new Date(doc.issue_date).toLocaleDateString("uz-UZ")}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Amal qilish muddati:</span>
                              <p>{new Date(doc.expiry_date).toLocaleDateString("uz-UZ")}</p>
                            </div>
                          </div>

                          <div className="text-sm">
                            <span className="text-muted-foreground">Kim tomonidan berilgan:</span>
                            <p>{doc.issued_by}</p>
                          </div>

                          {doc.document_images && doc.document_images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {doc.document_images.map((image: string, index: number) => (
                                <Image
                                  key={index}
                                  src={image || "/placeholder.svg"}
                                  alt={`Document ${index + 1}`}
                                  width={150}
                                  height={100}
                                  className="w-full h-20 object-cover rounded border"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="ios-card">
              <CardContent className="p-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Narxlar
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Soatlik:</span>
                    <span className="font-medium">{worker.hourly_rate.toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Kunlik:</span>
                    <span className="font-medium">{worker.daily_rate.toLocaleString()} so'm</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Actions */}
            <Card className="ios-card">
              <CardContent className="p-6">
                <h4 className="font-medium mb-4">Aloqa</h4>
                <div className="space-y-2">
                  <Button className="w-full ios-button" asChild>
                    <a href={`tel:${worker.phone_number}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Qo'ng'iroq qilish
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full ios-button bg-transparent" asChild>
                    <a href={`sms:${worker.phone_number}`}>SMS yuborish</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="ios-card">
              <CardContent className="p-6">
                <h4 className="font-medium mb-4">Statistika</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ro'yxatdan o'tgan:</span>
                    <span>{new Date(worker.created_at).toLocaleDateString("uz-UZ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Holat:</span>
                    <Badge variant={worker.is_available ? "default" : "secondary"} className="text-xs">
                      {worker.is_available ? "Mavjud" : "Band"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="ios-button">
            Yopish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
