"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Shield, Check, X } from "lucide-react"
import { createClient } from "@/lib/supabase"

const supabase = createClient()

interface AdminRole {
  id: string
  name: string
  display_name: string
  description?: string
  permissions: string[]
  created_at: string
}

interface AdminPermission {
  id: string
  module: string
  action: string
  display_name: string
  description?: string
}

export function RoleManagement() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    permissions: [] as string[],
  })

  useEffect(() => {
    fetchRolesAndPermissions()
  }, [])

  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        supabase.from("admin_roles").select("*").order("created_at"),
        supabase.from("admin_permissions").select("*").order("module, action"),
      ])

      if (rolesRes.data) setRoles(rolesRes.data)
      if (permissionsRes.data) setPermissions(permissionsRes.data)
    } catch (error) {
      console.error("Error fetching roles and permissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async () => {
    try {
      const { error } = await supabase.from("admin_roles").insert({
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        permissions: formData.permissions,
      })

      if (error) throw error

      await fetchRolesAndPermissions()
      setShowCreateDialog(false)
      resetForm()
    } catch (error) {
      console.error("Error creating role:", error)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingRole) return

    try {
      const { error } = await supabase
        .from("admin_roles")
        .update({
          display_name: formData.display_name,
          description: formData.description,
          permissions: formData.permissions,
        })
        .eq("id", editingRole.id)

      if (error) throw error

      await fetchRolesAndPermissions()
      setEditingRole(null)
      resetForm()
    } catch (error) {
      console.error("Error updating role:", error)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Bu rolni o'chirishni xohlaysizmi?")) return

    try {
      const { error } = await supabase.from("admin_roles").delete().eq("id", roleId)

      if (error) throw error

      await fetchRolesAndPermissions()
    } catch (error) {
      console.error("Error deleting role:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      display_name: "",
      description: "",
      permissions: [],
    })
  }

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: checked ? [...prev.permissions, permission] : prev.permissions.filter((p) => p !== permission),
    }))
  }

  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push(permission)
      return acc
    },
    {} as Record<string, AdminPermission[]>,
  )

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Rollari</h1>
          <p className="text-muted-foreground">Admin rollarini va ruxsatlarini boshqarish</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Yangi rol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yangi admin roli yaratish</DialogTitle>
              <DialogDescription>Yangi admin roli yarating va unga ruxsatlar bering</DialogDescription>
            </DialogHeader>
            <RoleForm
              formData={formData}
              setFormData={setFormData}
              groupedPermissions={groupedPermissions}
              onSubmit={handleCreateRole}
              onCancel={() => setShowCreateDialog(false)}
              isEditing={false}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{role.display_name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingRole(role)
                      setFormData({
                        name: role.name,
                        display_name: role.display_name,
                        description: role.description || "",
                        permissions: role.permissions,
                      })
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {role.name !== "super_admin" && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Ruxsatlar:</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.includes("*") ? (
                    <Badge className="text-xs">Barcha ruxsatlar</Badge>
                  ) : (
                    role.permissions.slice(0, 3).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))
                  )}
                  {role.permissions.length > 3 && !role.permissions.includes("*") && (
                    <Badge variant="secondary" className="text-xs">
                      +{role.permissions.length - 3} ko'proq
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Admin rolini tahrirlash</DialogTitle>
            <DialogDescription>Admin roli ma'lumotlari va ruxsatlarini tahrirlash</DialogDescription>
          </DialogHeader>
          {editingRole && (
            <RoleForm
              formData={formData}
              setFormData={setFormData}
              groupedPermissions={groupedPermissions}
              onSubmit={handleUpdateRole}
              onCancel={() => setEditingRole(null)}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface RoleFormProps {
  formData: any
  setFormData: any
  groupedPermissions: Record<string, AdminPermission[]>
  onSubmit: () => void
  onCancel: () => void
  isEditing: boolean
}

function RoleForm({ formData, setFormData, groupedPermissions, onSubmit, onCancel, isEditing }: RoleFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rol nomi (kod)</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
            placeholder="manager"
            disabled={isEditing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Ko'rsatiladigan nom</Label>
          <Input
            id="display_name"
            value={formData.display_name}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, display_name: e.target.value }))}
            placeholder="Menejer"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Tavsif</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
          placeholder="Bu rol haqida qisqacha ma'lumot"
        />
      </div>

      <div className="space-y-4">
        <Label>Ruxsatlar</Label>
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <Card key={module} className="p-4">
              <h4 className="font-medium mb-2 capitalize">{module}</h4>
              <div className="grid grid-cols-2 gap-2">
                {modulePermissions.map((permission) => {
                  const permissionKey = `${permission.module}:${permission.action}`
                  return (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={formData.permissions.includes(permissionKey)}
                        onCheckedChange={(checked) => handlePermissionToggle(permissionKey, !!checked)}
                      />
                      <Label htmlFor={permission.id} className="text-sm">
                        {permission.display_name}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onSubmit}>
          <Check className="h-4 w-4 mr-2" />
          {isEditing ? "Yangilash" : "Yaratish"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Bekor qilish
        </Button>
      </div>
    </div>
  )

  function handlePermissionToggle(permission: string, checked: boolean) {
    setFormData((prev: any) => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter((p: string) => p !== permission),
    }))
  }
}
