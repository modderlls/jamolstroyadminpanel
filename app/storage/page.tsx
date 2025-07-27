"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  HardDrive,
  Cloud,
  Upload,
  Download,
  Folder,
  File,
  ImageIcon,
  Video,
  FileText,
  RefreshCw,
  Eye,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface StorageStats {
  totalSize: number
  usedSize: number
  availableSize: number
  buckets: Array<{
    name: string
    size: number
    fileCount: number
  }>
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdTime: string
  webViewLink: string
  thumbnailLink?: string
}

export default function StoragePage() {
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalSize: 0,
    usedSize: 0,
    availableSize: 0,
    buckets: [],
  })
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [driveLoading, setDriveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("supabase")
  const [uploadingToDrive, setUploadingToDrive] = useState(false)

  useEffect(() => {
    fetchStorageStats()
    if (activeTab === "drive") {
      fetchDriveFiles()
    }
  }, [activeTab])

  const fetchStorageStats = async () => {
    try {
      setLoading(true)

      // Get storage usage from Supabase
      const buckets = ["products", "documents"]
      const bucketStats = []
      let totalUsed = 0

      for (const bucketName of buckets) {
        try {
          const { data: files, error } = await supabase.storage.from(bucketName).list("", { limit: 1000 })

          if (error) throw error

          let bucketSize = 0
          let fileCount = 0

          if (files) {
            for (const file of files) {
              if (file.metadata?.size) {
                bucketSize += file.metadata.size
              }
              fileCount++
            }
          }

          bucketStats.push({
            name: bucketName,
            size: bucketSize,
            fileCount,
          })

          totalUsed += bucketSize
        } catch (error) {
          console.error(`Error fetching ${bucketName} stats:`, error)
          bucketStats.push({
            name: bucketName,
            size: 0,
            fileCount: 0,
          })
        }
      }

      // Supabase free tier limit is 500MB
      const totalLimit = 500 * 1024 * 1024 // 500MB in bytes

      setStorageStats({
        totalSize: totalLimit,
        usedSize: totalUsed,
        availableSize: totalLimit - totalUsed,
        buckets: bucketStats,
      })
    } catch (error) {
      console.error("Error fetching storage stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDriveFiles = async () => {
    try {
      setDriveLoading(true)

      const response = await fetch("/api/google-drive/files")
      const data = await response.json()

      if (data.success) {
        setDriveFiles(data.files)
      } else {
        console.error("Error fetching Drive files:", data.error)
      }
    } catch (error) {
      console.error("Error fetching Drive files:", error)
    } finally {
      setDriveLoading(false)
    }
  }

  const uploadToDrive = async (file: File) => {
    try {
      setUploadingToDrive(true)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/google-drive/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        await fetchDriveFiles()
        alert("Fayl muvaffaqiyatli yuklandi!")
      } else {
        alert("Fayl yuklashda xatolik: " + data.error)
      }
    } catch (error) {
      console.error("Error uploading to Drive:", error)
      alert("Fayl yuklashda xatolik yuz berdi")
    } finally {
      setUploadingToDrive(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (mimeType.startsWith("video/")) return <Video className="h-4 w-4" />
    if (mimeType.includes("text") || mimeType.includes("document")) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const usagePercentage = storageStats.totalSize > 0 ? (storageStats.usedSize / storageStats.totalSize) * 100 : 0

  if (loading) {
    return (
      <div className="responsive-container space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="responsive-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="responsive-container space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Xotiralar</h1>
          <p className="text-muted-foreground">Supabase va Google Drive xotira boshqaruvi</p>
        </div>
        <Button onClick={fetchStorageStats} variant="outline" className="ios-button bg-transparent">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="supabase">Supabase</TabsTrigger>
            <TabsTrigger value="drive">Google Drive</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="supabase">
          <div className="space-y-6">
            {/* Storage Overview */}
            <div className="responsive-grid">
              <Card className="ios-card storage-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Jami xotira</p>
                      <p className="text-2xl font-bold text-foreground">{formatFileSize(storageStats.totalSize)}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <HardDrive className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="storage-progress">
                    <div className="storage-bar" style={{ width: `${usagePercentage}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{usagePercentage.toFixed(1)}% ishlatilgan</p>
                </CardContent>
              </Card>

              <Card className="ios-card storage-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ishlatilgan</p>
                      <p className="text-2xl font-bold text-foreground">{formatFileSize(storageStats.usedSize)}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="ios-card storage-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mavjud</p>
                      <p className="text-2xl font-bold text-foreground">{formatFileSize(storageStats.availableSize)}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Download className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Buckets */}
            <Card className="ios-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Storage Buckets
                </CardTitle>
                <CardDescription>Supabase storage buckets ma'lumotlari</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storageStats.buckets.map((bucket) => (
                    <div key={bucket.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Folder className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium">{bucket.name}</h4>
                          <p className="text-sm text-muted-foreground">{bucket.fileCount} ta fayl</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatFileSize(bucket.size)}</p>
                        <p className="text-xs text-muted-foreground">
                          {bucket.size > 0 ? ((bucket.size / storageStats.totalSize) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drive">
          <div className="space-y-6">
            {/* Upload Area */}
            <Card className="ios-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Google Drive
                </CardTitle>
                <CardDescription>Google Drive ga fayl yuklash va boshqarish</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="drive-upload-area">
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && uploadToDrive(e.target.files[0])}
                    className="hidden"
                    id="drive-upload"
                    disabled={uploadingToDrive}
                  />
                  <label htmlFor="drive-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {uploadingToDrive ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground">
                        {uploadingToDrive ? "Yuklanmoqda..." : "Google Drive ga fayl yuklash uchun bosing"}
                      </p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Drive Files */}
            <Card className="ios-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fayllar</CardTitle>
                  <Button onClick={fetchDriveFiles} variant="outline" size="sm" disabled={driveLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${driveLoading ? "animate-spin" : ""}`} />
                    Yangilash
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {driveLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-10 h-10 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : driveFiles.length > 0 ? (
                  <div className="space-y-2">
                    {driveFiles.map((file) => (
                      <div key={file.id} className="drive-file-item">
                        <div className="drive-file-icon">
                          {file.thumbnailLink ? (
                            <img
                              src={file.thumbnailLink || "/placeholder.svg"}
                              alt={file.name}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            getFileIcon(file.mimeType)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{file.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.createdTime).toLocaleDateString("uz-UZ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.webViewLink, "_blank")}
                            className="ios-button bg-transparent"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ko'rish
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.webViewLink, "_blank")}
                            className="ios-button bg-transparent"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ochish
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Fayllar topilmadi</h3>
                    <p className="text-muted-foreground">Google Drive da hozircha fayllar mavjud emas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
