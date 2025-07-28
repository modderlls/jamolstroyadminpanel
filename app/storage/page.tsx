"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Upload, Download, Trash2, Eye, Settings, HardDrive, Cloud } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { uz } from "date-fns/locale"

interface StorageFile {
  id: string
  name: string
  size: number
  created_at: string
  updated_at: string
  mimeType: string
  url: string
}

interface StorageInfo {
  totalFiles: number
  totalSize: number
  totalSizeGB: string
  maxStorage: number
  maxStorageGB: string
  usedPercentage: string
  bucketName: string
}

export default function StoragePage() {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<"supabase" | "r2">("supabase")
  const [mdPassword, setMdPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: localStorage.getItem("md_session") }),
      })

      if (response.ok) {
        setIsAuthenticated(true)
        loadStorageSettings()
        loadFiles()
        loadStorageInfo()
      } else {
        setShowPasswordDialog(true)
      }
    } catch (error) {
      setShowPasswordDialog(true)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mdPassword }),
      })

      if (response.ok) {
        localStorage.setItem("md_session", mdPassword)
        setIsAuthenticated(true)
        setShowPasswordDialog(false)
        loadStorageSettings()
        loadFiles()
        loadStorageInfo()
        toast.success("Muvaffaqiyatli kirish")
      } else {
        toast.error("Noto'g'ri parol")
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi")
    }
  }

  const loadStorageSettings = () => {
    const settings = localStorage.getItem("storage_settings")
    if (settings) {
      try {
        const parsed = JSON.parse(settings)
        setSelectedProvider(parsed.product_storage_provider || "supabase")
      } catch {
        setSelectedProvider("supabase")
      }
    }
  }

  const saveStorageSettings = () => {
    const settings = {
      product_storage_provider: selectedProvider,
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem("storage_settings", JSON.stringify(settings))
    toast.success("Sozlamalar saqlandi")
  }

  const loadFiles = async () => {
    try {
      let response
      if (selectedProvider === "r2") {
        response = await fetch("/api/r2/files")
      } else {
        response = await fetch("/api/supabase/files")
      }

      const data = await response.json()
      if (data.success) {
        setFiles(data.files || [])
      } else {
        toast.error("Fayllarni yuklashda xatolik")
      }
    } catch (error) {
      console.error("Error loading files:", error)
      toast.error("Fayllarni yuklashda xatolik")
    }
  }

  const loadStorageInfo = async () => {
    try {
      let response
      if (selectedProvider === "r2") {
        response = await fetch("/api/r2/storage-info")
      } else {
        response = await fetch("/api/supabase/storage-info")
      }

      const data = await response.json()
      if (data.success) {
        setStorageInfo(data.storage)
      } else {
        toast.error("Storage ma'lumotlarini yuklashda xatolik")
      }
    } catch (error) {
      console.error("Error loading storage info:", error)
      toast.error("Storage ma'lumotlarini yuklashda xatolik")
    }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)

        let response
        if (selectedProvider === "r2") {
          response = await fetch("/api/r2/upload", {
            method: "POST",
            body: formData,
          })
        } else {
          response = await fetch("/api/supabase/upload", {
            method: "POST",
            body: formData,
          })
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error)
        }
      }

      toast.success("Fayllar muvaffaqiyatli yuklandi")
      loadFiles()
      loadStorageInfo()
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Fayllarni yuklashda xatolik")
    } finally {
      setUploading(false)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      let response
      if (selectedProvider === "r2") {
        response = await fetch(`/api/r2/delete?file=${fileId}`, {
          method: "DELETE",
        })
      } else {
        response = await fetch(`/api/supabase/delete?file=${fileId}`, {
          method: "DELETE",
        })
      }

      const data = await response.json()
      if (data.success) {
        toast.success("Fayl o'chirildi")
        loadFiles()
        loadStorageInfo()
      } else {
        toast.error("Faylni o'chirishda xatolik")
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Faylni o'chirishda xatolik")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType.startsWith("video/")) return "🎥"
    if (mimeType.startsWith("audio/")) return "🎵"
    if (mimeType.includes("pdf")) return "📄"
    if (mimeType.includes("document") || mimeType.includes("word")) return "📝"
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊"
    return "📁"
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>MD Parolini kiriting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="md-password">MD Paroli</Label>
              <Input
                id="md-password"
                type="password"
                value={mdPassword}
                onChange={(e) => setMdPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="MD parolini kiriting"
              />
            </div>
            <Button onClick={handlePasswordSubmit} className="w-full">
              Kirish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fayl saqlash</h1>
          <p className="text-muted-foreground">Fayllarni boshqarish va saqlash sozlamalari</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Sozlamalar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Storage sozlamalari</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mahsulot rasmlari uchun storage</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(value: "supabase" | "r2") => setSelectedProvider(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supabase">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Supabase Storage
                      </div>
                    </SelectItem>
                    <SelectItem value="r2">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        Cloudflare R2
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveStorageSettings} className="w-full">
                Saqlash
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Storage Info */}
      {storageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedProvider === "r2" ? <Cloud className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
              Storage ma'lumotlari
              <Badge variant="secondary">{selectedProvider === "r2" ? "Cloudflare R2" : "Supabase"}</Badge>
            </CardTitle>
            <CardDescription>
              {storageInfo.totalFiles} ta fayl • {storageInfo.totalSizeGB} GB / {storageInfo.maxStorageGB} GB
              ishlatilgan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ishlatilgan joy</span>
                <span>{storageInfo.usedPercentage}%</span>
              </div>
              <Progress value={Number.parseFloat(storageInfo.usedPercentage)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Fayl yuklash</CardTitle>
          <CardDescription>Fayllarni yuklash uchun tanlang yoki sudrab tashlang</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Yuklanmoqda..." : "Fayllarni yuklash uchun bosing yoki sudrab tashlang"}
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Yuklangan fayllar</CardTitle>
          <CardDescription>{files.length} ta fayl topildi</CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Hech qanday fayl topilmadi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} •{" "}
                        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: uz })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} download={file.name}>
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Faylni o'chirish</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu faylni o'chirishni xohlaysizmi? Bu amalni bekor qilib bo'lmaydi.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleFileDelete(file.id)}>O'chirish</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
