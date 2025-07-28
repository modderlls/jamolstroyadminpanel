"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"

interface StorageFile {
  name: string
  size?: number
  created_at?: string
  updated_at?: string
  id?: string
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
  const [storageProvider, setStorageProvider] = useState<"supabase" | "google_drive">("supabase")
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)

  // MD Password protection for viewing files
  const [viewPassword, setViewPassword] = useState("")
  const [viewError, setViewError] = useState("")
  const [viewLoading, setViewLoading] = useState(false)
  const [viewVerified, setViewVerified] = useState(false)

  useEffect(() => {
    loadStorageSettings()
  }, [])

  useEffect(() => {
    if (viewVerified) {
      fetchFiles()
    }
  }, [viewVerified, storageProvider])

  const loadStorageSettings = () => {
    const saved = localStorage.getItem("storage_settings")
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setStorageProvider(settings.storage_provider || "supabase")
        setGoogleDriveFolderId(settings.google_drive_folder_id || "")
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

  const fetchFiles = async () => {
    try {
      setLoading(true)

      if (storageProvider === "google_drive") {
        const response = await fetch("/api/google-drive/files")
        const data = await response.json()
        setFiles(data.files || [])
      } else {
        // Supabase Storage
        const { data, error } = await supabase.storage.from("products").list()
        if (error) throw error
        setFiles(data || [])
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
        storage_provider: storageProvider,
        google_drive_folder_id: googleDriveFolderId,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (storageProvider === "google_drive") {
          const formData = new FormData()
          formData.append("file", file)

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
      alert("Fayllar muvaffaqiyatli yuklandi!")
    } catch (error) {
      console.error("Error uploading files:", error)
      alert("Fayllarni yuklashda xatolik yuz berdi")
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileName: string) => {
    if (!confirm("Bu faylni o'chirishni tasdiqlaysizmi?")) return

    try {
      if (storageProvider === "google_drive") {
        alert("Google Drive fayllarini o'chirish hozircha qo'llab-quvvatlanmaydi")
        return
      } else {
        // Supabase Storage
        const { error } = await supabase.storage.from("products").remove([fileName])
        if (error) throw error
      }

      await fetchFiles()
      alert("Fayl muvaffaqiyatli o'chirildi!")
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Faylni o'chirishda xatolik yuz berdi")
    }
  }

  const getFileUrl = (fileName: string) => {
    if (storageProvider === "google_drive") {
      return "#" // Google Drive URLs would be handled differently
    } else {
      const { data } = supabase.storage.from("products").getPublicUrl(fileName)
      return data.publicUrl
    }
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

      {/* Storage Provider Info */}
      <Card className="ios-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {storageProvider === "google_drive" ? (
                <Cloud className="h-8 w-8 text-blue-600" />
              ) : (
                <Database className="h-8 w-8 text-green-600" />
              )}
              <div>
                <h3 className="font-semibold">
                  {storageProvider === "google_drive" ? "Google Drive" : "Supabase Storage"}
                </h3>
                <p className="text-sm text-muted-foreground">Hozirgi xotira provayderi</p>
              </div>
            </div>
            <Badge variant={storageProvider === "google_drive" ? "default" : "secondary"}>
              {storageProvider === "google_drive" ? "Bulutli" : "Mahalliy"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Fayl yuklash</CardTitle>
          <CardDescription>Mahsulot rasmlari va boshqa fayllarni yuklang</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-8">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
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
        </CardContent>
      </Card>

      {/* Files List */}
      <Card className="ios-card">
        <CardHeader>
          <CardTitle>Yuklangan fayllar</CardTitle>
          <CardDescription>
            {storageProvider === "google_drive" ? "Google Drive" : "Supabase Storage"} dagi fayllar
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
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      {file.size && (
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      )}
                      {file.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString("uz-UZ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {storageProvider === "supabase" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getFileUrl(file.name), "_blank")}
                        className="ios-button bg-transparent"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getFileUrl(file.name)
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
                      onClick={() => deleteFile(file.name)}
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
          <Card className="w-full max-w-2xl mx-4 ios-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Xotira sozlamalari
              </CardTitle>
              <CardDescription>Mahsulot rasmlarini saqlash joyini o'zgartiring (MD parol himoyasi)</CardDescription>
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
                  <div className="space-y-4">
                    <Label>Xotira provayderi</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        className={`cursor-pointer transition-all ${
                          storageProvider === "supabase" ? "ring-2 ring-primary" : "hover:shadow-md"
                        }`}
                        onClick={() => setStorageProvider("supabase")}
                      >
                        <CardContent className="p-4 text-center">
                          <Database className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <h4 className="font-medium">Supabase Storage</h4>
                          <p className="text-sm text-muted-foreground">Mahalliy xotira</p>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer transition-all ${
                          storageProvider === "google_drive" ? "ring-2 ring-primary" : "hover:shadow-md"
                        }`}
                        onClick={() => setStorageProvider("google_drive")}
                      >
                        <CardContent className="p-4 text-center">
                          <Cloud className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <h4 className="font-medium">Google Drive</h4>
                          <p className="text-sm text-muted-foreground">Bulutli xotira</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {storageProvider === "google_drive" && (
                    <div className="space-y-2">
                      <Label htmlFor="folder_id">Google Drive papka ID (ixtiyoriy)</Label>
                      <Input
                        id="folder_id"
                        value={googleDriveFolderId}
                        onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      />
                      <p className="text-xs text-muted-foreground">Bo'sh qoldirsa, asosiy papkaga saqlanadi</p>
                    </div>
                  )}

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Muhim eslatma</span>
                    </div>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Bu sozlama faqat mahsulot rasmlariga ta'sir qiladi</li>
                      <li>• Mavjud rasmlar o'z joyida qoladi</li>
                      <li>• Yangi yuklangan rasmlar tanlangan joyga saqlanadi</li>
                      <li>• Google Drive uchun API kalitlari sozlangan bo'lishi kerak</li>
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
