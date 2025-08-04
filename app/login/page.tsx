"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MessageCircle, ExternalLink, CheckCircle, XCircle, Clock, Shield, Mail } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Email/Password login state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailLoginLoading, setEmailLoginLoading] = useState(false)
  const [emailLoginError, setEmailLoginError] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Telegram login state
  const [isLoading, setIsLoading] = useState(false)
  const [telegramUrl, setTelegramUrl] = useState("")
  const [tempToken, setTempToken] = useState("")
  const [loginStatus, setLoginStatus] = useState<"pending" | "approved" | "rejected" | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)
  const hasRedirectedRef = useRef(false)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isCheckingRef.current = false
    }
  }, [])

  // Handle user redirect only once
  useEffect(() => {
    if (!loading && user && !hasRedirectedRef.current && mountedRef.current) {
      hasRedirectedRef.current = true
      // Clear any intervals before redirect
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      router.replace("/")
    }
  }, [user, loading, router])

  // Handle login status checking
  useEffect(() => {
    if (!tempToken || loginStatus !== "pending" || isCheckingRef.current || !mountedRef.current) {
      return
    }

    isCheckingRef.current = true

    const checkLoginStatus = async () => {
      if (!mountedRef.current) return

      try {
        const response = await fetch(`/api/admin-login?token=${tempToken}`)
        if (!response.ok) throw new Error("Network response was not ok")

        const data = await response.json()

        if (!mountedRef.current) return

        if (data.status === "approved" && data.user) {
          setLoginStatus("approved")
          localStorage.setItem("jamolstroy_admin", JSON.stringify(data.user))

          // Clear interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          isCheckingRef.current = false

          // Delay redirect to show success message
          setTimeout(() => {
            if (mountedRef.current && !hasRedirectedRef.current) {
              hasRedirectedRef.current = true
              window.location.replace("/")
            }
          }, 1500)
        } else if (data.status === "rejected" || data.status === "unauthorized") {
          setLoginStatus("rejected")
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          isCheckingRef.current = false

          if (data.status === "unauthorized") {
            alert("Admin huquqi talab qilinadi!")
          }
        }
      } catch (error) {
        console.error("Admin login status check error:", error)
        // Don't stop checking on network errors, just log them
      }
    }

    // Initial check
    checkLoginStatus()

    // Set up interval for subsequent checks
    intervalRef.current = setInterval(checkLoginStatus, 3000)

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isCheckingRef.current = false
    }
  }, [tempToken, loginStatus])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mountedRef.current) return

    setEmailLoginLoading(true)
    setEmailLoginError("")

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (mountedRef.current) {
        if (response.ok && data.authenticated) {
          setIsAuthenticated(true)
          setEmailLoginError("")
        } else {
          setEmailLoginError(data.error || "Login xatoligi")
        }
      }
    } catch (error) {
      console.error("Email login error:", error)
      if (mountedRef.current) {
        setEmailLoginError("Login xatoligi")
      }
    } finally {
      if (mountedRef.current) {
        setEmailLoginLoading(false)
      }
    }
  }

  const handleTelegramLogin = async () => {
    if (!mountedRef.current || !isAuthenticated) return

    try {
      setIsLoading(true)
      const clientId = "jamolstroy_admin_" + Date.now()

      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: clientId }),
      })

      if (!response.ok) throw new Error("Network response was not ok")
      const data = await response.json()

      if (mountedRef.current) {
        setTempToken(data.temp_token)
        setTelegramUrl(data.telegram_url)
        setLoginStatus("pending")
        window.open(data.telegram_url, "_blank")
      }
    } catch (error) {
      console.error("Admin Telegram login error:", error)
      if (mountedRef.current) {
        alert("Telegram login xatoligi")
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const resetLogin = () => {
    if (!mountedRef.current) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isCheckingRef.current = false
    setLoginStatus(null)
    setTempToken("")
    setTelegramUrl("")
  }

  const resetToEmailLogin = () => {
    setIsAuthenticated(false)
    setEmail("")
    setPassword("")
    setEmailLoginError("")
    resetLogin()
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if user is already logged in
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
          <p className="text-muted-foreground">Yo'naltirilmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md ios-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl text-foreground">JamolStroy Admin</CardTitle>
          <CardDescription>
            {!isAuthenticated ? "Admin panel uchun email va parol bilan kiring" : "Telegram orqali tasdiqlang"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            // Email/Password Login Form
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {emailLoginError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                  {emailLoginError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jamolstroy.uz"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  required
                />
              </div>

              <Button type="submit" disabled={emailLoginLoading || !email || !password} className="w-full ios-button">
                {emailLoginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Kirish
                  </>
                )}
              </Button>

              <div className="bg-muted border border-border rounded-xl p-3">
                <p className="text-sm text-foreground">
                  🔒 Bu admin panel. Faqat admin huquqiga ega foydalanuvchilar kirishi mumkin.
                </p>
              </div>
            </form>
          ) : loginStatus === "pending" ? (
            // Telegram Confirmation
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Telegram orqali tasdiqlang</h3>
              <p className="text-muted-foreground text-sm">Telegram botga o'ting va admin login so'rovini tasdiqlang</p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Faqat admin huquqiga ega foydalanuvchilar kirishi mumkin
                </p>
              </div>
              {telegramUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(telegramUrl, "_blank")}
                  className="w-full ios-button"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Telegram botni ochish
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={resetLogin} className="flex-1 ios-button">
                  Bekor qilish
                </Button>
                <Button variant="outline" onClick={resetToEmailLogin} className="flex-1 ios-button bg-transparent">
                  Orqaga
                </Button>
              </div>
            </div>
          ) : loginStatus === "approved" ? (
            // Success
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold text-green-600">Admin login muvaffaqiyatli!</h3>
              <p className="text-muted-foreground text-sm">Admin panelga yo'naltirilmoqda...</p>
            </div>
          ) : loginStatus === "rejected" ? (
            // Rejected
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="text-lg font-semibold text-red-600">Login rad etildi</h3>
              <p className="text-muted-foreground text-sm">Admin huquqi yo'q yoki login rad etildi</p>
              <div className="flex gap-2">
                <Button onClick={resetLogin} className="flex-1 ios-button">
                  Qayta urinish
                </Button>
                <Button variant="outline" onClick={resetToEmailLogin} className="flex-1 ios-button bg-transparent">
                  Orqaga
                </Button>
              </div>
            </div>
          ) : (
            // Authenticated, ready for Telegram
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600">Email/parol tasdiqlandi!</h3>
                <p className="text-muted-foreground text-sm">Endi Telegram orqali yakuniy tasdiqlashni o'ting</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📱 Telegram orqali yakuniy tasdiqlash uchun tugmani bosing
                </p>
              </div>
              <Button onClick={handleTelegramLogin} disabled={isLoading} className="w-full ios-button">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Telegram orqali tasdiqlash
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetToEmailLogin} className="w-full ios-button bg-transparent">
                Orqaga
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
