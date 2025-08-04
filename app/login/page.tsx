"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useTelegram } from "@/contexts/TelegramContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MessageCircle, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { isTelegramWebApp } = useTelegram()

  const [isLoading, setIsLoading] = useState(false)
  const [telegramUrl, setTelegramUrl] = useState("")
  const [tempToken, setTempToken] = useState("")
  const [loginStatus, setLoginStatus] = useState<"pending" | "approved" | "rejected" | null>(null)

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (tempToken && loginStatus === "pending") {
      // Poll for login status
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/website-login?token=${tempToken}`)
          const data = await response.json()

          if (data.status === "approved" && data.user) {
            setLoginStatus("approved")
            localStorage.setItem("jamolstroy_user", JSON.stringify(data.user))
            setTimeout(() => {
              window.location.href = "/"
            }, 1000)
          } else if (data.status === "rejected") {
            setLoginStatus("rejected")
          }
        } catch (error) {
          console.error("Login status check error:", error)
        }
      }, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [tempToken, loginStatus])

  const handleTelegramLogin = async () => {
    try {
      setIsLoading(true)
      const clientId = "jamolstroy_web_" + Date.now()

      const response = await fetch("/api/website-login", {
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

        // Open Telegram
        window.open(data.telegram_url, "_blank")
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Telegram login error:", error)
      alert("Telegram login xatoligi")
    } finally {
      setIsLoading(false)
    }
  }

  const resetLogin = () => {
    setLoginStatus(null)
    setTempToken("")
    setTelegramUrl("")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (isTelegramWebApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Telegram Web App</CardTitle>
            <CardDescription>Siz allaqachon Telegram orqali kirgansiz</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Bosh sahifaga o'tish
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">JamolStroy</CardTitle>
          <CardDescription>Telegram orqali hisobingizga kiring</CardDescription>
        </CardHeader>
        <CardContent>
          {loginStatus === "pending" ? (
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <Clock className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold">Telegram orqali tasdiqlang</h3>
              <p className="text-muted-foreground text-sm">Telegram botga o'ting va login so'rovini tasdiqlang</p>
              {telegramUrl && (
                <Button variant="outline" onClick={() => window.open(telegramUrl, "_blank")} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Telegram botni ochish
                </Button>
              )}
              <Button variant="ghost" onClick={resetLogin} className="w-full">
                Bekor qilish
              </Button>
            </div>
          ) : loginStatus === "approved" ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold text-green-600">Login muvaffaqiyatli!</h3>
              <p className="text-muted-foreground text-sm">Bosh sahifaga yo'naltirilmoqda...</p>
            </div>
          ) : loginStatus === "rejected" ? (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="text-lg font-semibold text-red-600">Login rad etildi</h3>
              <p className="text-muted-foreground text-sm">Telegram orqali login rad etildi</p>
              <Button onClick={resetLogin} className="w-full">
                Qayta urinish
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <MessageCircle className="h-12 w-12 mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Telegram orqali kirish</h3>
                <p className="text-muted-foreground text-sm">
                  Xavfsiz va tez kirish uchun Telegram akkauntingizdan foydalaning
                </p>
              </div>
              <Button onClick={handleTelegramLogin} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Telegram orqali kirish
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
