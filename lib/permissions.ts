import { createClient } from "./supabase"

const supabase = createClient()

export interface Permission {
  module: string
  action: string
  display_name: string
  description?: string
}

export interface AdminRole {
  id: string
  name: string
  display_name: string
  description?: string
  permissions: string[]
}

export class PermissionManager {
  private static instance: PermissionManager
  private userRole: string | null = null
  private userPermissions: string[] = []
  private adminRoleId: string | null = null

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  async initialize(userId: string) {
    try {
      const { data: user } = await supabase
        .from("users")
        .select(`
          role,
          admin_role_id,
          admin_roles (
            name,
            permissions
          )
        `)
        .eq("id", userId)
        .single()

      if (user) {
        this.userRole = user.role
        this.adminRoleId = user.admin_role_id

        if (user.role === "admin") {
          if (user.admin_roles?.name === "super_admin" || user.admin_roles?.permissions?.includes("*")) {
            this.userPermissions = ["*"]
          } else {
            this.userPermissions = user.admin_roles?.permissions || []
          }
        }
      }
    } catch (error) {
      console.error("Error initializing permissions:", error)
    }
  }

  hasPermission(module: string, action: string): boolean {
    if (this.userPermissions.includes("*")) {
      return true
    }

    const requiredPermission = `${module}:${action}`
    const moduleWildcard = `${module}:*`

    return this.userPermissions.includes(requiredPermission) || this.userPermissions.includes(moduleWildcard)
  }

  canAccess(module: string): boolean {
    return this.hasPermission(module, "view")
  }

  canCreate(module: string): boolean {
    return this.hasPermission(module, "create")
  }

  canUpdate(module: string): boolean {
    return this.hasPermission(module, "edit")
  }

  canDelete(module: string): boolean {
    return this.hasPermission(module, "delete")
  }

  isMainAdmin(): boolean {
    return this.userRole === "admin" && this.userPermissions.includes("*")
  }

  getUserRole(): string | null {
    return this.userRole
  }

  getUserPermissions(): string[] {
    return this.userPermissions
  }

  getAdminRoleId(): string | null {
    return this.adminRoleId
  }
}

export function usePermissions() {
  const permissionManager = PermissionManager.getInstance()

  return {
    hasPermission: (module: string, action: string) => permissionManager.hasPermission(module, action),
    canAccess: (module: string) => permissionManager.canAccess(module),
    canCreate: (module: string) => permissionManager.canCreate(module),
    canUpdate: (module: string) => permissionManager.canUpdate(module),
    canDelete: (module: string) => permissionManager.canDelete(module),
    isMainAdmin: () => permissionManager.isMainAdmin(),
    getUserRole: () => permissionManager.getUserRole(),
    getUserPermissions: () => permissionManager.getUserPermissions(),
    getAdminRoleId: () => permissionManager.getAdminRoleId(),
  }
}
