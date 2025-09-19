import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export interface Permission {
  resource: string
  actions: string[]
}

export interface AdminRole {
  id: string
  role_name: string
  display_name: string
  permissions: Permission[]
}

export class PermissionManager {
  private static instance: PermissionManager
  private userRole: string | null = null
  private userPermissions: Permission[] = []

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  async initialize(userId: string) {
    try {
      // Get user role
      const { data: user } = await supabase.from("users").select("role").eq("id", userId).single()

      if (user) {
        this.userRole = user.role

        // If main admin, grant all permissions
        if (user.role === "admin") {
          this.userPermissions = this.getAllPermissions()
        } else {
          // Get specific permissions for the role
          const { data: permissions } = await supabase
            .from("admin_roles")
            .select(`
              admin_permissions (
                resource,
                actions
              )
            `)
            .eq("role_name", user.role)
            .single()

          this.userPermissions = permissions?.admin_permissions || []
        }
      }
    } catch (error) {
      console.error("Error initializing permissions:", error)
    }
  }

  private getAllPermissions(): Permission[] {
    return [
      { resource: "products", actions: ["view", "create", "update", "delete"] },
      { resource: "categories", actions: ["view", "create", "update", "delete"] },
      { resource: "orders", actions: ["view", "create", "update", "delete", "approve", "mark_paid", "mark_debt"] },
      { resource: "debts", actions: ["view", "create", "update", "delete", "mark_paid"] },
      { resource: "statistics", actions: ["view", "export"] },
      { resource: "sms", actions: ["view", "send", "statistics"] },
      { resource: "workers", actions: ["view", "create", "update", "delete"] },
      { resource: "ads", actions: ["view", "create", "update", "delete"] },
      { resource: "admins", actions: ["view", "create", "update", "delete"] },
      { resource: "kpi", actions: ["view", "view_all"] },
      { resource: "notifications", actions: ["view", "send", "realtime"] },
    ]
  }

  hasPermission(resource: string, action: string): boolean {
    // Main admin has all permissions
    if (this.userRole === "admin") {
      return true
    }

    // Check specific permission
    const permission = this.userPermissions.find((p) => p.resource === resource)
    return permission ? permission.actions.includes(action) : false
  }

  canAccess(resource: string): boolean {
    return this.hasPermission(resource, "view")
  }

  canCreate(resource: string): boolean {
    return this.hasPermission(resource, "create")
  }

  canUpdate(resource: string): boolean {
    return this.hasPermission(resource, "update")
  }

  canDelete(resource: string): boolean {
    return this.hasPermission(resource, "delete")
  }

  isMainAdmin(): boolean {
    return this.userRole === "admin"
  }

  getUserRole(): string | null {
    return this.userRole
  }

  getUserPermissions(): Permission[] {
    return this.userPermissions
  }
}

// Hook for using permissions in components
export function usePermissions() {
  const permissionManager = PermissionManager.getInstance()

  return {
    hasPermission: (resource: string, action: string) => permissionManager.hasPermission(resource, action),
    canAccess: (resource: string) => permissionManager.canAccess(resource),
    canCreate: (resource: string) => permissionManager.canCreate(resource),
    canUpdate: (resource: string) => permissionManager.canUpdate(resource),
    canDelete: (resource: string) => permissionManager.canDelete(resource),
    isMainAdmin: () => permissionManager.isMainAdmin(),
    getUserRole: () => permissionManager.getUserRole(),
    getUserPermissions: () => permissionManager.getUserPermissions(),
  }
}
