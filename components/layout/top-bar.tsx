"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, ShoppingCart, MapPin, Phone, Clock, Home, Grid3X3, Users, Package, User } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { CartSidebar } from "./cart-sidebar"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"

interface CompanyInfo {
  id: string
  name: string
  version: string
  logo_url: string
  phone_number: string
  location: string
  time: string
  social_telegram: string
  social_x: string
  social_youtube: string
  social_instagram: string
}

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
  { id: "orders", label: "Buyurtmalar", icon: Package, path: "/orders" },
  { id: "profile", label: "Profil", icon: User, path: "/profile" },
]

export function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { uniqueItemsCount } = useCart()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [showCartSidebar, setShowCartSidebar] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    fetchCompanyInfo()
  }, [])

  useEffect(() => {
    // Auto dark/light mode based on Uzbekistan time (GMT+5)
    const setThemeBasedOnTime = () => {
      const now = new Date()
      // Convert to Uzbekistan time (UTC+5)
      const uzbekTime = new Date(now.getTime() + 5 * 60 * 60 * 1000)
      const hour = uzbekTime.getHours()

      // Light mode: 6 AM to 6 PM, Dark mode: 6 PM to 6 AM
      const isDark = hour < 6 || hour >= 18

      if (window.Telegram?.WebApp) {
        // Telegram Web App uchun theme
        const tgTheme = window.Telegram.WebApp.colorScheme
        document.documentElement.classList.toggle("dark", tgTheme === "dark" || isDark)
      } else {
        // Oddiy web uchun vaqtga qarab
        document.documentElement.classList.toggle("dark", isDark)
      }
    }

    setThemeBasedOnTime()

    // Har daqiqada yangilaymiz
    const interval = setInterval(setThemeBasedOnTime, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (searchQuery.length > 1) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Set new timeout for auto search
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchSuggestions(searchQuery)
        // Auto search after 1 second of typing
        if (searchQuery.trim()) {
          router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`)
        }
      }, 1000)
    } else {
      setSearchSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, router])

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("*")
        .eq("version", "1.0.0")
        .eq("is_active", true)
        .single()

      if (error) throw error
      setCompanyInfo(data)
    } catch (error) {
      console.error("Company ma'lumotlarini yuklashda xatolik:", error)
    }
  }

  const fetchSearchSuggestions = async (query: string) => {
    try {
      const { data, error } = await supabase.rpc("get_search_suggestions", {
        search_term: query,
        limit_count: 8,
      })

      if (error) throw error
      setSearchSuggestions(data || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error("Search suggestions error:", error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Track search query
      supabase.rpc("track_search_query", { search_query: searchQuery.trim() })
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push("/")
    }
    setShowSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    router.push(`/?search=${encodeURIComponent(suggestion)}`)
  }

  const handleCartClick = () => {
    setShowCartSidebar(true)
  }

  return (
    <>
      <div className="bg-background border-b border-border sticky top-0 z-30">
        {/* Company Info Bar - Desktop Only */}
        {companyInfo && (
          <div className="hidden lg:block bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b border-border/50">
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <Phone className="w-4 h-4" />
                    <span>{companyInfo.phone_number}</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <MapPin className="w-4 h-4" />
                    <span>Qashqadaryo viloyati, G'uzor tumani</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <Clock className="w-4 h-4" />
                    <span>{companyInfo.time}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span>100+ ishchi • Ijtimoiy tarmoqlar:</span>
                  <div className="flex items-center space-x-3">
                    {companyInfo.social_telegram && (
                      <a
                        href={`https://t.me/${companyInfo.social_telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-500 transition-colors duration-200"
                      >
                        Telegram
                      </a>
                    )}
                    {companyInfo.social_instagram && (
                      <a
                        href={`https://instagram.com/${companyInfo.social_instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-pink-500 transition-colors duration-200"
                      >
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Header - Mobile: Search only, Desktop: Logo + Search + Cart */}
        <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between">
            {/* Logo - Desktop Only */}
            <button
              onClick={() => router.push("/")}
              className="hidden md:flex items-center space-x-2 hover:opacity-80 transition-opacity group flex-shrink-0"
            >
              {companyInfo?.logo_url && (
                <div className="relative">
                  <Image
                    src={companyInfo.logo_url || "/placeholder.svg"}
                    alt={companyInfo.name}
                    width={28}
                    height={28}
                    className="w-7 h-7 md:w-9 md:h-9 rounded-lg group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              )}
              <div className="text-left">
                <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                  {companyInfo?.name || "JamolStroy"}
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">Qurilish materiallari</p>
              </div>
            </button>

            {/* Search Bar - Full width on mobile, constrained on desktop */}
            <div className="flex-1 md:max-w-xl md:mx-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative group">
                  <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <input
                    type="text"
                    placeholder="Qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 md:py-2.5 text-sm bg-gray-900 dark:bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>

                {/* Search Suggestions */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {/* Current search query as first option */}
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(searchQuery.trim())}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex items-center space-x-2 border-b border-gray-700"
                      >
                        <Search className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">"{searchQuery.trim()}" ni qidirish</span>
                      </button>
                    )}

                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.suggestion)}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        <Search className="w-3 h-3 text-gray-400" />
                        <span>{suggestion.suggestion}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {suggestion.type === "product"
                            ? "Mahsulot"
                            : suggestion.type === "worker"
                              ? "Usta"
                              : "Kategoriya"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Cart Button - Desktop and Mobile */}
            <button
              onClick={handleCartClick}
              className="relative p-2 md:p-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:from-primary/90 hover:to-primary hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md group flex-shrink-0"
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-200" />
              {uniqueItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center animate-pulse shadow-lg">
                  {uniqueItemsCount > 99 ? "99+" : uniqueItemsCount}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:block border-t border-border bg-gradient-to-r from-background via-muted/10 to-background">
          <div className="container mx-auto px-4">
            <nav className="flex justify-center space-x-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.path
                const Icon = item.icon

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`relative flex items-center space-x-2 px-4 py-3 rounded-t-lg transition-all duration-300 group overflow-hidden ${
                      isActive
                        ? "text-primary bg-gradient-to-b from-primary/10 to-transparent border-b-2 border-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-b hover:from-muted/30 hover:to-transparent"
                    }`}
                  >
                    {/* Animated background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r transition-all duration-300 ${
                        isActive
                          ? "from-primary/5 via-primary/10 to-primary/5 opacity-100"
                          : "from-transparent via-muted/20 to-transparent opacity-0 group-hover:opacity-100"
                      }`}
                    />

                    {/* Shimmer effect */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 transition-transform duration-1000 ${
                        isActive ? "translate-x-full" : "-translate-x-full group-hover:translate-x-full"
                      }`}
                    />

                    <Icon
                      className={`w-4 h-4 relative z-10 transition-all duration-200 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium relative z-10 transition-all duration-200 ${
                        isActive ? "font-semibold" : ""
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-primary to-primary/80 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={showCartSidebar} onClose={() => setShowCartSidebar(false)} />
    </>
  )
}
