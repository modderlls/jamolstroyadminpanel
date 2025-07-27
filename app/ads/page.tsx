"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, BarChart3, ExternalLink, ImageIcon, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { MDPasswordDialog } from "@/components/md-password-dialog"
import { AdDialog } from "@/components/ads/ad-dialog"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import Image from "next/image"

export default function AdsPage() {
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [showAdDialog, setShowAdDialog] = useState(false)
  const [showMDPassword, setShowMDPassword] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: string; ad?: any } | null>(null)
  const [selectedAds, setSelectedAds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "sheet">("cards")

  useEffect(() => {
    fetchAds()
  }, [])

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

  const handleAddAd = () => {
    setPendingAction({ type: "add" })
    setShowMDPassword(true)
  }

  const handleEditAd = (ad: any) => {
    setPendingAction({ type: "edit", ad })
    setShowMDPassword(true)
  }

  const handleDeleteAd = (ad: any) => {
    setPendingAction({ type: "delete", ad })
    setShowMDPassword(true)
  }

  const handleBulkDelete = () => {
    if (selectedAds.length === 0) return
    setPendingAction({ type: "bulkDelete" })
    setShowMDPassword(true)
  }

  const handleMDPasswordSuccess = async () => {
    setShowMDPassword(false)

    if (!pendingAction) return

    try {
      if (pendingAction.type === "add") {
        setSelectedAd(null)
        setShowAdDialog(true)
      } else if (pendingAction.type === "edit") {
        setSelectedAd(pendingAction.ad)
        setShowAdDialog(true)
      } else if (pendingAction.type === "delete") {
        const { error } = await supabase.from("ads").delete().eq("id", pendingAction.ad.id)

        if (error) throw error

        await fetchAds()
        alert("Reklama muvaffaqiyatli o'chirildi!")
      } else if (pendingAction.type === "bulkDelete") {
        const { error } = await supabase.from("ads").delete().in("id", selectedAds)

        if (error) throw error

        setSelectedAds([])
        await fetchAds()
        alert(`${selectedAds.length} ta reklama muvaffaqiyatli o'chirildi!`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Xatolik yuz berdi!")
    } finally {
      setPendingAction(null)
    }
  }

  const handleAdSaved = () => {
    setShowAdDialog(false)
    fetchAds()
  }

  const handleSelectAd = (adId: string) => {
    setSelectedAds((prev) => (prev.includes(adId) ? prev.filter((id) => id !== adId) : [...prev, adId]))
  }

  const handleSelectAll = () => {
    if (selectedAds.length === filteredAds.length) {
      setSelectedAds([])
    } else {
      setSelectedAds(filteredAds.map((ad) => ad.id))
    }
  }

  const toggleAdStatus = async (ad: any) => {
    setPendingAction({ type: "toggleStatus", ad })
    setShowMDPassword(true)
  }

  // Enhanced search with transliteration
  const transliterate = (text: string, toCyrillic = false) => {
    const cyrillicToLatin: { [key: string]: string } = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ё: "yo",
      ж: "j",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "о",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "x",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "sch",
      ъ: "",
      ы: "i",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
      ў: "o",
      қ: "q",
      ғ: "g",
      ҳ: "h",
    }

    const latinToCyrillic: { [key: string]: string } = {
      a: "а",
      b: "б",
      v: "в",
      g: "г",
      d: "д",
      e: "е",
      yo: "ё",
      j: "ж",
      z: "з",
      i: "и",
      y: "й",
      k: "к",
      l: "л",
      m: "м",
      n: "н",
      o: "о",
      p: "п",
      r: "р",
      s: "с",
      t: "т",
      u: "у",
      f: "ф",
      x: "х",
      ts: "ц",
      ch: "ч",
      sh: "ш",
      sch: "щ",
      yu: "ю",
      ya: "я",
      q: "қ",
      h: "ҳ",
    }

    const map = toCyrillic ? latinToCyrillic : cyrillicToLatin
    let result = text.toLowerCase()

    const multiChar = toCyrillic ? ["yo", "yu", "ya", "ts", "ch", "sh", "sch"] : ["ё", "ю", "я", "ц", "ч", "ш", "щ"]
    multiChar.forEach((char) => {
      if (map[char]) {
        result = result.replace(new RegExp(char, "g"), map[char])
      }
    })

    return result
      .split("")
      .map((char) => map[char] || char)
      .join("")
  }

  const filteredAds = ads.filter((ad) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const searchCyrillic = transliterate(searchQuery, true)
    const searchLatin = transliterate(searchQuery, false)

    const searchableText = [ad.name, ad.link].join(" ").toLowerCase()

    return (
      searchableText.includes(searchLower) ||
      searchableText.includes(searchCyrillic) ||
      searchableText.includes(searchLatin)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reklamalar</h1>
          <p className="text-muted-foreground">Reklama bannerlarini boshqarish va statistika</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" onClick={() => setViewMode("cards")}>
            Kartalar
          </Button>
          <Button variant={viewMode === "sheet" ? "default" : "outline"} size="sm" onClick={() => setViewMode("sheet")}>
            Jadval
          </Button>
          <Button onClick={handleAddAd}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi reklama
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami reklamalar</p>
                <p className="text-2xl font-bold">{ads.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faol reklamalar</p>
                <p className="text-2xl font-bold">{ads.filter((ad) => ad.is_active).length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami bosilishlar</p>
                <p className="text-2xl font-bold">
                  {ads.reduce((sum, ad) => sum + (ad.click_count || 0), 0).toLocaleString()}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">O'rtacha bosilish</p>
                <p className="text-2xl font-bold">
                  {ads.length > 0
                    ? Math.round(ads.reduce((sum, ad) => sum + (ad.click_count || 0), 0) / ads.length)
                    : 0}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Bulk Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Qidirish (Kiril/Lotin)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedAds.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedAds.length} ta tanlangan</Badge>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  O'chirish
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map((ad) => (
            <Card key={ad.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAds.includes(ad.id)}
                      onChange={() => handleSelectAd(ad.id)}
                      className="rounded"
                    />
                    <div>
                      <CardTitle className="text-lg">{ad.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Tartib: {ad.sort_order}</p>
                    </div>
                  </div>
                  <Badge
                    variant={ad.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleAdStatus(ad)}
                  >
                    {ad.is_active ? "Faol" : "Nofaol"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                  {ad.image_url ? (
                    <Image src={ad.image_url || "/placeholder.svg"} alt={ad.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bosilishlar:</span>
                  <Badge variant="outline">{ad.click_count || 0}</Badge>
                </div>

                {ad.link && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{ad.link}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3">
                  <div className="text-xs text-muted-foreground">
                    {new Date(ad.created_at).toLocaleDateString("uz-UZ")}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditAd(ad)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAd(ad)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ModderSheet data={filteredAds} onDataChange={setAds} tableName="ads" onRefresh={fetchAds} />
      )}

      {filteredAds.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Reklamalar topilmadi</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha reklamalar qo'shilmagan"}
            </p>
            <Button onClick={handleAddAd}>
              <Plus className="h-4 w-4 mr-2" />
              Birinchi reklamani qo'shish
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AdDialog ad={selectedAd} open={showAdDialog} onOpenChange={setShowAdDialog} onSaved={handleAdSaved} />

      <MDPasswordDialog
        open={showMDPassword}
        onOpenChange={setShowMDPassword}
        onSuccess={handleMDPasswordSuccess}
        title="Tasdiqlash"
        description="Ushbu amalni bajarish uchun MD parolni kiriting"
      />
    </div>
  )
}
