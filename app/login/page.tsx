"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MessageCircle, ExternalLink, CheckCircle, XCircle, Clock, Shield } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [telegramUrl, setTelegramUrl] = useState("")
  const [tempToken, setTempToken] = useState("")
  const [loginStatus, setLoginStatus] = useState<"pending" | "approved" | "rejected" | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    if (user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (tempToken && loginStatus === "pending" && !isCheckingRef.current) {
      isCheckingRef.current = true

      intervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/admin-login?token=${tempToken}`)
          const data = await response.json()

          if (data.status === "approved" && data.user) {
            setLoginStatus("approved")
            localStorage.setItem("jamolstroy_admin", JSON.stringify(data.user))

            // Clear interval before redirect
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }

            // Delay redirect to show success message
            setTimeout(() => {
              window.location.href = "/"
            }, 1500)
          } else if (data.status === "rejected") {
            setLoginStatus("rejected")
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          } else if (data.status === "unauthorized") {
            setLoginStatus("rejected")
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            alert("Admin huquqi talab qilinadi!")
          }
        } catch (error) {
          console.error("Admin login status check error:", error)
        }
      }, 3000) // Increased interval to 3 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isCheckingRef.current = false
    }
  }, [tempToken, loginStatus])

  const handleTelegramLogin = async () => {
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

      const data = await response.json()

      if (response.ok) {
        setTempToken(data.temp_token)
        setTelegramUrl(data.telegram_url)
        setLoginStatus("pending")
        window.open(data.telegram_url, "_blank")
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Admin Telegram login error:", error)
      alert("Telegram login xatoligi")
    } finally {
      setIsLoading(false)
    }
  }

  const resetLogin = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isCheckingRef.current = false
    setLoginStatus(null)
    setTempToken("")
    setTelegramUrl("")
  }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md ios-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl text-foreground">JamolStroy Admin</CardTitle>
          <CardDescription>Admin panel uchun Telegram orqali kiring</CardDescription>
        </CardHeader>
        <CardContent>
          {loginStatus === "pending" ? (
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
              <Button variant="ghost" onClick={resetLogin} className="w-full ios-button">
                Bekor qilish
              </Button>
            </div>
          ) : loginStatus === "approved" ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold text-green-600">Admin login muvaffaqiyatli!</h3>
              <p className="text-muted-foreground text-sm">Admin panelga yo'naltirilmoqda...</p>
            </div>
          ) : loginStatus === "rejected" ? (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="text-lg font-semibold text-red-600">Login rad etildi</h3>
              <p className="text-muted-foreground text-sm">Admin huquqi yo'q yoki login rad etildi</p>
              <Button onClick={resetLogin} className="w-full ios-button">
                Qayta urinish
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <MessageCircle className="h-12 w-12 mx-auto text-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Admin Panel</h3>
                <p className="text-muted-foreground text-sm">Admin huquqiga ega Telegram akkauntingiz bilan kiring</p>
              </div>
              <div className="bg-muted border border-border rounded-xl p-3">
                <p className="text-sm text-foreground">
                  🔒 Bu admin panel. Faqat admin huquqiga ega foydalanuvchilar kirishi mumkin.
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
                    Admin sifatida kirish
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
