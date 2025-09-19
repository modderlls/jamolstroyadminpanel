"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, X, Shield, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

interface AdminRole {
  id: string
  name: string
  display_name: string
  description?: string
  permissions: string[]
}

interface AdminPermission {
  id: string
  module: string
  action: string
  display_name: string
  description?: string
}

interface AdminFormProps {
  admin?: any
  onSave: () => void
  onCancel?: () => void
}

export function AdminForm({ admin, onSave, onCancel }: AdminFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [imageUploading, setImageUploading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: admin?.first_name || "",
    last_name: admin?.last_name || "",
    username: admin?.username || "",
    email: admin?.email || "",
    phone_number: admin?.phone_number || "",
    job_title: admin?.job_title || "",
    profile_image_url: admin?.profile_image_url || "",
    admin_role_id: admin?.admin_role_id || "",
    is_active: admin?.is_active ?? true,
    password: "",
    confirm_password: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchRolesAndPermissions()
  }, [])

  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        supabase.from("admin_roles").select("*").order("display_name"),
        supabase.from("admin_permissions").select("*").order("module, display_name"),
      ])

      if (rolesRes.data) setRoles(rolesRes.data)
      if (permissionsRes.data) setPermissions(permissionsRes.data)
    } catch (error) {
      console.error("Error fetching roles and permissions:", error)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `admin-avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      setFormData((prev) => ({ ...prev, profile_image_url: publicUrl }))
    } catch (error) {
      console.error("Error uploading image:", error)
    } finally {
      setImageUploading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) newErrors.first_name = "Ism talab qilinadi"
    if (!formData.last_name.trim()) newErrors.last_name = "Familiya talab qilinadi"
    if (!formData.email.trim()) newErrors.email = "Email talab qilinadi"
    if (!formData.admin_role_id) newErrors.admin_role_id = "Admin roli talab qilinadi"

    if (!admin && !formData.password) {
      newErrors.password = "Parol talab qilinadi"
    }

    if (formData.password && formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Parollar mos kelmaydi"
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email formati noto'g'ri"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      if (admin) {
        // Update existing admin
        const { error } = await supabase
          .from("users")
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            username: formData.username,
            phone_number: formData.phone_number,
            job_title: formData.job_title,
            profile_image_url: formData.profile_image_url,
            admin_role_id: formData.admin_role_id,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", admin.id)

        if (error) throw error

        // Update password if provided
        if (formData.password) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(admin.id, {
            password: formData.password,
          })
          if (passwordError) throw passwordError
        }
      } else {
        // Create new admin
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (authError) throw authError

        if (!authData.user) {
          throw new Error("Failed to create user")
        }

        const { error: userError } = await supabase.from("users").insert({
          id: authData.user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
          email: formData.email,
          phone_number: formData.phone_number,
          job_title: formData.job_title,
          profile_image_url: formData.profile_image_url,
          admin_role_id: formData.admin_role_id,
          role: "admin",
          is_active: formData.is_active,
          created_by: user?.id,
        })

        if (userError) throw userError
      }

      // Log admin action
      await supabase.rpc("log_admin_action", {
        p_action_type: admin ? "admin_update" : "admin_create",
        p_module: "admins",
        p_entity_id: admin?.id || null,
        p_metadata: { admin_name: `${formData.first_name} ${formData.last_name}` },
      })

      onSave()
    } catch (error) {
      console.error("Error saving admin:", error)
      setErrors({ submit: "Xatolik yuz berdi. Qayta urinib ko'ring." })
    } finally {
      setLoading(false)
    }
  }

  const selectedRole = roles.find((role) => role.id === formData.admin_role_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
          {errors.submit}
        </div>
      )}

      {/* Profile Image */}
      <div className="flex items-center gap-4">
        <Avatar className="profile-avatar-large">
          <AvatarImage src={formData.profile_image_url || "/placeholder.svg"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {formData.first_name[0]}
            {formData.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <Label htmlFor="image-upload">Profil rasmi (ixtiyoriy)</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={imageUploading}
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              {imageUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Rasm yuklash
            </Button>
            {formData.profile_image_url && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData((prev) => ({ ...prev, profile_image_url: "" }))}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Ism *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
            placeholder="Ism"
          />
          {errors.first_name && <p className="text-sm text-red-600">{errors.first_name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Familiya *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
            placeholder="Familiya"
          />
          {errors.last_name && <p className="text-sm text-red-600">{errors.last_name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@example.com"
            disabled={!!admin}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Telefon raqam</Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
            placeholder="+998901234567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="job_title">Ish turi</Label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) => setFormData((prev) => ({ ...prev, job_title: e.target.value }))}
            placeholder="Mahsulot menejeri"
          />
        </div>
      </div>

      {/* Password Fields (for new admin or password change) */}
      {(!admin || formData.password) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">{admin ? "Yangi parol" : "Parol *"}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Parol"
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Parolni tasdiqlash</Label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirm_password: e.target.value }))}
              placeholder="Parolni qayta kiriting"
            />
            {errors.confirm_password && <p className="text-sm text-red-600">{errors.confirm_password}</p>}
          </div>
        </div>
      )}

      {/* Role Selection */}
      <div className="space-y-2">
        <Label htmlFor="admin_role_id">Admin roli *</Label>
        <Select
          value={formData.admin_role_id}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, admin_role_id: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Admin rolini tanlang" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{role.display_name}</p>
                    {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.admin_role_id && <p className="text-sm text-red-600">{errors.admin_role_id}</p>}
      </div>

      {/* Role Permissions Preview */}
      {selectedRole && (
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="text-lg">Rol ruxsatlari</CardTitle>
            <CardDescription>{selectedRole.display_name} roli uchun mavjud ruxsatlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedRole.permissions.includes("*") ? (
                <Badge className="permission-chip">
                  <Check className="h-3 w-3 mr-1" />
                  Barcha ruxsatlar
                </Badge>
              ) : (
                selectedRole.permissions.map((permission) => {
                  const permissionData = permissions.find((p) => `${p.module}:${p.action}` === permission)
                  return (
                    <Badge key={permission} variant="outline" className="permission-chip">
                      {permissionData?.display_name || permission}
                    </Badge>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Faol admin</Label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading} className="soft-button">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              {admin ? "Yangilash" : "Qo'shish"}
            </>
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Bekor qilish
          </Button>
        )}
      </div>
    </form>
  )
}
