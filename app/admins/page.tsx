"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, MoreVertical, Edit, BarChart3, Info, Shield, Users, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { AdminForm } from "@/components/admin/admin-form"
import { AdminProfile } from "@/components/admin/admin-profile"
import { AdminKPIStats } from "@/components/admin/admin-kpi-stats"

interface Admin {
  id: string
  first_name: string
  last_name: string
  username?: string
  email?: string
  phone_number?: string
  profile_image_url?: string
  job_title?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  admin_role?: {
    id: string
    name: string
    display_name: string
    description?: string
  }
}

export default function AdminsPage() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showKPIDialog, setShowKPIDialog] = useState(false)

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          admin_role:admin_roles(*)
        `)
        .eq("role", "admin")
        .order("created_at", { ascending: false })

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error("Error fetching admins:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAdmins = admins.filter(
    (admin) =>
      `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.job_title?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAdminSaved = () => {
    fetchAdmins()
    setShowAddDialog(false)
    setShowEditDialog(false)
    setSelectedAdmin(null)
  }

  const getStatusBadge = (admin: Admin) => {
    if (!admin.is_active) {
      return (
        <Badge variant="secondary" className="admin-status-inactive">
          Faol emas
        </Badge>
      )
    }

    const lastLogin = admin.last_login_at ? new Date(admin.last_login_at) : null
    const isRecentlyActive = lastLogin && Date.now() - lastLogin.getTime() < 24 * 60 * 60 * 1000

    return (
      <Badge
        variant={isRecentlyActive ? "default" : "secondary"}
        className={isRecentlyActive ? "admin-status-active" : "admin-status-inactive"}
      >
        {isRecentlyActive ? "Faol" : "Nofaol"}
      </Badge>
    )
  }

  const getRoleDisplayName = (admin: Admin) => {
    return admin.admin_role?.display_name || "Admin"
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Adminlar</h1>
            <p className="text-muted-foreground">Tizim administratorlarini boshqarish</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="admin-card animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Adminlar</h1>
          <p className="text-muted-foreground">Tizim administratorlarini boshqarish</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="soft-button">
              <Plus className="h-4 w-4 mr-2" />
              Admin qo'shish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yangi admin qo'shish</DialogTitle>
              <DialogDescription>Yangi administrator qo'shish va unga ruxsatlar berish</DialogDescription>
            </DialogHeader>
            <AdminForm onSave={handleAdminSaved} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Admin qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-4">
          <Card className="soft-card p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Jami adminlar</p>
                <p className="text-2xl font-bold">{admins.length}</p>
              </div>
            </div>
          </Card>
          <Card className="soft-card p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Faol adminlar</p>
                <p className="text-2xl font-bold">{admins.filter((admin) => admin.is_active).length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdmins.map((admin) => (
          <Card key={admin.id} className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center space-x-4 cursor-pointer flex-1"
                  onClick={() => {
                    setSelectedAdmin(admin)
                    setShowProfileDialog(true)
                  }}
                >
                  <Avatar className="profile-avatar">
                    <AvatarImage src={admin.profile_image_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {admin.first_name[0]}
                      {admin.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {admin.first_name} {admin.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {admin.job_title || getRoleDisplayName(admin)}
                    </p>
                    <p className="text-xs text-muted-foreground">@{admin.username || admin.email?.split("@")[0]}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedAdmin(admin)
                        setShowProfileDialog(true)
                      }}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Ma'lumot
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedAdmin(admin)
                        setShowEditDialog(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Tahrirlash
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedAdmin(admin)
                        setShowKPIDialog(true)
                      }}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      KPI Statistika
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(admin)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rol:</span>
                  <Badge variant="outline" className="permission-chip">
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleDisplayName(admin)}
                  </Badge>
                </div>

                {admin.last_login_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Oxirgi kirish:</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(admin.last_login_at).toLocaleDateString("uz-UZ")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAdmins.length === 0 && (
        <Card className="soft-card p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Adminlar topilmadi</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha adminlar yo'q"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddDialog(true)} className="soft-button">
              <Plus className="h-4 w-4 mr-2" />
              Birinchi adminni qo'shish
            </Button>
          )}
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adminni tahrirlash</DialogTitle>
            <DialogDescription>Administrator ma'lumotlari va ruxsatlarini tahrirlash</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <AdminForm
              admin={selectedAdmin}
              onSave={handleAdminSaved}
              onCancel={() => {
                setShowEditDialog(false)
                setSelectedAdmin(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl">
          {selectedAdmin && (
            <AdminProfile
              admin={selectedAdmin}
              onClose={() => {
                setShowProfileDialog(false)
                setSelectedAdmin(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* KPI Dialog */}
      <Dialog open={showKPIDialog} onOpenChange={setShowKPIDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>KPI Statistika</DialogTitle>
            <DialogDescription>
              {selectedAdmin?.first_name} {selectedAdmin?.last_name} ning ish faoliyati statistikasi
            </DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <AdminKPIStats
              adminId={selectedAdmin.id}
              adminName={`${selectedAdmin.first_name} ${selectedAdmin.last_name}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
