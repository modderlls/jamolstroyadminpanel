"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, Grid3X3, Users, Package, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const navigationItems = [
  {
    id: "home",
    label: "Bosh",
    icon: Home,
    path: "/",
  },
  {
    id: "catalog",
    label: "Katalog",
    icon: Grid3X3,
    path: "/catalog",
  },
  {
    id: "workers",
    label: "Ishchilar",
    icon: Users,
    path: "/workers",
  },
  {
    id: "orders",
    label: "Buyurtma",
    icon: Package,
    path: "/orders",
  },
  {
    id: "profile",
    label: "Profil",
    icon: User,
    path: "/profile",
  },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchOrderCount()
    }
  }, [user])

  const fetchOrderCount = async () => {
    if (!user) return

    try {
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", user.id)

      if (error) throw error
      setOrderCount(count || 0)
    } catch (error) {
      console.error("Order count fetch error:", error)
    }
  }

  const getBadgeCount = (itemId: string) => {
    switch (itemId) {
      case "orders":
        return orderCount
      default:
        return 0
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-20 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon
          const badgeCount = getBadgeCount(item.id)

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center space-y-0.5 py-1.5 px-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform duration-200`} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse min-w-[16px]">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium truncate ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
