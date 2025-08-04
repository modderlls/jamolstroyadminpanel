"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  HardDrive,
  Upload,
  Trash2,
  Settings,
  Database,
  Shield,
  Lock,
  Key,
  Loader2,
  Save,
  RefreshCw,
  Eye,
  Download,
  Camera,
  FileText,
  Video,
  Music,
  Archive,
  File,
  AlertCircle,
  ImageIcon,
  Users,
  Server,
} from "lucide-react"

interface StorageFile {
  id: string
  name: string
  size?: number
  created_at?: string
  updated_at?: string
  mimeType?: string
  url?: string
}

interface R2Storage {
  totalFiles: number
  totalSize: number
  totalSizeGB: string
  maxStorage: number
  maxStorageGB: string
  usedPercentage: string
  bucketName: string
}

interface SupabaseStorage {
  totalSize: number
  fileCount: number
  buckets: string[]
}

export default function StoragePage() {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPassword, setSettingsPassword] = useState("")
  const [settingsError, setSettingsError] = useState("")
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsVerified, setSettingsVerified] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Storage providers
  const [currentProvider, setCurrentProvider] = useState<"supabase" | "r2">("supabase")
  const [productStorageProvider, setProductStorageProvider] = useState<"supabase" | "r2">("supabase")
  const [workerStorageProvider, setWorkerStorageProvider] = useState<"supabase" | "r2">("supabase")

  // Storage info
  const [r2Storage, setR2Storage] = useState<R2Storage | null>(null)
  const [supabaseStorage, setSupabaseStorage] = useState<SupabaseStorage | null>(null)

  // MD Password protection for viewing files
  const [viewPassword, setViewPassword] = useState("")
  const [viewError, setViewError] = useState("")
  const [viewLoading, setViewLoading] = useState(false)
  const [viewVerified, setViewVerified] = useState(false)

  // Camera and file upload
  const [useCamera, setUseCamera] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  useEffect(() => {
    loadStorageSettings()
  }, [])

  useEffect(() => {
    if (viewVerified) {
      fetchStorageInfo()
      fetchFiles()
    }
  }, [viewVerified, currentProvider])

  const loadStorageSettings = () => {
    const saved = localStorage.getItem("storage_settings")
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setCurrentProvider(settings.current_provider || "supabase")
        setProductStorageProvider(settings.product_storage_provider || "supabase")
        setWorkerStorageProvider(settings.worker_storage_provider || "supabase")
      } catch (error) {
        console.error("Error loading storage settings:", error)
      }
    }
  }

  const verifyViewAccess = async () => {
    if (!viewPassword) {
      setViewError("MD parolni kiriting")
      return
    }

    setViewLoading(true)
    setViewError("")

    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: viewPassword }),
      })

      const data = await response.json()

      if (data.valid) {
        setViewVerified(true)
        setViewPassword("")
        toast.success("Kirish muvaffaqiyatli")
      } else {
        setViewError("Noto'g'ri parol")
        toast.error("Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setViewError("Parolni tekshirishda xatolik yuz berdi")
      toast.error("Parolni tekshirishda xatolik")
    } finally {
      setViewLoading(false)
    }
  }

  const fetchStorageInfo = async () => {
    try {
      // Fetch Supabase storage info
      const { data: buckets } = await supabase.storage.listBuckets()
      let totalSize = 0
      let fileCount = 0

      if (buckets) {
        for (const bucket of buckets) {
          const { data: files } = await supabase.storage.from(bucket.name).list()
          if (files) {
            fileCount += files.length
            files.forEach((file) => {
              totalSize += file.metadata?.size || 0
            })
          }
        }
      }

      setSupabaseStorage({
        totalSize,
        fileCount,
        buckets: buckets?.map((b) => b.name) || [],
      })

      // Fetch R2 storage info
      const r2Response = await fetch("/api/r2/storage-info")
      const r2Data = await r2Response.json()

      if (r2data.valid) {
        setR2Storage(r2Data.storage)
      }
    } catch (error) {
      console.error("Error fetching storage info:", error)
      toast.error("Xotira ma'lumotlarini yuklashda xatolik")
    }
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)

      if (currentProvider === "r2") {
        const response = await fetch("/api/r2/files")
        const data = await response.json()

        if (data.valid) {
          setFiles(data.files || [])
        } else {
          throw new Error(data.error)
        }
      } else {
        // Supabase Storage
        const { data, error } = await supabase.storage.from("products").list()
        if (error) throw error

        setFiles(
          data?.map((file) => ({
            id: file.name,
            name: file.name,
            size: file.metadata?.size,
            created_at: file.created_at,
            updated_at: file.updated_at,
            mimeType: file.metadata?.mimetype,
          })) || [],
        )
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      toast.error("Fayllarni yuklashda xatolik")
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const verifySettingsAccess = async () => {
    if (!settingsPassword) {
      setSettingsError("MD parolni kiriting")
      return
    }

    setSettingsLoading(true)
    setSettingsError("")

    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: settingsPassword }),
      })

      const data = await response.json()

      if (data.valid) {
        setSettingsVerified(true)
        setSettingsPassword("")
        toast.success("Sozlamalarga kirish muvaffaqiyatli")
      } else {
        setSettingsError("Noto'g'ri parol")
        toast.error("Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setSettingsError("Parolni tekshirishda xatolik yuz berdi")
      toast.error("Parolni tekshirishda xatolik")
    } finally {
      setSettingsLoading(false)
    }
  }

  const saveStorageSettings = async () => {
    setSavingSettings(true)
    try {
      const newSettings = {
        current_provider: currentProvider,
        product_storage_provider: productStorageProvider,
        worker_storage_provider: workerStorageProvider,
        updated_at: new Date().toISOString(),
      }

      localStorage.setItem("storage_settings", JSON.stringify(newSettings))

      // Refresh files with new storage provider
      await fetchFiles()

      toast.success("Xotira sozlamalari muvaffaqiyatli saqlandi!")
      setShowSettings(false)
      setSettingsVerified(false)
    } catch (error) {
      console.error("Error saving storage settings:", error)
      toast.error("Sozlamalarni saqlashda xatolik yuz berdi")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      const video = document.createElement("video")
      video.srcObject = stream
      video.play()

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext("2d")
      context?.drawImage(video, 0, 0)

      stream.getTracks().forEach((track) => track.stop())

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)
            setSelectedFiles(dataTransfer.files)
            toast.success("Rasm muvaffaqiyatli olindi")
          }
        },
        "image/jpeg",
        0.8,
      )
    } catch (error) {
      console.error("Camera error:", error)
      toast.error("Kameraga kirish xatoligi")
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("Fayl tanlang")
      return
    }

    setUploading(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        if (currentProvider === "r2") {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/r2/upload", {
            method: "POST",
            body: formData,
          })

          const data = await response.json()
          if (!data.valid) throw new Error(data.error)
        } else {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

          const { error } = await supabase.storage.from("products").upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          })

          if (error) throw error
        }
      }

      await fetchFiles()
      await fetchStorageInfo()
      toast.success("Fayllar muvaffaqiyatli yuklandi!")
      setSelectedFiles(null)
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Fayllarni yuklashda xatolik yuz berdi")
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileName: string, fileId?: string) => {
    if (!confirm("Bu faylni o'chirishni tasdiqlaysizmi?")) return

    try {
      if (currentProvider === "r2") {
        const response = await fetch(`/api/r2/delete?key=${encodeURIComponent(fileId || fileName)}`, {
          method: "DELETE",
        })

        const data = await response.json()
        if (!data.valid) throw new Error(data.error)
      } else {
        const { error } = await supabase.storage.from("products").remove([fileName])
        if (error) throw error
      }

      await fetchFiles()
      await fetchStorageInfo()
      toast.success("Fayl muvaffaqiyatli o'chirildi!")
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Faylni o'chirishda xatolik yuz berdi")
    }
  }

  const getFileUrl = (fileName: string, fileUrl?: string) => {
    if (currentProvider === "r2" && fileUrl) {
      return fileUrl
    } else {
      const { data } = supabase.storage.from("products").getPublicUrl(fileName)
      return data.publicUrl
    }
  }

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-4 w-4" />
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (mimeType.startsWith("video/")) return <Video className="h-4 w-4" />
    if (mimeType.startsWith("audio/")) return <Music className="h-4 w-4" />
    if (mimeType.includes("text") || mimeType.includes("document")) return <FileText className="h-4 w-4" />
    if (mimeType.includes("zip") || mimeType.includes("rar")) return <Archive className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  if (!viewVerified) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="max-w-md mx-auto mt-20">
          <Card className="ios-card">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Shield className="h-6 w-6 text-orange-600" />
                Himoyalangan bo'lim
              </CardTitle>
              <CardDescription>Xotira boshqaruviga kirish uchun MD parolni kiriting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {viewError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{viewError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="view-password">MD Parol</Label>
                <Input
                  id="view-password"
                  type="password"
                  value={viewPassword}
                  onChange={(e) => setViewPassword(e.target.value)}
                  placeholder="MD parolni kiriting"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      verifyViewAccess()
                    }
                  }}
                />
              </div>

              <Button onClick={verifyViewAccess} disabled={viewLoading || !viewPassword} className="w-full">
                {viewLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Kirish
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-8 w-8" />
            Xotira boshqaruvi
          </h1>
          <p className="text-muted-foreground">Fayllar va xotira sozlamalari</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Sozlamalar
          </Button>
          <Button onClick={() => fetchFiles()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yangilash
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Supabase Storage
            </CardTitle>
            <CardDescription>Mahalliy xotira ma'lumotlari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supabaseStorage ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Jami fayllar:</span>
                    <span className="font-medium">{supabaseStorage.fileCount} ta</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Jami hajm:</span>
                    <span className="font-medium">{formatFileSize(supabaseStorage.totalSize)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bucketlar:</span>
                    <span className="font-medium">{supabaseStorage.buckets.length} ta</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Bucketlar ro'yxati:</div>
                  <div className="flex flex-wrap gap-1">
                    {supabaseStorage.buckets.map((bucket) => (
                      <Badge key={bucket} variant="outline" className="text-xs">
                        {bucket}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-600" />
              Cloudflare R2
            </CardTitle>
            <CardDescription>Bulutli xotira ma'lumotlari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {r2Storage ? (
              <>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Jami fayllar:</span>
                      <span className="font-medium">{r2Storage.totalFiles} ta</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Jami hajm:</span>
                      <span className="font-medium">{r2Storage.totalSizeGB} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Maksimal:</span>
                      <span className="font-medium">{r2Storage.maxStorageGB} GB</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Ishlatilish:</span>
                      <span>{r2Storage.usedPercentage}%</span>
                    </div>
                    <Progress value={Number.parseFloat(r2Storage.usedPercentage)} className="h-2" />
                  </div>
                  <div className="text-xs text-muted-foreground">Bucket: {r2Storage.bucketName}</div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentProvider === "r2" ? (
                <Server className="h-8 w-8 text-orange-600" />
              ) : (
                <Database className="h-8 w-8 text-green-600" />
              )}
              <div>
                <h3 className="font-semibold">{currentProvider === "r2" ? "Cloudflare R2" : "Supabase Storage"}</h3>
                <p className="text-sm text-muted-foreground">Hozirgi fayl yuklash provayderi</p>
              </div>
            </div>
            <Badge variant={currentProvider === "r2" ? "default" : "secondary"}>
              {currentProvider === "r2" ? "Bulutli" : "Mahalliy"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fayl yuklash</CardTitle>
          <CardDescription>
            {currentProvider === "r2" ? "Cloudflare R2" : "Supabase Storage"} ga fayllarni yuklang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch id="camera-mode" checked={useCamera} onCheckedChange={setUseCamera} />
            <Label htmlFor="camera-mode">Kamera rejimi</Label>
          </div>

          {useCamera ? (
            <div className="space-y-4">
              <Button onClick={handleCameraCapture} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Rasmga olish
              </Button>
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">{selectedFiles.length} ta rasm olindi</div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8">
              <input
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-12 w-12 text-muted-foreground" />
                )}
                <p className="text-lg font-medium mt-4">
                  {uploading ? "Yuklanmoqda..." : "Fayllarni yuklash uchun bosing"}
                </p>
                <p className="text-sm text-muted-foreground">Yoki fayllarni bu yerga sudrab olib keling</p>
              </label>
            </div>
          )}

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{selectedFiles.length} ta fayl tanlandi</p>
              <Button onClick={handleFileUpload} disabled={uploading} className="w-full">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Yuklash
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yuklangan fayllar</CardTitle>
          <CardDescription>
            {currentProvider === "r2" ? "Cloudflare R2" : "Supabase Storage"} dagi fayllar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Fayllar yuklanmoqda...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Hech qanday fayl topilmadi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={file.id || index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.mimeType)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        {file.created_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(file.created_at).toLocaleDateString("uz-UZ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getFileUrl(file.name, file.url), "_blank")}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getFileUrl(file.name, file.url)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = file.name
                        a.click()
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFile(file.name, file.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Xotira sozlamalari
              </CardTitle>
              <CardDescription>Fayllarni saqlash joyini sozlang (MD parol himoyasi)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!settingsVerified ? (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Himoyalangan sozlamalar</span>
                  </div>

                  {settingsError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{settingsError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="settings-password">MD Parol</Label>
                    <Input
                      id="settings-password"
                      type="password"
                      value={settingsPassword}
                      onChange={(e) => setSettingsPassword(e.target.value)}
                      placeholder="MD parolni kiriting"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          verifySettingsAccess()
                        }
                      }}
                    />
                  </div>

                  <Button
                    onClick={verifySettingsAccess}
                    disabled={settingsLoading || !settingsPassword}
                    className="w-full"
                  >
                    {settingsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Tekshirilmoqda...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Sozlamalarga kirish
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label>Hozirgi fayl yuklash provayderi</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        className={`cursor-pointer transition-all ${
                          currentProvider === "supabase" ? "ring-2 ring-primary" : "hover:shadow-md"
                        }`}
                        onClick={() => setCurrentProvider("supabase")}
                      >
                        <CardContent className="p-4 text-center">
                          <Database className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <h4 className="font-medium">Supabase Storage</h4>
                          <p className="text-sm text-muted-foreground">Mahalliy xotira</p>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer transition-all ${
                          currentProvider === "r2" ? "ring-2 ring-primary" : "hover:shadow-md"
                        }`}
                        onClick={() => setCurrentProvider("r2")}
                      >
                        <CardContent className="p-4 text-center">
                          <Server className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                          <h4 className="font-medium">Cloudflare R2</h4>
                          <p className="text-sm text-muted-foreground">Bulutli xotira</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Maxsus xotira sozlamalari</Label>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Mahsulot rasmlari uchun
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={productStorageProvider === "supabase" ? "default" : "outline"}
                          onClick={() => setProductStorageProvider("supabase")}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Supabase
                        </Button>
                        <Button
                          variant={productStorageProvider === "r2" ? "default" : "outline"}
                          onClick={() => setProductStorageProvider("r2")}
                        >
                          <Server className="h-4 w-4 mr-2" />
                          Cloudflare R2
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Ishchilar ma'lumotlari uchun
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={workerStorageProvider === "supabase" ? "default" : "outline"}
                          onClick={() => setWorkerStorageProvider("supabase")}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Supabase
                        </Button>
                        <Button
                          variant={workerStorageProvider === "r2" ? "default" : "outline"}
                          onClick={() => setWorkerStorageProvider("r2")}
                        >
                          <Server className="h-4 w-4 mr-2" />
                          Cloudflare R2
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Muhim eslatma:</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• Mavjud fayllar o'z joyida qoladi</li>
                        <li>• Yangi yuklangan fayllar tanlangan provayderga saqlanadi</li>
                        <li>• Cloudflare R2 yuqori tezlik va arzon narxni ta'minlaydi</li>
                        <li>• Har bir fayl turi uchun alohida provayder tanlash mumkin</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSettings(false)
                    setSettingsVerified(false)
                    setSettingsPassword("")
                    setSettingsError("")
                  }}
                  className="flex-1"
                >
                  Bekor qilish
                </Button>
                {settingsVerified && (
                  <Button onClick={saveStorageSettings} disabled={savingSettings} className="flex-1">
                    {savingSettings ? (
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
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
