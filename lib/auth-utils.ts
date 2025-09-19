import { createServerSupabaseClient } from "./supabase"

export interface AuthenticatedUser {
  id: string
  email?: string
  role: string
  admin_role_id?: string
  is_active: boolean
  permissions?: string[]
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Get user data with role information
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(`
        id,
        email,
        role,
        admin_role_id,
        is_active,
        admin_roles (
          name,
          permissions
        )
      `)
      .eq("id", user.id)
      .single()

    if (userError || !userData || userData.role !== "admin" || !userData.is_active) {
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      admin_role_id: userData.admin_role_id,
      is_active: userData.is_active,
      permissions: userData.admin_roles?.permissions || [],
    }
  } catch (error) {
    console.error("Error getting authenticated user:", error)
    return null
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  return user
}

export async function requirePermission(module: string, action: string): Promise<AuthenticatedUser> {
  const user = await requireAuth()

  // Super admin has all permissions
  if (user.permissions?.includes("*")) {
    return user
  }

  // Check specific permission
  const requiredPermission = `${module}:${action}`
  const moduleWildcard = `${module}:*`

  if (!user.permissions?.includes(requiredPermission) && !user.permissions?.includes(moduleWildcard)) {
    throw new Error(`Permission denied: ${requiredPermission}`)
  }

  return user
}

export function createAuthResponse(error: string, status = 401) {
  return Response.json({ error }, { status })
}
