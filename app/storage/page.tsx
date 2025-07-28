"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Upload,
  Trash2,
  Eye,
  Settings,
  HardDrive,
  Cloud,
  Shield,
  Camera,
  ImageIcon,
  FileText,
  Video,
  Music,
  Archive,
  File,
  LogIn,
  LogOut,
  User,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface StorageFile {
  id: string
  name: string
  size?: number
  mimeType?: string
  createdTime?: string
  modifiedTime?: string
  webViewLink?: string
}

interface StorageInfo {
  used: number
  total: number
  available: number
}

export default function StoragePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mdPasswordVerified, setMdPasswordVerified] = useState(false)
  const [mdPassword, setMdPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<StorageFile[]>([])
  const [storageProvider, setStorageProvider] = useState<"supabase" | "google">("supabase")
  const [supabaseInfo, setSupabaseInfo] = useState<StorageInfo | null>(null)
  const [googleInfo, setGoogleInfo] = useState<StorageInfo | null>(null)
  const [googleUser, setGoogleUser] = useState<any>(null)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [useCamera, setUseCamera] = useState(false)

  useEffect(() => {
    checkMdPasswordStatus()
    checkGoogleAuth()
    loadFiles()
    loadStorageInfo()
  }, [storageProvider])

  const checkMdPasswordStatus = async () => {
    try {
      const response = await fetch("/api/md-password")
      const data = await response.json()
      setMdPasswordVerified(data.verified)
    } catch (error) {
      console.error("Error checking MD password:", error)
    }
  }

  const verifyMdPassword = async () => {
    if (!mdPassword.trim()) {
      toast.error("MD parolni kiriting")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mdPassword }),
      })

      const data = await response.json()
      if (data.success) {
        setMdPasswordVerified(true)
        setMdPassword("")
        toast.success("MD parol tasdiqlandi")
      } else {
        toast.error("Noto'g'ri MD parol")
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const checkGoogleAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.app_metadata?.providers?.includes("google")) {
        setIsAuthenticated(true)
        setGoogleUser(session.user)

        // Get Google access token
        const response = await fetch("/api/google-drive/auth-supabase", {
          method: "POST",
        })
        const data = await response.json()
        if (data.success) {
          setGoogleAccessToken(data.accessToken)
        }
      }
    } catch (error) {
      console.error("Error checking Google auth:", error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile",
          redirectTo: `${window.location.origin}/storage`,
        },
      })

      if (error) {
        toast.error("Google bilan kirish xatoligi")
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi")
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setIsAuthenticated(false)
      setGoogleUser(null)
      setGoogleAccessToken(null)
      toast.success("Tizimdan chiqildi")
    } catch (error) {
      toast.error("Chiqish xatoligi")
    }
  }

  const loadFiles = async () => {
    setLoading(true)
    try {
      if (storageProvider === "supabase") {
        const { data, error } = await supabase.storage.from("files").list()
        if (error) throw error
        setFiles(
          data?.map((file) => ({
            id: file.name,
            name: file.name,
            size: file.metadata?.size,
            mimeType: file.metadata?.mimetype,
            createdTime: file.created_at,
            modifiedTime: file.updated_at,
          })) || [],
        )
      } else if (storageProvider === "google" && googleAccessToken) {
        const response = await fetch(`/api/google-drive/files-supabase?accessToken=${googleAccessToken}`)
        const data = await response.json()
        if (data.files) {
          setFiles(data.files)
        }
      }
    } catch (error) {
      console.error("Error loading files:", error)
      toast.error("Fayllarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const loadStorageInfo = async () => {
    try {
      if (storageProvider === "supabase") {
        // Supabase storage info (approximate)
        const { data, error } = await supabase.storage.from("files").list()
        if (!error && data) {
          const totalSize = data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          setSupabaseInfo({
            used: totalSize,
            total: 1024 * 1024 * 1024, // 1GB limit (approximate)
            available: 1024 * 1024 * 1024 - totalSize,
          })
        }
      } else if (storageProvider === "google" && googleAccessToken) {
        const response = await fetch(`/api/google-drive/storage-info-supabase?accessToken=${googleAccessToken}`)
        const data = await response.json()
        if (data.storageQuota) {
          const quota = data.storageQuota
          setGoogleInfo({
            used: Number.parseInt(quota.usage || "0"),
            total: Number.parseInt(quota.limit || "0"),
            available: Number.parseInt(quota.limit || "0") - Number.parseInt(quota.usage || "0"),
          })
        }
      }
    } catch (error) {
      console.error("Error loading storage info:", error)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("Fayl tanlang")
      return
    }

    setLoading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        if (storageProvider === "supabase") {
          const { error } = await supabase.storage.from("files").upload(file.name, file)

          if (error) throw error
        } else if (storageProvider === "google" && googleAccessToken) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("accessToken", googleAccessToken)

          const response = await fetch("/api/google-drive/upload-supabase", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) throw new Error("Upload failed")
        }

        setUploadProgress(((i + 1) / selectedFiles.length) * 100)
      }

      toast.success("Fayllar muvaffaqiyatli yuklandi")
      loadFiles()
      loadStorageInfo()
      setSelectedFiles(null)
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Fayl yuklashda xatolik")
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const video = document.createElement("video")
      video.srcObject = stream
      video.play()

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")

      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context?.drawImage(video, 0, 0)

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
              const fileList = new DataTransfer()
              fileList.items.add(file)
              setSelectedFiles(fileList.files)
            }
            stream.getTracks().forEach((track) => track.stop())
          },
          "image/jpeg",
          0.8,
        )
      })
    } catch (error) {
      toast.error("Kameraga kirish xatoligi")
    }
  }

  const deleteFile = async (fileId: string) => {
    setLoading(true)
    try {
      if (storageProvider === "supabase") {
        const { error } = await supabase.storage.from("files").remove([fileId])
        if (error) throw error
      } else if (storageProvider === "google" && googleAccessToken) {
        const response = await fetch(
          `/api/google-drive/delete-supabase?fileId=${fileId}&accessToken=${googleAccessToken}`,
          {
            method: "DELETE",
          },
        )
        if (!response.ok) throw new Error("Delete failed")
      }

      toast.success("Fayl o'chirildi")
      loadFiles()
      loadStorageInfo()
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Fayl o'chirishda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
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

  if (!mdPasswordVerified) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Himoyalangan bo'lim</CardTitle>
            <CardDescription>Bu bo'limga kirish uchun MD parolni kiriting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mdPassword">MD Parol</Label>
              <Input
                id="mdPassword"
                type="password"
                value={mdPassword}
                onChange={(e) => setMdPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && verifyMdPassword()}
                placeholder="MD parolni kiriting"
              />
            </div>
            <Button onClick={verifyMdPassword} disabled={loading} className="w-full">
              {loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStorageInfo = storageProvider === "supabase" ? supabaseInfo : googleInfo
  const usagePercentage = currentStorageInfo ? (currentStorageInfo.used / currentStorageInfo.total) * 100 : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fayl Xotirasi</h1>
          <p className="text-muted-foreground">Fayllarni boshqaring va saqlang</p>
        </div>
        <div className="flex items-center gap-4">
          {storageProvider === "google" && (
            <div className="flex items-center gap-2">
              {isAuthenticated && googleUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={googleUser.user_metadata?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{googleUser.user_metadata?.full_name}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Chiqish
                  </Button>
                </div>
              ) : (
                <Button onClick={signInWithGoogle}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Google bilan kirish
                </Button>
              )}
            </div>
          )}
          <Button onClick={loadFiles} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Storage Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Xotira Sozlamalari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Xotira Provayderi</Label>
            <Select value={storageProvider} onValueChange={(value: "supabase" | "google") => setStorageProvider(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supabase">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Supabase Storage
                  </div>
                </SelectItem>
                <SelectItem value="google">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Google Drive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {storageProvider === "google" && !isAuthenticated && (
            <Alert>
              <AlertDescription>Google Drive dan foydalanish uchun Google akkauntingiz bilan kiring.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Storage Usage */}
      {currentStorageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {storageProvider === "supabase" ? <HardDrive className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
              Xotira Statistikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ishlatilgan: {formatFileSize(currentStorageInfo.used)}</span>
                <span>Jami: {formatFileSize(currentStorageInfo.total)}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <div className="text-xs text-muted-foreground text-center">{usagePercentage.toFixed(1)}% ishlatilgan</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Fayl Yuklash
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="camera-mode" checked={useCamera} onCheckedChange={setUseCamera} />
              <Label htmlFor="camera-mode">Kamera rejimi</Label>
            </div>
          </div>

          {useCamera ? (
            <div className="space-y-4">
              <Button onClick={handleCameraCapture} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Rasmga olish
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input type="file" multiple onChange={(e) => setSelectedFiles(e.target.files)} accept="*/*" />
            </div>
          )}

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{selectedFiles.length} ta fayl tanlandi</p>
              {uploadProgress > 0 && <Progress value={uploadProgress} className="h-2" />}
            </div>
          )}

          <Button
            onClick={handleFileUpload}
            disabled={
              loading ||
              !selectedFiles ||
              selectedFiles.length === 0 ||
              (storageProvider === "google" && !isAuthenticated)
            }
            className="w-full"
          >
            {loading ? "Yuklanmoqda..." : "Yuklash"}
          </Button>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Fayllar ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Yuklanmoqda...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Hech qanday fayl topilmadi</div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.mimeType)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} •{" "}
                        {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.webViewLink && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => deleteFile(file.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
