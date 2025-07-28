"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import {
  HardDrive,
  Upload,
  Trash2,
  Settings,
  Database,
  Cloud,
  Shield,
  Lock,
  Key,
  Loader2,
  Save,
  RefreshCw,
  Eye,
  Download,
  User,
  ImageIcon,
  Users,
  LogIn,
  LogOut,
  Camera,
  FileText,
  Video,
  Music,
  Archive,
  File,
  AlertCircle,
} from "lucide-react"

interface StorageFile {
  id: string
  name: string
  size?: number
  created_at?: string
  updated_at?: string
  mimeType?: string
  webViewLink?: string
  thumbnailLink?: string
}

interface GoogleDriveStorage {
  total: number
  used: number
  free: number
  totalGB: string
  usedGB: string
  freeGB: string
  usagePercentage: string
}

interface SupabaseStorage {
  totalSize: number
  fileCount: number
  buckets: string[]
}

interface GoogleUser {
  displayName: string
  emailAddress: string
  picture?: string
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
  const [currentProvider, setCurrentProvider] = useState<"supabase" | "google_drive">("supabase")
  const [productStorageProvider, setProductStorageProvider] = useState<"supabase" | "google_drive">("supabase")
  const [workerStorageProvider, setWorkerStorageProvider] = useState<"supabase" | "google_drive">("supabase")

