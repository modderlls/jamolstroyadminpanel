"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Mail, Phone, Calendar, Clock, User, Briefcase, Activity, X } from "lucide-react"

interface AdminProfileProps {
  admin: any
  onClose: () => void
}

export function AdminProfile({ admin, onClose }: AdminProfileProps) {
  const getStatusBadge = () => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="profile-avatar-large">
            <AvatarImage src={admin.profile_image_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {admin.first_name[0]}
              {admin.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">
              {admin.first_name} {admin.last_name}
            </h2>
            <p className="text-muted-foreground">
              {admin.job_title || admin.admin_role?.display_name || "Administrator"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge()}
              <Badge variant="outline" className="permission-chip">
                <Shield className="h-3 w-3 mr-1" />
                {admin.admin_role?.display_name || "Admin"}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Contact Information */}
      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Shaxsiy ma'lumotlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {admin.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{admin.email}</p>
              </div>
            </div>
          )}

          {admin.phone_number && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{admin.phone_number}</p>
              </div>
            </div>
          )}

          {admin.username && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">@{admin.username}</p>
              </div>
            </div>
          )}

          {admin.job_title && (
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Ish turi</p>
                <p className="font-medium">{admin.job_title}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Information */}
      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Faollik ma'lumotlari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Ro'yxatdan o'tgan</p>
              <p className="font-medium">{formatDate(admin.created_at)}</p>
            </div>
          </div>

          {admin.last_login_at && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Oxirgi kirish</p>
                <p className="font-medium">{formatDate(admin.last_login_at)}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Admin roli</p>
              <p className="font-medium">{admin.admin_role?.display_name || "Administrator"}</p>
              {admin.admin_role?.description && (
                <p className="text-sm text-muted-foreground mt-1">{admin.admin_role.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      {admin.admin_role && (
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Ruxsatlar
            </CardTitle>
            <CardDescription>Bu admin ega bo'lgan ruxsatlar ro'yxati</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {admin.admin_role.permissions?.includes("*") ? (
                <Badge className="permission-chip">
                  <Shield className="h-3 w-3 mr-1" />
                  Barcha ruxsatlar
                </Badge>
              ) : (
                admin.admin_role.permissions?.map((permission: string) => (
                  <Badge key={permission} variant="outline" className="permission-chip">
                    {permission}
                  </Badge>
                )) || <p className="text-muted-foreground">Ruxsatlar ma'lumoti yo'q</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
