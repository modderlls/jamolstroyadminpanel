"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Download,
  Trash2,
  File,
  ImageIcon,
  Video,
  FileText,
  Archive,
  RefreshCw,
  HardDrive,
  Cloud,
  Search,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface StorageFile {
  id: string
  name: string
  size: number
  created_at: string
  updated_at: string
  mimeType?: string
  url?: string
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
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all") // Updated default value to "all"
  const [activeTab, setActiveTab] = useState("supabase")
  const [mdPasswordDialogOpen, setMdPasswordDialogOpen] = useState(false)
  const [mdPassword, setMdPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check MD password authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/md-password/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: localStorage.getItem("md_temp_password") || "" }),
        })
        const data = await response.json()
        setIsAuthenticated(data.valid)
        if (!data.valid) {
          setMdPasswordDialogOpen(true)
        }
      } catch (error) {
        setMdPasswordDialogOpen(true)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles()
      fetchStorageInfo()
    }
  }, [activeTab, isAuthenticated])

  const handleMdPasswordSubmit = async () => {
    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mdPassword }),
      })
      const data = await response.json()

      if (data.valid) {
        localStorage.setItem("md_temp_password", mdPassword)
        setIsAuthenticated(true)
        setMdPasswordDialogOpen(false)
        setMdPassword("")
        toast.success("Kirish muvaffaqiyatli")
      } else {
        toast.error("Noto'g'ri parol")
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi")
    }
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      let response

      if (activeTab === "r2") {
        response = await fetch("/api/r2/files")
      } else {
        const { data, error } = await supabase.storage.from("products").list("", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        })

        if (error) throw error

        const filesWithUrls = await Promise.all(
          (data || []).map(async (file) => {
            const {
              data: { publicUrl },
            } = supabase.storage.from("products").getPublicUrl(file.name)

            return {
              id: file.id || file.name,
              name: file.name,
              size: file.metadata?.size || 0,
              created_at: file.created_at || new Date().toISOString(),
              updated_at: file.updated_at || new Date().toISOString(),
              mimeType: file.metadata?.mimetype || "application/octet-stream",
              url: publicUrl,
            }
          }),
        )

        setFiles(filesWithUrls)
        return
      }

      const data = await response.json()
      if (data.success) {
        setFiles(data.files || [])
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      toast.error("Fayllarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const fetchStorageInfo = async () => {
    try {
      let response

      if (activeTab === "r2") {
        response = await fetch("/api/r2/storage-info")
      } else {
        // For Supabase, we'll calculate from the files list
        const totalFiles = files.length
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2)
        const maxStorage = 1024 * 1024 * 1024 // 1GB for free tier
        const maxStorageGB = "1"
        const usedPercentage = ((totalSize / maxStorage) * 100).toFixed(1)

        setStorageInfo({
          totalFiles,
          totalSize,
          totalSizeGB,
          maxStorage,
          maxStorageGB,
          usedPercentage,
          bucketName: "products",
        })
        return
      }

      const data = await response.json()
      if (data.success) {
        setStorageInfo(data.storage)
      }
    } catch (error) {
      console.error("Error fetching storage info:", error)
    }
  }

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!uploadedFiles.length) return

    setUploading(true)
    try {
      for (const file of Array.from(uploadedFiles)) {
        if (activeTab === "r2") {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/r2/upload", {
            method: "POST",
            body: formData,
          })

          const data = await response.json()
          if (!data.success) throw new Error(data.error)
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

      toast.success("Fayllar muvaffaqiyatli yuklandi")
      await fetchFiles()
      await fetchStorageInfo()
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Fayllarni yuklashda xatolik")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm("Bu faylni o'chirishni tasdiqlaysizmi?")) return

    try {
      if (activeTab === "r2") {
        const response = await fetch(`/api/r2/delete?fileName=${encodeURIComponent(fileName)}`, {
          method: "DELETE",
        })

        const data = await response.json()
        if (!data.success) throw new Error(data.error)
      } else {
        const { error } = await supabase.storage.from("products").remove([fileName])
        if (error) throw error
      }

      toast.success("Fayl o'chirildi")
      await fetchFiles()
      await fetchStorageInfo()
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Faylni o'chirishda xatolik")
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (mimeType.startsWith("video/")) return <Video className="h-4 w-4" />
    if (mimeType.includes("text") || mimeType.includes("json")) return <FileText className="h-4 w-4" />
    if (mimeType.includes("zip") || mimeType.includes("rar")) return <Archive className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || file.mimeType?.includes(filterType)
    return matchesSearch && matchesType
  })

  if (!isAuthenticated) {
    return (
      <Dialog open={mdPasswordDialogOpen} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>MD Parolni kiriting</DialogTitle>
            <DialogDescription>Bu bo'limga kirish uchun MD parolni kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="md-password">MD Parol</Label>
              <Input
                id="md-password"
                type="password"
                value={mdPassword}
                onChange={(e) => setMdPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleMdPasswordSubmit()}
              />
            </div>
            <Button onClick={handleMdPasswordSubmit} className="w-full">
              Kirish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fayl saqlash</h1>
          <p className="text-muted-foreground">Fayllarni boshqarish va saqlash</p>
        </div>
        <Button onClick={() => fetchFiles()} variant="outline" className="ios-button bg-transparent">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
      </div>

      {/* Storage Info */}
      {storageInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Jami fayllar</p>
                  <p className="text-2xl font-bold">{storageInfo.totalFiles}</p>
                </div>
                <File className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ishlatilgan joy</p>
                  <p className="text-2xl font-bold">{storageInfo.totalSizeGB} GB</p>
                </div>
                <HardDrive className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Maksimal joy</p>
                  <p className="text-2xl font-bold">{storageInfo.maxStorageGB} GB</p>
                </div>
                <Cloud className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="ios-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Foiz</p>
                  <p className="text-2xl font-bold">{storageInfo.usedPercentage}%</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <div
                    className="w-4 h-4 rounded-full bg-primary"
                    style={{
                      transform: `scale(${Math.min(Number(storageInfo.usedPercentage) / 100, 1)})`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="supabase">Supabase Storage</TabsTrigger>
            <TabsTrigger value="r2">Cloudflare R2</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="supabase" className="space-y-6">
          <Card className="ios-card">
            <CardHeader>
              <CardTitle>Supabase Storage</CardTitle>
              <CardDescription>Supabase orqali fayllarni saqlash va boshqarish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload-supabase"
                  disabled={uploading}
                />
                <label htmlFor="file-upload-supabase" className="cursor-pointer">
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

              {/* Filters */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Fayl qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tur bo'yicha filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    <SelectItem value="image">Rasmlar</SelectItem>
                    <SelectItem value="video">Videolar</SelectItem>
                    <SelectItem value="text">Matnlar</SelectItem>
                    <SelectItem value="application">Ilovalar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Files List */}
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Yuklanmoqda...</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Fayllar topilmadi</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha fayllar mavjud emas"}
                    </p>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mimeType || "")}
                        <div>
                          <p className="font-medium line-clamp-1">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString("uz-UZ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, "_blank")}
                            className="ios-button bg-transparent"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFile(file.name)}
                          className="ios-button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="r2" className="space-y-6">
          <Card className="ios-card">
            <CardHeader>
              <CardTitle>Cloudflare R2</CardTitle>
              <CardDescription>Cloudflare R2 orqali fayllarni saqlash va boshqarish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload-r2"
                  disabled={uploading}
                />
                <label htmlFor="file-upload-r2" className="cursor-pointer">
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

              {/* Filters */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Fayl qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tur bo'yicha filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    <SelectItem value="image">Rasmlar</SelectItem>
                    <SelectItem value="video">Videolar</SelectItem>
                    <SelectItem value="text">Matnlar</SelectItem>
                    <SelectItem value="application">Ilovalar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Files List */}
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Yuklanmoqda...</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Fayllar topilmadi</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha fayllar mavjud emas"}
                    </p>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mimeType || "")}
                        <div>
                          <p className="font-medium line-clamp-1">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString("uz-UZ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, "_blank")}
                            className="ios-button bg-transparent"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFile(file.name)}
                          className="ios-button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
