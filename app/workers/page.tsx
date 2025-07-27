"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, Plus, Edit, Eye, Star, Phone, MapPin, Wrench, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { WorkerDialog } from "@/components/workers/worker-dialog"
import { WorkerViewDialog } from "@/components/workers/worker-view-dialog"
import { MDPasswordDialog } from "@/components/md-password-dialog"
import Image from "next/image"

interface Worker {
  id: string
  first_name: string
  last_name: string
  profession_uz: string
  profession_ru: string
  skills: string[]
  experience_years: number
  hourly_rate: number
  daily_rate: number
  rating: number
  review_count: number
  avatar_url: string
  phone_number: string
  is_available: boolean
  location: string
  specialization: string
  description: string
  created_at: string
  updated_at: string
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("list")

  // Dialog states
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isMDDialogOpen, setIsMDDialogOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null)
  const [pendingAction, setPendingAction] = useState<() => void>(() => {})

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
    setPendingAction(() => () => {
      setEditingWorker(null)
      setIsWorkerDialogOpen(true)
    })
    setIsMDDialogOpen(true)
  }

  const handleEditWorker = (worker: Worker) => {
    setPendingAction(() => () => {
      setEditingWorker(worker)
      setIsWorkerDialogOpen(true)
    })
    setIsMDDialogOpen(true)
  }

  const handleViewWorker = (worker: Worker) => {
    setViewingWorker(worker)
    setIsViewDialogOpen(true)
  }

  const handleMDSuccess = () => {
    setIsMDDialogOpen(false)
    pendingAction()
  }

  // Enhanced search with transliteration
  const filteredWorkers = workers.filter((worker) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const fullName = `${worker.first_name} ${worker.last_name}`.toLowerCase()
    const profession = worker.profession_uz.toLowerCase()
    const skills = worker.skills.join(" ").toLowerCase()

    return (
      fullName.includes(searchLower) ||
      profession.includes(searchLower) ||
      skills.includes(searchLower) ||
      (worker.phone_number && worker.phone_number.includes(searchQuery))
    )
  })

  if (loading) {
    return (
      <div className="responsive-container space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="responsive-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Ustalar</h1>
          <p className="text-muted-foreground">Jami {workers.length} ta usta</p>
        </div>
        <Button onClick={handleAddWorker} className="ios-button">
          <Plus className="h-4 w-4 mr-2" />
          Yangi usta
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list">Ro'yxat</TabsTrigger>
            <TabsTrigger value="table">Jadval</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list">
          <div className="space-y-6">
            {/* Search */}
            <Card className="ios-card">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Usta qidirish (ism, kasb, ko'nikma)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Workers Grid */}
            <div className="responsive-grid">
              {filteredWorkers.map((worker) => (
                <Card key={worker.id} className="ios-card worker-card hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="worker-avatar">
                        <Image
                          src={worker.avatar_url || "/placeholder.svg"}
                          alt={`${worker.first_name} ${worker.last_name}`}
                          width={64}
                          height={64}
                          className="worker-avatar"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {worker.first_name} {worker.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{worker.profession_uz}</p>
                          </div>
                          <Badge variant={worker.is_available ? "default" : "secondary"}>
                            {worker.is_available ? "Mavjud" : "Band"}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{worker.experience_years} yil tajriba</span>
                          </div>

                          {worker.rating > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span>
                                {worker.rating.toFixed(1)} ({worker.review_count} baho)
                              </span>
                            </div>
                          )}

                          {worker.phone_number && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{worker.phone_number}</span>
                            </div>
                          )}

                          {worker.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{worker.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span>Soatlik narx:</span>
                            <span className="font-medium">{worker.hourly_rate.toLocaleString()} so'm</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Kunlik narx:</span>
                            <span className="font-medium">{worker.daily_rate.toLocaleString()} so'm</span>
                          </div>
                        </div>

                        {worker.skills.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-2">Ko'nikmalar:</p>
                            <div className="flex flex-wrap gap-1">
                              {worker.skills.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {worker.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{worker.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewWorker(worker)}
                            className="flex-1 ios-button bg-transparent"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ko'rish
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWorker(worker)}
                            className="flex-1 ios-button bg-transparent"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Tahrirlash
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredWorkers.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Ustalar topilmadi</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha ustalar mavjud emas"}
                  </p>
                  <Button onClick={handleAddWorker} className="mt-4 ios-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Birinchi ustani qo'shish
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet data={workers} onDataChange={setWorkers} tableName="workers" onRefresh={fetchWorkers} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <WorkerDialog
        open={isWorkerDialogOpen}
        onOpenChange={setIsWorkerDialogOpen}
        worker={editingWorker}
        onSuccess={() => {
          fetchWorkers()
          setIsWorkerDialogOpen(false)
          setEditingWorker(null)
        }}
      />

      <WorkerViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} worker={viewingWorker} />

      <MDPasswordDialog
        open={isMDDialogOpen}
        onOpenChange={setIsMDDialogOpen}
        onSuccess={handleMDSuccess}
        title="Ustalar bo'limiga kirish"
        description="Ustalar ma'lumotlarini ko'rish va tahrirlash uchun MD parolni kiriting"
      />
    </div>
  )
}
