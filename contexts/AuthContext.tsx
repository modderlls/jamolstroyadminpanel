"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: string
  telegram_id: number
  first_name: string
  last_name: string
  username?: string
  role: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for admin user
    const adminUser = localStorage.getItem("jamolstroy_admin")
    if (adminUser) {
      try {
        const userData = JSON.parse(adminUser)
        if (userData.role === "admin") {
          setUser(userData)
          // Set cookie for middleware
          document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}`
        } else {
          // Not admin, redirect to login
          localStorage.removeItem("jamolstroy_admin")
          window.location.href = "/login"
        }
      } catch (error) {
        console.error("Error parsing admin user:", error)
        localStorage.removeItem("jamolstroy_admin")
        window.location.href = "/login"
      }
    } else {
      // No admin user, redirect to login
      window.location.href = "/login"
    }
    setLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem("jamolstroy_admin")
    document.cookie = "jamolstroy_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    setUser(null)
    window.location.href = "/login"
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>
}
