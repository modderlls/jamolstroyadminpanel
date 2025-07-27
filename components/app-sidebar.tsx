"use client"

import type * as React from "react"
import {
  BookOpen,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Package,
  ShoppingCart,
  CreditCard,
  Calendar,
  HardDrive,
  Megaphone,
  Briefcase,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "JamolStroy Admin",
    email: "admin@jamolstroy.uz",
    avatar: "/placeholder-user.jpg",
  },
  teams: [
    {
      name: "JamolStroy",
      logo: GalleryVerticalEnd,
      plan: "Admin Panel",
    },
  ],
  navMain: [
    {
      title: "Boshqaruv paneli",
      url: "/",
      icon: SquareTerminal,
      isActive: true,
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
    },
    {
      title: "Arendalar",
      url: "/rentals",
      icon: Calendar,
    },
    {
      title: "Qarzdorlar",
      url: "/debtors",
      icon: CreditCard,
    },
    {
      title: "Kategoriyalar",
      url: "/categories",
      icon: BookOpen,
    },
    {
      title: "Ustalar",
      url: "/workers",
      icon: Briefcase,
    },
    {
      title: "Reklamalar",
      url: "/ads",
      icon: Megaphone,
    },
    {
      title: "Xotiralar",
      url: "/storage",
      icon: HardDrive,
    },
    {
      title: "Sozlamalar",
      url: "/settings",
      icon: Settings2,
    },
  ],
  projects: [
    {
      name: "Mahsulotlar boshqaruvi",
      url: "/products",
      icon: Frame,
    },
    {
      name: "Buyurtmalar nazorati",
      url: "/orders",
      icon: PieChart,
    },
    {
      name: "Mijozlar boshqaruvi",
      url: "/customers",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
