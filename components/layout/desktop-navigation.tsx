"use client"

import type React from "react"
import { Home, Grid3X3, Users, User, ShoppingBag } from "lucide-react"

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
}

const navigationItems: NavItem[] = [
  { id: "home", label: "Bosh sahifa", icon: Home, path: "/" },
  { id: "catalog", label: "Katalog", icon: Grid3X3, path: "/catalog" },
  { id: "workers", label: "Ishchilar", icon: Users, path: "/workers" },
  { id: "orders", label: "Buyurtmalar", icon: ShoppingBag, path: "/orders" },
  { id: "profile", label: "Profil", icon: User, path: "/profile" },
]

export function DesktopNavigation() {
  return null
}
