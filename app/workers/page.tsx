"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { WorkerDialog } from "@/components/workers/worker-dialog"
import { WorkerViewDialog } from "@/components/workers/worker-view-dialog"
import { supabase } from "@/lib/supabase"
import { Users, Plus, Search, Star, MapPin, Phone, Briefcase, Clock, Eye, Edit, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Worker {
  id: string
  first_name: string
  last_name: string
  profession_uz: string
  phone_number: string
  experience_years: number
  hourly_rate: number
  daily_rate: number
  rating: number
  is_available: boolean
  location: string
  description_uz?: string
  skills?: string[]
  portfolio_images?: string[]
  created_at: string
  updated_at: string
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [showWorkerDialog, setShowWorkerDialog] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

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
      toast.error("Ustalarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  const handleWorkerSaved = () => {
    fetchWorkers()
    setShowWorkerDialog(false)
    setEditingWorker(null)
  }

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return

    if (!deletePassword) {
      setDeleteError("MD parolni kiriting")
      return
    }

    setDeleteLoading(true)
    setDeleteError("")

    try {
      // Verify MD password
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      })

      const data = await response.json()

      if (!data.valid) {
        setDeleteError(data.error || "Noto'g'ri parol")
        return
      }

      // Delete selected workers
      const { error } = await supabase.from("workers").delete().in("id", selectedRows)

      if (error) throw error

      toast.success(`${selectedRows.length} ta usta o'chirildi`)
      await fetchWorkers()
      setSelectedRows([])
      setShowDeleteConfirm(false)
      setDeletePassword("")
    } catch (error) {
      console.error("Error deleting workers:", error)
      setDeleteError("Ustalarni o'chirishda xatolik yuz berdi")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker)
    setShowWorkerDialog(true)
  }

  const filteredWorkers = workers.filter((worker) =>
    `${worker.first_name} ${worker.last_name} ${worker.profession_uz} ${worker.location}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  )

  const availableWorkers = workers.filter((w) => w.is_available).length
  const totalWorkers = workers.length
  const averageRating = workers.length > 0 ? workers.reduce((sum, w) => sum + w.rating, 0) / workers.length : 0

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
            <p className="text-muted-foreground">Ustalar yuklanmoqda...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Ustalar</h1>
          <p className="text-muted-foreground">Qurilish ustalarini boshqarish</p>
        </div>
        <Button onClick={() => setShowWorkerDialog(true)} className="ios-button">
          <Plus className="h-4 w-4 mr-2" />
          Yangi ustakor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jami ustalar</p>
                <p className="text-2xl font-bold text-foreground">{totalWorkers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mavjud ustalar</p>
                <p className="text-2xl font-bold text-green-600">{availableWorkers}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        

        <Card className="ios-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tanlangan</p>
                <p className="text-2xl font-bold text-blue-600">{selectedRows.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ustalarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedRows.length > 0 && (
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="ios-button">
            <Trash2 className="h-4 w-4 mr-2" />
            O'chirish ({selectedRows.length})
          </Button>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="grid">Kartalar</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-6">
          {filteredWorkers.length === 0 ? (
            <Card className="ios-card">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Ustalar topilmadi</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha ustalar qo'shilmagan"}
                </p>
                <Button onClick={() => setShowWorkerDialog(true)} className="ios-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Birinchi ustani qo'shish
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkers.map((worker) => (
                <Card
                  key={worker.id}
                  className={`ios-card cursor-pointer transition-all hover:shadow-lg ${
                    selectedRows.includes(worker.id) ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    if (selectedRows.includes(worker.id)) {
                      setSelectedRows(selectedRows.filter((id) => id !== worker.id))
                    } else {
                      setSelectedRows([...selectedRows, worker.id])
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {worker.first_name} {worker.last_name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Briefcase className="h-3 w-3" />
                          {worker.profession_uz}
                        </CardDescription>
                      </div>
                      <Badge variant={worker.is_available ? "default" : "secondary"}>
                        {worker.is_available ? "Mavjud" : "Band"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{worker.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{worker.phone_number}</span>
                    </div>

                    

                    

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedWorker(worker)
                          setShowViewDialog(true)
                        }}
                        className="flex-1 ios-button bg-transparent"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ko'rish
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditWorker(worker)
                        }}
                        className="flex-1 ios-button bg-transparent"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Tahrirlash
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Worker Dialog */}
      <WorkerDialog
        worker={editingWorker}
        onSaved={handleWorkerSaved}
        onClose={() => {
          setShowWorkerDialog(false)
          setEditingWorker(null)
        }}
        open={showWorkerDialog}
      />

      {/* Worker View Dialog */}
      {showViewDialog && selectedWorker && (
        <WorkerViewDialog
          worker={selectedWorker}
          onClose={() => {
            setShowViewDialog(false)
            setSelectedWorker(null)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Ustalarni o'chirish</DialogTitle>
              <DialogDescription>
                {selectedRows.length} ta ustani o'chirishni tasdiqlash uchun MD parolni kiriting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="delete-password">MD Parol</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="MD parolni kiriting"
                  pattern="[0-9]*"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletePassword("")
                    setDeleteError("")
                  }}
                  className="flex-1 ios-button bg-transparent"
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={deleteLoading || !deletePassword}
                  className="flex-1 ios-button"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      O'chirilmoqda...
                    </>
                  ) : (
                    "O'chirish"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
