"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"

interface User {
  id: string
  telegram_id?: number
  first_name?: string
  last_name?: string
  username?: string
  role: string
  avatar_url?: string
  email?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  session: Session | null
  logout: () => void
  setUserData: (userData: User, sessionData: Session) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  session: null,
  logout: () => {},
  setUserData: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (initialSession?.user) {
          console.log("Initial session found:", initialSession.user.id)

          // Get user data from database
          const { data: userData, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", initialSession.user.id)
            .single()

          if (!mounted) return

          if (!error && userData && userData.role === "admin") {
            console.log("Admin user found:", userData)
            setUser(userData)
            setSession(initialSession)
            // Set cookie for middleware
            document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
          } else {
            console.log("Not admin or error:", error, userData)
            // Not admin or error, clear session
            await supabase.auth.signOut()
          }
        } else {
          console.log("No initial session found")
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      if (!mounted) return

      if (event === "SIGNED_IN" && session?.user) {
        // Get user data from database
        const { data: userData, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

        if (!mounted) return

        if (!error && userData && userData.role === "admin") {
          console.log("Setting user data:", userData)
          setUser(userData)
          setSession(session)
          // Set cookie for middleware
          document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
        } else {
          console.log("Not admin, signing out")
          // Not admin, sign out
          await supabase.auth.signOut()
        }
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out")
        setUser(null)
        setSession(null)
        document.cookie = "jamolstroy_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        console.log("Token refreshed for user:", session.user.id)
        // Update session on token refresh
        setSession(session)
      }

      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const setUserData = (userData: User, sessionData: Session) => {
    console.log("Setting user data manually:", userData)
    setUser(userData)
    setSession(sessionData)
    document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
  }

  const logout = async () => {
    console.log("Logging out user")
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    document.cookie = "jamolstroy_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  }

  return <AuthContext.Provider value={{ user, loading, session, logout, setUserData }}>{children}</AuthContext.Provider>
}
