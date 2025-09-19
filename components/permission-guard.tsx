"use client"

import { usePermissions } from "@/lib/permissions"
import type { ReactNode } from "react"

interface PermissionGuardProps {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ resource, action, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(resource, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isMainAdmin } = usePermissions()

  if (!isMainAdmin()) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleGuardProps {
  allowedRoles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { getUserRole } = usePermissions()
  const userRole = getUserRole()

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