  // Google Drive OAuth via Supabase
  const [googleAccessToken, setGoogleAccessToken] = useState<string>("")
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [googleDriveStorage, setGoogleDriveStorage] = useState<GoogleDriveStorage | null>(null)
  const [supabaseStorage, setSupabaseStorage] = useState<SupabaseStorage | null>(null)
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false)
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false)

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
    checkGoogleAuth()
  }, [])

  useEffect(() => {
    if (viewVerified) {
      fetchStorageInfo()
      fetchFiles()
    }
  }, [viewVerified, currentProvider, isGoogleAuthenticated])

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

  const checkGoogleAuth = async () => {
    try {
      const response = await fetch("/api/google-drive/auth", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setGoogleAccessToken(data.accessToken)
        setGoogleUser({
          displayName: data.user.name || data.user.email,
          emailAddress: data.user.email,
          picture: data.user.avatar,
        })
        setIsGoogleAuthenticated(true)
      } else if (data.needsAuth) {
        setIsGoogleAuthenticated(false)
      }
    } catch (error) {
      console.error("Error checking Google auth:", error)
      setIsGoogleAuthenticated(false)
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
      } else {
        setViewError(data.error || "Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setViewError("Parolni tekshirishda xatolik yuz berdi")
    } finally {
      setViewLoading(false)
    }
  }

  const authenticateGoogleDrive = async () => {
    setGoogleAuthLoading(true)
    try {
      // Sign in with Google via Supabase Auth with Drive scopes
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes:
            "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
          redirectTo: `${window.location.origin}/storage`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("Error signing in with Google:", error)
        alert("Google bilan kirish xatoligi: " + error.message)
      }
    } catch (error) {
      console.error("Error authenticating Google Drive:", error)
      alert("Google Drive autentifikatsiyasida xatolik")
    } finally {
      setGoogleAuthLoading(false)
    }
  }

  const signOutGoogle = async () => {
    try {
      await supabase.auth.signOut()
      setGoogleAccessToken("")
      setGoogleUser(null)
      setGoogleDriveStorage(null)
      setIsGoogleAuthenticated(false)

      // Switch to Supabase if currently using Google Drive
      if (currentProvider === "google_drive") {
        setCurrentProvider("supabase")
      }
    } catch (error) {
      console.error("Error signing out:", error)
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

      // Fetch Google Drive info if authenticated
      if (googleAccessToken && isGoogleAuthenticated) {
        await fetchGoogleDriveInfo()
      }
    } catch (error) {
      console.error("Error fetching storage info:", error)
    }
  }

  const fetchGoogleDriveInfo = async () => {
    if (!googleAccessToken) return

    try {
      const response = await fetch("/api/google-drive/storage-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: googleAccessToken }),
      })

      const data = await response.json()

      if (data.success) {
        setGoogleDriveStorage(data.storage)
        setGoogleUser(data.user)
      }
    } catch (error) {
      console.error("Error fetching Google Drive info:", error)
    }
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)

      if (currentProvider === "google_drive" && googleAccessToken && isGoogleAuthenticated) {
        const response = await fetch("/api/google-drive/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: googleAccessToken }),
        })
        const data = await response.json()
        setFiles(data.files || [])
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
      } else {
        setSettingsError(data.error || "Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setSettingsError("Parolni tekshirishda xatolik yuz berdi")
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

      alert("Xotira sozlamalari muvaffaqiyatli saqlandi!")
      setShowSettings(false)
      setSettingsVerified(false)
    } catch (error) {
      console.error("Error saving storage settings:", error)
      alert("Sozlamalarni saqlashda xatolik yuz berdi")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      })

      // Create video element
      const video = document.createElement("video")
      video.srcObject = stream
      video.play()

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      // Create canvas and capture frame
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext("2d")
      context?.drawImage(video, 0, 0)

      // Stop camera stream
      stream.getTracks().forEach((track) => track.stop())

      // Convert to blob and create file
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)
            setSelectedFiles(dataTransfer.files)
          }
        },
        "image/jpeg",
        0.8,
      )
    } catch (error) {
      console.error("Camera error:", error)
      alert("Kameraga kirish xatoligi")
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        if (currentProvider === "google_drive" && googleAccessToken && isGoogleAuthenticated) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("accessToken", googleAccessToken)

          const response = await fetch("/api/google-drive/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) throw new Error("Google Drive upload failed")
        } else {
          // Supabase Storage
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
      alert("Fayllar muvaffaqiyatli yuklandi!")
      setSelectedFiles(null)
    } catch (error) {
      console.error("Error uploading files:", error)
      alert("Fayllarni yuklashda xatolik yuz berdi")
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileName: string, fileId?: string) => {
    if (!confirm("Bu faylni o'chirishni tasdiqlaysizmi?")) return

    try {
      if (currentProvider === "google_drive" && googleAccessToken && fileId && isGoogleAuthenticated) {
        const response = await fetch("/api/google-drive/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: googleAccessToken, fileId }),
        })

        if (!response.ok) throw new Error("Failed to delete Google Drive file")
      } else {
        // Supabase Storage
        const { error } = await supabase.storage.from("products").remove([fileName])
        if (error) throw error
      }

      await fetchFiles()
      await fetchStorageInfo()
      alert("Fayl muvaffaqiyatli o'chirildi!")
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Faylni o'chirishda xatolik yuz berdi")
    }
  }

  const getFileUrl = (fileName: string, fileId?: string) => {
    if (currentProvider === "google_drive" && fileId) {
      return `https://drive.google.com/file/d/${fileId}/view`
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

  // If not verified, show password prompt
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
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                  {viewError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="view-password">MD Parol</Label>
                <Input
                  id="view-password"
                  type="password"
                  value={viewPassword}
                  onChange={(e) => setViewPassword(e.target.value)}
                  placeholder="MD parolni kiriting"
                  pattern="[0-9]*"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      verifyViewAccess()
                    }
                  }}
                />
              </div>

              <Button onClick={verifyViewAccess} disabled={viewLoading || !viewPassword} className="w-full ios-button">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-8 w-8" />
            Xotira boshqaruvi
          </h1>
          <p className="text-muted-foreground">Fayllar va xotira sozlamalari</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)} className="ios-button bg-transparent">
            <Settings className="h-4 w-4 mr-2" />
            Sozlamalar
          </Button>
          <Button onClick={() => fetchFiles()} variant="outline" className="ios-button bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase Storage */}
        <Card className="ios-card">
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

        {/* Google Drive Storage */}
        <Card className="ios-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              Google Drive
            </CardTitle>
            <CardDescription>Bulutli xotira ma'lumotlari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isGoogleAuthenticated ? (
              <div className="text-center py-4">
                <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">Google Drive bilan bog'lanmagan</p>
                <Button onClick={authenticateGoogleDrive} disabled={googleAuthLoading} className="ios-button">
                  {googleAuthLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bog'lanmoqda...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Google bilan kirish
                    </>
                  )}
                </Button>
              </div>
            ) : googleDriveStorage ? (
              <>
                {googleUser && (
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={googleUser.picture || "/placeholder.svg"} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{googleUser.displayName}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={signOutGoogle} className="ios-button bg-transparent">
                      <LogOut className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Jami hajm:</span>
                      <span className="font-medium">{googleDriveStorage.totalGB} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ishlatilgan:</span>
                      <span className="font-medium">{googleDriveStorage.usedGB} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bo'sh:</span>
                      <span className="font-medium">{googleDriveStorage.freeGB} GB</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Ishlatilish:</span>
                      <span>{googleDriveStorage.usagePercentage}%</span>
                    </div>
                    <Progress value={Number.parseFloat(googleDriveStorage.usagePercentage)} className="h-2" />
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
      </div>

      {/* Current Storage Provider */}
      <Card className="ios-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentProvider === "google_drive" ? (
                <Cloud className="h-8 w-8 text-blue-600" />
              ) : (
                <Database className="h-8 w-8 text-green-600" />
              )}
              <div>
                <h3 className="font-semibold">
                  {currentProvider === "google_drive" ? "Google Drive" : "Supabase Storage"}
                </h3>
                <p className="text-sm text-muted-foreground">Hozirgi fayl yuklash provayderi</p>
              </div>
            </div>
            <Badge variant={currentProvider === "google_drive" ? "default" : "secondary"}>
              {currentProvider === "google_drive" ? "Bulutli" : "Mahalliy"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Fayl yuklash</CardTitle>
          <CardDescription>
            {currentProvider === "google_drive" ? "Google Drive" : "Supabase Storage"} ga fayllarni yuklang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Toggle */}
          <div className="flex items-center space-x-2">
            <Switch id="camera-mode" checked={useCamera} onCheckedChange={setUseCamera} />
            <Label htmlFor="camera-mode">Kamera rejimi</Label>
          </div>

          {useCamera ? (
            <div className="space-y-4">
              <Button onClick={handleCameraCapture} className="w-full ios-button">
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
                disabled={uploading || (currentProvider === "google_drive" && !isGoogleAuthenticated)}
              />
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-12 w-12 text-muted-foreground" />
                )}
                <p className="text-lg font-medium mt-4">
                  {uploading
                    ? "Yuklanmoqda..."
                    : currentProvider === "google_drive" && !isGoogleAuthenticated
                      ? "Google Drive bilan bog'laning"
                      : "Fayllarni yuklash uchun bosing"}
                </p>
                <p className="text-sm text-muted-foreground">Yoki fayllarni bu yerga sudrab olib keling</p>
              </label>
            </div>
          )}

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{selectedFiles.length} ta fayl tanlandi</p>
              <Button
                onClick={handleFileUpload}
                disabled={uploading || (currentProvider === "google_drive" && !isGoogleAuthenticated)}
                className="w-full ios-button"
              >
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

          {currentProvider === "google_drive" && !isGoogleAuthenticated && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Google Drive ga fayl yuklash uchun Google akkauntingiz bilan kiring.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Yuklangan fayllar</CardTitle>
          <CardDescription>
            {currentProvider === "google_drive" ? "Google Drive" : "Supabase Storage"} dagi fayllar
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
                      onClick={() => window.open(getFileUrl(file.name, file.id), "_blank")}
                      className="ios-button bg-transparent"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getFileUrl(file.name, file.id)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = file.name
                        a.click()
                      }}
                      className="ios-button bg-transparent"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFile(file.name, file.id)}
                      className="ios-button bg-transparent text-destructive hover:text-destructive"
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

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl mx-4 ios-card max-h-[90vh] overflow-y-auto">
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
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                      {settingsError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="settings-password">MD Parol</Label>
                    <Input
                      id="settings-password"
                      type="password"
                      value={settingsPassword}
                      onChange={(e) => setSettingsPassword(e.target.value)}
                      placeholder="MD parolni kiriting"
                      pattern="[0-9]*"
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
                    className="w-full ios-button"
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
                  {/* Current Provider */}
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
                          currentProvider === "google_drive" ? "ring-2 ring-primary" : "hover:shadow-md"
                        }`}
                        onClick={() => setCurrentProvider("google_drive")}
                      >
                        <CardContent className="p-4 text-center">
                          <Cloud className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <h4 className="font-medium">Google Drive</h4>
                          <p className="text-sm text-muted-foreground">Bulutli xotira</p>
                          {!isGoogleAuthenticated && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Bog'lanmagan
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Specific Storage Settings */}
                  <div className="space-y-4">
                    <Label>Maxsus xotira sozlamalari</Label>

                    {/* Product Storage */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Mahsulot rasmlari uchun
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={productStorageProvider === "supabase" ? "default" : "outline"}
                          onClick={() => setProductStorageProvider("supabase")}
                          className="ios-button"
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Supabase
                        </Button>
                        <Button
                          variant={productStorageProvider === "google_drive" ? "default" : "outline"}
                          onClick={() => setProductStorageProvider("google_drive")}
                          className="ios-button"
                          disabled={!isGoogleAuthenticated}
                        >
                          <Cloud className="h-4 w-4 mr-2" />
                          Google Drive
                        </Button>
                      </div>
                    </div>

                    {/* Worker Storage */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Ishchilar ma'lumotlari uchun
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={workerStorageProvider === "supabase" ? "default" : "outline"}
                          onClick={() => setWorkerStorageProvider("supabase")}
                          className="ios-button"
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Supabase
                        </Button>
                        <Button
                          variant={workerStorageProvider === "google_drive" ? "default" : "outline"}
                          onClick={() => setWorkerStorageProvider("google_drive")}
                          className="ios-button"
                          disabled={!isGoogleAuthenticated}
                        >
                          <Cloud className="h-4 w-4 mr-2" />
                          Google Drive
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Google Drive Authentication */}
                  {!isGoogleAuthenticated && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-3">
                        <Cloud className="h-4 w-4" />
                        <span className="font-medium">Google Drive bog'lanishi</span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        Google Drive xususiyatlaridan foydalanish uchun Supabase Auth orqali Google bilan kiring
                      </p>
                      <Button onClick={authenticateGoogleDrive} disabled={googleAuthLoading} className="ios-button">
                        {googleAuthLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Bog'lanmoqda...
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-2" />
                            Google bilan kirish
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Muhim eslatma</span>
                    </div>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Mavjud fayllar o'z joyida qoladi</li>
                      <li>• Yangi yuklangan fayllar tanlangan provayderga saqlanadi</li>
                      <li>• Google Drive uchun Supabase Auth orqali autentifikatsiya talab qilinadi</li>
                      <li>• Har bir fayl turi uchun alohida provayder tanlash mumkin</li>
                    </ul>
                  </div>
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
                  className="flex-1 ios-button bg-transparent"
                >
                  Bekor qilish
                </Button>
                {settingsVerified && (
                  <Button onClick={saveStorageSettings} disabled={savingSettings} className="flex-1 ios-button">
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
