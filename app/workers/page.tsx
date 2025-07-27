"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, Eye, Edit, Trash2, Star, Phone, MapPin, Briefcase } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { WorkerDialog } from "@/components/workers/worker-dialog"
import { WorkerViewDialog } from "@/components/workers/worker-view-dialog"
import { MDPasswordDialog } from "@/components/md-password-dialog"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorker, setSelectedWorker] = useState<any>(null)
  const [showWorkerDialog, setShowWorkerDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showMDPassword, setShowMDPassword] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: string; worker?: any } | null>(null)
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "sheet">("cards")

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("workers").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error("Error fetching workers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddWorker = () => {
    setSelectedWorker(null)
    setShowWorkerDialog(true)
  }

  const handleEditWorker = (worker: any) => {
    setPendingAction({ type: "edit", worker })
    setShowMDPassword(true)
  }

  const handleDeleteWorker = (worker: any) => {
    setPendingAction({ type: "delete", worker })
    setShowMDPassword(true)
  }

  const handleBulkDelete = () => {
    if (selectedWorkers.length === 0) return
    setPendingAction({ type: "bulkDelete" })
    setShowMDPassword(true)
  }

  const handleMDPasswordSuccess = async () => {
    setShowMDPassword(false)

    if (!pendingAction) return

    try {
      if (pendingAction.type === "edit") {
        setSelectedWorker(pendingAction.worker)
        setShowWorkerDialog(true)
      } else if (pendingAction.type === "delete") {
        const { error } = await supabase.from("workers").delete().eq("id", pendingAction.worker.id)

        if (error) throw error

        await fetchWorkers()
        alert("Ishchi muvaffaqiyatli o'chirildi!")
      } else if (pendingAction.type === "bulkDelete") {
        const { error } = await supabase.from("workers").delete().in("id", selectedWorkers)

        if (error) throw error

        setSelectedWorkers([])
        await fetchWorkers()
        alert(`${selectedWorkers.length} ta ishchi muvaffaqiyatli o'chirildi!`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Xatolik yuz berdi!")
    } finally {
      setPendingAction(null)
    }
  }

  const handleViewWorker = (worker: any) => {
    setSelectedWorker(worker)
    setShowViewDialog(true)
  }

  const handleWorkerSaved = () => {
    setShowWorkerDialog(false)
    fetchWorkers()
  }

  const handleSelectWorker = (workerId: string) => {
    setSelectedWorkers((prev) => (prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]))
  }

  const handleSelectAll = () => {
    if (selectedWorkers.length === filteredWorkers.length) {
      setSelectedWorkers([])
    } else {
      setSelectedWorkers(filteredWorkers.map((worker) => worker.id))
    }
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
      о: "o",
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

  const filteredWorkers = workers.filter((worker) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const searchCyrillic = transliterate(searchQuery, true)
    const searchLatin = transliterate(searchQuery, false)

    const searchableText = [
      worker.first_name,
      worker.last_name,
      worker.profession_uz,
      worker.phone_number,
      worker.location,
      worker.specialization,
      ...(worker.skills || []),
    ]
      .join(" ")
      .toLowerCase()

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
          <h1 className="text-3xl font-bold">Ustalar</h1>
          <p className="text-muted-foreground">Ishchilar va ustalarni boshqarish</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" onClick={() => setViewMode("cards")}>
            Kartalar
          </Button>
          <Button variant={viewMode === "sheet" ? "default" : "outline"} size="sm" onClick={() => setViewMode("sheet")}>
            Jadval
          </Button>
          <Button onClick={handleAddWorker}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi ishchi
          </Button>
        </div>
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

            {selectedWorkers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedWorkers.length} ta tanlangan</Badge>
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
          {filteredWorkers.map((worker) => (
            <Card key={worker.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedWorkers.includes(worker.id)}
                      onChange={() => handleSelectWorker(worker.id)}
                      className="rounded"
                    />
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={worker.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>
                        {worker.first_name?.[0]}
                        {worker.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {worker.first_name} {worker.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{worker.profession_uz}</p>
                    </div>
                  </div>
                  <Badge variant={worker.is_available ? "default" : "secondary"}>
                    {worker.is_available ? "Mavjud" : "Band"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.phone_number || "Telefon ko'rsatilmagan"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.location || "Manzil ko'rsatilmagan"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.experience_years} yil tajriba</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span>{worker.rating || 0}/5</span>
                  <Badge variant="outline" className="text-xs">
                    {worker.review_count || 0} sharh
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="text-sm">
                    <span className="font-medium">
                      {worker.hourly_rate ? `${worker.hourly_rate.toLocaleString()} so'm/soat` : "Narx ko'rsatilmagan"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleViewWorker(worker)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditWorker(worker)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteWorker(worker)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ModderSheet data={filteredWorkers} onDataChange={setWorkers} tableName="workers" onRefresh={fetchWorkers} />
      )}

      {filteredWorkers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Ishchilar topilmadi</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha ishchilar qo'shilmagan"}
            </p>
            <Button onClick={handleAddWorker}>
              <Plus className="h-4 w-4 mr-2" />
              Birinchi ishchini qo'shish
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <WorkerDialog
        worker={selectedWorker}
        open={showWorkerDialog}
        onOpenChange={setShowWorkerDialog}
        onSaved={handleWorkerSaved}
      />

      <WorkerViewDialog worker={selectedWorker} open={showViewDialog} onOpenChange={setShowViewDialog} />

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
