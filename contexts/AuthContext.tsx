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
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (initialSession?.user) {
          // Get user data from database
          const { data: userData, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", initialSession.user.id)
            .single()

          if (!error && userData && userData.role === "admin") {
            setUser(userData)
            setSession(initialSession)
            // Set cookie for middleware
            document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}`
            // Store in localStorage as backup
            localStorage.setItem("jamolstroy_admin", JSON.stringify(userData))
            localStorage.setItem("jamolstroy_session", JSON.stringify(initialSession))
          } else {
            // Not admin or error, clear session
            await supabase.auth.signOut()
            localStorage.removeItem("jamolstroy_admin")
            localStorage.removeItem("jamolstroy_session")
          }
        } else {
          // No session, check localStorage
          const storedUser = localStorage.getItem("jamolstroy_admin")
          const storedSession = localStorage.getItem("jamolstroy_session")

          if (storedUser && storedSession) {
            try {
              const userData = JSON.parse(storedUser)
              const sessionData = JSON.parse(storedSession)

              if (userData.role === "admin") {
                setUser(userData)
                setSession(sessionData)
                document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}`
              }
            } catch (error) {
              console.error("Error parsing stored data:", error)
              localStorage.removeItem("jamolstroy_admin")
              localStorage.removeItem("jamolstroy_session")
            }
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session)

      if (event === "SIGNED_IN" && session?.user) {
        // Get user data from database
        const { data: userData, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

        if (!error && userData && userData.role === "admin") {
          setUser(userData)
          setSession(session)
          // Set cookie for middleware
          document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}`
          // Store in localStorage
          localStorage.setItem("jamolstroy_admin", JSON.stringify(userData))
          localStorage.setItem("jamolstroy_session", JSON.stringify(session))
        } else {
          // Not admin, sign out
          await supabase.auth.signOut()
          localStorage.removeItem("jamolstroy_admin")
          localStorage.removeItem("jamolstroy_session")
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setSession(null)
        document.cookie = "jamolstroy_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        localStorage.removeItem("jamolstroy_admin")
        localStorage.removeItem("jamolstroy_session")
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const setUserData = (userData: User, sessionData: Session) => {
    setUser(userData)
    setSession(sessionData)
    document.cookie = `jamolstroy_admin_token=${userData.id}; path=/; max-age=${7 * 24 * 60 * 60}`
    localStorage.setItem("jamolstroy_admin", JSON.stringify(userData))
    localStorage.setItem("jamolstroy_session", JSON.stringify(sessionData))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    document.cookie = "jamolstroy_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    localStorage.removeItem("jamolstroy_admin")
    localStorage.removeItem("jamolstroy_session")
  }

  return <AuthContext.Provider value={{ user, loading, session, logout, setUserData }}>{children}</AuthContext.Provider>
}
