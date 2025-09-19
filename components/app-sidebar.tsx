"use client"

import type * as React from "react"
import {
  Home,
  Package,
  ShoppingCart,
  LogOut,
  BarChart3,
  Users,
  Settings,
  FolderTree,
  Shield,
  Activity,
  HardDrive,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useKPITracker } from "@/hooks/use-kpi-tracker"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [debtorsCount, setDebtorsCount] = useState(0)
  const [rentalsCount, setRentalsCount] = useState(0)

  useKPITracker()

  useEffect(() => {
    fetchCounts()

    // Set up real-time subscriptions
    const ordersSubscription = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => {
      ordersSubscription.unsubscribe()
    }
  }, [])

  const fetchCounts = async () => {
    try {
      // Fetch pending orders count
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")

      setPendingOrdersCount(pendingCount || 0)

      // Fetch debtors count
      const { count: debtorsCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("is_borrowed", true)
        .eq("is_payed", false)

      setDebtorsCount(debtorsCount || 0)

      // Fetch active rentals count
      const { count: rentalsCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("product_type", "rental")
        .in("status", ["confirmed", "processing", "shipped"])

      setRentalsCount(rentalsCount || 0)
    } catch (error) {
      console.error("Error fetching counts:", error)
    }
  }

  const data = {
    navMain: [
      {
        title: "Bosh sahifa",
        url: "/",
        icon: Home,
      },
      {
        title: "Mahsulotlar",
        url: "/products",
        icon: Package,
      },
      {
        title: "Buyurtmalar",
        url: "/orders",
        icon: ShoppingCart,
        badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
      },
      {
        title: "Qarzdorlar",
        url: "/debtors",
        icon: Users,
        badge: debtorsCount > 0 ? debtorsCount : null,
      },
      {
        title: "Kategoriyalar",
        url: "/categories",
        icon: FolderTree,
      },
      {
        title: "Adminlar",
        url: "/admins",
        icon: Shield,
      },
      {
        title: "KPI Tizimi",
        url: "/kpi",
        icon: Activity,
      },
      {
        title: "Xotira",
        url: "/storage",
        icon: HardDrive,
      },
      {
        title: "Sozlamalar",
        url: "/settings",
        icon: Settings,
      },
    ],
  }

  return (
    <Sidebar
      {...props}
      className="border-r border-border/50 backdrop-blur-xl bg-background/80 supports-[backdrop-filter]:bg-background/60"
    >
      <SidebarHeader className="border-b border-border/30 p-6 backdrop-blur-sm bg-background/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">JamolStroy</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 backdrop-blur-sm bg-background/30">
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground font-medium">Asosiy bo'limlar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="ios-button hover:bg-accent/50 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground relative backdrop-blur-sm"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && <Badge className="notification-badge">{item.badge}</Badge>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/30 p-4 backdrop-blur-sm bg-background/50">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">@{user?.username || "admin"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="w-full ios-button hover:bg-destructive hover:text-destructive-foreground bg-transparent backdrop-blur-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Chiqish
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
