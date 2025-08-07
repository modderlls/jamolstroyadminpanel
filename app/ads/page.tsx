"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { AdDialog } from "@/components/ads/ad-dialog"
import { supabase } from "@/lib/supabase"
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  MousePointer,
  BarChart3,
  Edit,
  Trash2,
  Loader2,
  Shield,
  Lock,
  Key,
} from "lucide-react"
import Image from "next/image"

interface Ad {
  id: string
  name: string
  image_url: string
  link?: string
  is_active: boolean
  click_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdDialog, setShowAdDialog] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [isProtected, setIsProtected] = useState(true)
  const [accessPassword, setAccessPassword] = useState("")
  const [accessError, setAccessError] = useState("")
  const [accessLoading, setAccessLoading] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const response = await fetch("/api/md-password")
      const data = await response.json()
      setHasPassword(data.hasPassword)

      if (!data.hasPassword) {
        setIsProtected(false)
        fetchAds()
      }
    } catch (error) {
      console.error("Error checking access:", error)
    }
  }

  const verifyAccess = async () => {
    if (!accessPassword) {
      setAccessError("MD parolni kiriting")
      return
    }

    setAccessLoading(true)
    setAccessError("")

    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: accessPassword }),
      })

      const data = await response.json()

      if (data.valid) {
        setIsProtected(false)
        setAccessPassword("")
        fetchAds()
      } else {
        setAccessError(data.error || "Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setAccessError("Parolni tekshirishda xatolik yuz berdi")
    } finally {
      setAccessLoading(false)
    }
  }

  const fetchAds = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("ads").select("*").order("sort_order", { ascending: true })

      if (error) throw error
      setAds(data || [])
    } catch (error) {
      console.error("Error fetching ads:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdSaved = () => {
    fetchAds()
    setShowAdDialog(false)
    setEditingAd(null)
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm("Bu reklamani o'chirishni tasdiqlaysizmi?")) return

    try {
      const { error } = await supabase.from("ads").delete().eq("id", adId)
      if (error) throw error
      fetchAds()
    } catch (error) {
      console.error("Error deleting ad:", error)
      alert("Reklamani o'chirishda xatolik yuz berdi")
    }
  }

  const toggleAdStatus = async (adId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("ads")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", adId)

      if (error) throw error
      fetchAds()
    } catch (error) {
      console.error("Error updating ad status:", error)
      alert("Reklama holatini yangilashda xatolik yuz berdi")
    }
  }

  const filteredAds = ads.filter((ad) => ad.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const totalAds = ads.length
  const activeAds = ads.filter((ad) => ad.is_active).length
  const totalClicks = ads.reduce((sum, ad) => sum + ad.click_count, 0)
  const averageClicks = totalAds > 0 ? Math.round(totalClicks / totalAds) : 0

  if (isProtected && hasPassword) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md ios-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-destructive rounded-2xl flex items-center justify-center">
                <Lock className="h-8 w-8 text-destructive-foreground" />
              </div>
              <CardTitle className="text-2xl text-foreground">Himoyalangan bo'lim</CardTitle>
              <CardDescription>Reklamalar bo'limiga kirish uchun MD parolni kiriting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accessError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                  {accessError}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="access-password" className="text-sm font-medium">
                  MD Parol
                </label>
                <Input
                  id="access-password"
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="MD parolni kiriting"
                  pattern="[0-9]*"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      verifyAccess()
                    }
                  }}
                />
              </div>

              <Button onClick={verifyAccess} disabled={accessLoading || !accessPassword} className="w-full ios-button">
                {accessLoading ? (
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

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
            <p className="text-muted-foreground">Reklamalar yuklanmoqda...</p>
          </div>
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
            <Shield className="h-8 w-8 text-primary" />
            Reklamalar
          </h1>
          <p className="text-muted-foreground">Reklama bannerlarini boshqarish (MD parol himoyasi)</p>
        </div>
        <Button onClick={() => setShowAdDialog(true)} className="ios-button">
          <Plus className="h-4 w-4 mr-2" />
          Yangi reklama
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami reklamalar</p>
                <p className="text-2xl font-bold text-foreground">{totalAds}</p>
              </div>
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faol reklamalar</p>
                <p className="text-2xl font-bold text-green-600">{activeAds}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami bosilishlar</p>
                <p className="text-2xl font-bold text-blue-600">{totalClicks}</p>
              </div>
              <MousePointer className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">O'rtacha bosilish</p>
                <p className="text-2xl font-bold text-purple-600">{averageClicks}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Reklamalarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="grid">Kartalar</TabsTrigger>
           
        </TabsList>

        <TabsContent value="grid" className="space-y-6">
          {filteredAds.length === 0 ? (
            <Card className="ios-card">
              <CardContent className="p-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Reklamalar topilmadi</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha reklamalar qo'shilmagan"}
                </p>
                <Button onClick={() => setShowAdDialog(true)} className="ios-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Birinchi reklamani qo'shish
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAds.map((ad) => (
                <Card key={ad.id} className="ios-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{ad.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MousePointer className="h-3 w-3" />
                          {ad.click_count} bosilish
                        </CardDescription>
                      </div>
                      <Badge variant={ad.is_active ? "default" : "secondary"}>{ad.is_active ? "Faol" : "Nofaol"}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Ad Image */}
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={ad.image_url || "/placeholder.svg"}
                        alt={ad.name}
                        width={300}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Ad Info */}
                    <div className="space-y-2 text-sm">
                      {ad.link && (
                        <div>
                          <span className="text-muted-foreground">Havola: </span>
                          <a
                            href={ad.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block"
                          >
                            {ad.link}
                          </a>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tartib:</span>
                        <span>{ad.sort_order}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Yaratilgan:</span>
                        <span>{new Date(ad.created_at).toLocaleDateString("uz-UZ")}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdStatus(ad.id, ad.is_active)}
                        className="flex-1 ios-button bg-transparent"
                      >
                        {ad.is_active ? "Nofaol qilish" : "Faol qilish"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAd(ad)
                          setShowAdDialog(true)
                        }}
                        className="ios-button bg-transparent"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAd(ad.id)}
                        className="ios-button bg-transparent text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet data={filteredAds} onDataChange={setAds} tableName="ads" onRefresh={fetchAds} />
        </TabsContent>
      </Tabs>

      {/* Ad Dialog */}
      {showAdDialog && (
        <AdDialog
          ad={editingAd}
          onClose={() => {
            setShowAdDialog(false)
            setEditingAd(null)
          }}
          onSaved={handleAdSaved}
        />
      )}
    </div>
  )
}
