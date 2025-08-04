"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTelegram } from "./TelegramContext"

interface UserProfile {
  id: string
  telegram_id?: string
  first_name: string
  last_name: string
  username?: string
  phone_number?: string
  email?: string
  avatar_url?: string
  is_verified: boolean
  role: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: UserProfile | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => void
  checkWebsiteLoginStatus: (token: string) => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: tgUser, isReady, isTelegramWebApp } = useTelegram()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isReady) {
      if (isTelegramWebApp && tgUser) {
        // Telegram Web App automatic login - no login required
        console.log("Starting Telegram Web App auto login...")
        handleTelegramWebAppLogin()
      } else {
        // Regular web - check for login token or local session
        console.log("Checking web session...")
        checkWebSession()
      }
    }
  }, [isReady, isTelegramWebApp, tgUser])

  const handleTelegramWebAppLogin = async () => {
    if (!tgUser) {
      console.log("No Telegram user found")
      setLoading(false)
      return
    }

    try {
      console.log("Auto login for Telegram Web App user:", tgUser.id)

      // Find user by Telegram ID
      const { data: existingUser, error: searchError } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", tgUser.id.toString())
        .single()

      if (searchError && searchError.code !== "PGRST116") {
        console.log("Search error handled:", searchError.message)
        setLoading(false)
        return
      }

      let userData = existingUser

      // If user doesn't exist, create new user automatically
      if (!existingUser) {
        console.log("Creating new user for Telegram Web App ID:", tgUser.id)

        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert([
            {
              telegram_id: tgUser.id.toString(),
              first_name: tgUser.first_name,
              last_name: tgUser.last_name || "",
              username: tgUser.username || "",
              is_verified: true,
              role: "customer",
            },
          ])
          .select()
          .single()

        if (createError) {
          console.log("Create error handled:", createError.message)
          setLoading(false)
          return
        }
        userData = newUser
        console.log("New user created successfully:", userData.id)
      } else {
        console.log("Existing user found, updating info...")

        // Update existing user info
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .update({
            first_name: tgUser.first_name,
            last_name: tgUser.last_name || "",
            username: tgUser.username || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingUser.id)
          .select()
          .single()

        if (updateError) {
          console.log("Update error handled:", updateError.message)
          userData = existingUser // Use existing data if update fails
        } else {
          userData = updatedUser
        }
      }

      setUser(userData)
      localStorage.setItem("jamolstroy_user", JSON.stringify(userData))
      console.log("Telegram Web App auto login successful for:", userData.first_name)
    } catch (error) {
      console.log("Telegram Web App login error handled:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkWebSession = async () => {
    try {
      // Check for login token in URL
      const urlParams = new URLSearchParams(window.location.search)
      const loginToken = urlParams.get("token")

      if (loginToken) {
        console.log("Login token found, checking status...")
        const userData = await checkWebsiteLoginStatus(loginToken)
        if (userData) {
          setUser(userData)
          localStorage.setItem("jamolstroy_user", JSON.stringify(userData))
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
          return
        }
      }

      // Check local storage
      const savedUser = localStorage.getItem("jamolstroy_user")
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          console.log("Local session found for:", parsedUser.first_name)
          setUser(parsedUser)
        } catch (parseError) {
          console.error("Error parsing saved user:", parseError)
          localStorage.removeItem("jamolstroy_user")
        }
      }
    } catch (error) {
      console.error("Web session check error:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkWebsiteLoginStatus = async (token: string): Promise<UserProfile | null> => {
    try {
      console.log("Checking login status for token:", token)

      const { data: session, error: sessionError } = await supabase
        .from("website_login_sessions")
        .select(`
          *,
          user:users(*)
        `)
        .eq("temp_token", token)
        .eq("status", "approved")
        .single()

      if (sessionError || !session) {
        console.log("No approved session found")
        return null
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        console.log("Session expired")
        return null
      }

      console.log("Login approved, user data:", session.user)
      return session.user as UserProfile
    } catch (error) {
      console.error("Login status check error:", error)
      return null
    }
  }

  const signOut = () => {
    console.log("Signing out user")
    setUser(null)
    localStorage.removeItem("jamolstroy_user")
    localStorage.removeItem("jamolstroy_cart")

    // Clear all jamolstroy related data
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("jamolstroy_")) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  const value = {
    user,
    profile: user, // For backward compatibility
    loading,
    signOut,
    checkWebsiteLoginStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
