"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { BottomNavigation } from "@/components/layout/bottom-navigation"
import { TopBar } from "@/components/layout/top-bar"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { Star, MapPin, Phone, Filter, Search } from "lucide-react"
import Image from "next/image"

interface Worker {
  id: string
  first_name: string
  last_name: string
  profession_uz: string
  experience_years: number
  hourly_rate: number
  daily_rate: number
  rating: number
  review_count: number
  location: string
  is_available: boolean
  skills: string[]
  avatar_url?: string
  phone_number: string
}

export default function WorkersPage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("search") || ""

  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [showWorkerSheet, setShowWorkerSheet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    profession: "",
    location: "",
    minRating: 0,
    maxRate: 999999,
  })
  const [professions, setProfessions] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])

  useEffect(() => {
    fetchWorkers()
    fetchFilterOptions()
  }, [searchQuery, filters])

  const fetchFilterOptions = async () => {
    try {
      const { data, error } = await supabase.from("workers").select("profession_uz, location").eq("is_available", true)

      if (error) throw error

      const uniqueProfessions = [...new Set(data?.map((w) => w.profession_uz).filter(Boolean))]
      const uniqueLocations = [...new Set(data?.map((w) => w.location).filter(Boolean))]

      setProfessions(uniqueProfessions)
      setLocations(uniqueLocations)
    } catch (error) {
      console.error("Filter options error:", error)
    }
  }

  const fetchWorkers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc("search_workers", {
        search_term: searchQuery,
        profession_filter: filters.profession,
        location_filter: filters.location,
        min_rating: filters.minRating,
        max_hourly_rate: filters.maxRate,
        limit_count: 50,
      })

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error("Ishchilarni yuklashda xatolik:", error)
      // Fallback to direct query if RPC fails
      try {
        let query = supabase.from("workers").select("*").eq("is_available", true)

        if (searchQuery) {
          query = query.or(
            `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,profession_uz.ilike.%${searchQuery}%`,
          )
        }

        if (filters.profession) {
          query = query.eq("profession_uz", filters.profession)
        }

        if (filters.location) {
          query = query.ilike("location", `%${filters.location}%`)
        }

        query = query
          .gte("rating", filters.minRating)
          .lte("hourly_rate", filters.maxRate)
          .order("rating", { ascending: false })
          .limit(50)

        const { data: fallbackData, error: fallbackError } = await query

        if (fallbackError) throw fallbackError
        setWorkers(fallbackData || [])
      } catch (fallbackError) {
        console.error("Fallback query error:", fallbackError)
        setWorkers([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchWorkers()
  }

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker)
    setShowWorkerSheet(true)
  }

  const handleContactWorker = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`)
  }

  const clearFilters = () => {
    setFilters({
      profession: "",
      location: "",
      minRating: 0,
      maxRate: 999999,
    })
    setShowFilters(false)
  }

  const applyFilters = () => {
    setShowFilters(false)
    fetchWorkers()
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <TopBar />

      {/* Header with Search */}
      <div className="container mx-auto px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold">Ishchilar</h1>
            <p className="text-sm text-muted-foreground">{workers.length} ta mutaxassis</p>
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="p-3 rounded-xl hover:bg-muted transition-colors shadow-sm border border-border"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <input
              type="text"
              placeholder="Ishchi, kasb yoki ko'nikma qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all duration-200 text-sm"
            />
          </div>
        </form>

        {/* Active Filters */}
        {(filters.profession || filters.location || filters.minRating > 0 || filters.maxRate < 999999) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.profession && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{filters.profession}</span>
            )}
            {filters.location && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{filters.location}</span>
            )}
            {filters.minRating > 0 && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {filters.minRating}+ yulduz
              </span>
            )}
            {filters.maxRate < 999999 && (
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {new Intl.NumberFormat("uz-UZ").format(filters.maxRate)} so'm gacha
              </span>
            )}
          </div>
        )}
      </div>

      {/* Workers List */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse border border-border">
                <div className="flex space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : workers.length > 0 ? (
          <div className="space-y-4">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="bg-card rounded-xl p-4 border border-border hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleWorkerSelect(worker)}
              >
                <div className="flex space-x-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-muted rounded-full overflow-hidden flex-shrink-0">
                    {worker.avatar_url ? (
                      <Image
                        src={worker.avatar_url || "/placeholder.svg"}
                        alt={`${worker.first_name} ${worker.last_name}`}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-foreground font-semibold text-lg">
                          {worker.first_name[0]}
                          {worker.last_name[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {worker.first_name} {worker.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{worker.profession_uz}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{worker.rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({worker.review_count})</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{worker.location}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{worker.experience_years} yil tajriba</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold">
                          {new Intl.NumberFormat("uz-UZ").format(worker.hourly_rate)} so'm
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">/soat</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleContactWorker(worker.phone_number)
                        }}
                        className="flex items-center space-x-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm shadow-sm"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Qo'ng'iroq</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {worker.skills && worker.skills.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      {worker.skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-muted text-foreground text-xs rounded-lg">
                          {skill}
                        </span>
                      ))}
                      {worker.skills.length > 3 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg">
                          +{worker.skills.length - 3} ko'proq
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ishchi topilmadi</h3>
            <p className="text-muted-foreground mb-4">Qidiruv so'zini o'zgartiring yoki filtrlarni o'zgartiring</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Filtrlarni tozalash
            </button>
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtrlar">
        <div className="p-6 space-y-6">
          {/* Profession Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Mutaxassislik</label>
            <select
              value={filters.profession}
              onChange={(e) => setFilters({ ...filters, profession: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Barchasi</option>
              {professions.map((profession) => (
                <option key={profession} value={profession}>
                  {profession}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Joylashuv</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Barchasi</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Minimal reyting</label>
            <select
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20"
            >
              <option value={0}>Barchasi</option>
              <option value={3}>3+ yulduz</option>
              <option value={4}>4+ yulduz</option>
              <option value={4.5}>4.5+ yulduz</option>
            </select>
          </div>

          {/* Rate Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Maksimal soatlik narx</label>
            <input
              type="number"
              value={filters.maxRate === 999999 ? "" : filters.maxRate}
              onChange={(e) => setFilters({ ...filters, maxRate: e.target.value ? Number(e.target.value) : 999999 })}
              placeholder="Cheklovsiz"
              className="w-full px-3 py-2 bg-muted rounded-lg border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={clearFilters}
              className="flex-1 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Tozalash
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Qo'llash
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomNavigation />

      {/* Worker Detail Bottom Sheet - Full Screen */}
      <BottomSheet
        isOpen={showWorkerSheet}
        onClose={() => setShowWorkerSheet(false)}
        title="Ishchi haqida"
        height="full"
      >
        {selectedWorker && (
          <div className="p-6 h-full flex flex-col">
            {/* Worker Header */}
            <div className="flex space-x-4 mb-6">
              <div className="w-20 h-20 bg-muted rounded-full overflow-hidden flex-shrink-0">
                {selectedWorker.avatar_url ? (
                  <Image
                    src={selectedWorker.avatar_url || "/placeholder.svg"}
                    alt={`${selectedWorker.first_name} ${selectedWorker.last_name}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-foreground font-semibold text-2xl">
                      {selectedWorker.first_name[0]}
                      {selectedWorker.last_name[0]}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">
                  {selectedWorker.first_name} {selectedWorker.last_name}
                </h3>
                <p className="text-muted-foreground mb-2">{selectedWorker.profession_uz}</p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{selectedWorker.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({selectedWorker.review_count} sharh)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-6">
              {/* Experience & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="text-sm text-muted-foreground mb-1">Tajriba</h4>
                  <p className="font-semibold">{selectedWorker.experience_years} yil</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="text-sm text-muted-foreground mb-1">Joylashuv</h4>
                  <p className="font-semibold">{selectedWorker.location}</p>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h4 className="font-semibold mb-3">Narxlar</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h5 className="text-sm text-primary mb-1">Soatlik</h5>
                    <p className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat("uz-UZ").format(selectedWorker.hourly_rate)} so'm
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h5 className="text-sm text-muted-foreground mb-1">Kunlik</h5>
                    <p className="text-lg font-bold">
                      {new Intl.NumberFormat("uz-UZ").format(selectedWorker.daily_rate)} so'm
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {selectedWorker.skills && selectedWorker.skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Ko'nikmalar</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-2 bg-muted text-foreground rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-6 border-t border-border">
              <button
                onClick={() => handleContactWorker(selectedWorker.phone_number)}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <Phone className="w-5 h-5" />
                <span>Qo'ng'iroq qilish</span>
              </button>
              <button className="w-full bg-secondary text-secondary-foreground rounded-xl py-3 font-medium hover:bg-secondary/80 transition-colors">
                Buyurtma berish
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
