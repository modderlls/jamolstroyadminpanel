"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Lock, Shield, Key, Trash2, Edit, Loader2 } from "lucide-react"

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [hasPassword, setHasPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isProtected, setIsProtected] = useState(true)
  const [accessPassword, setAccessPassword] = useState("")
  const [accessError, setAccessError] = useState("")

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      setPageLoading(true)
      const response = await fetch("/api/md-password")
      const data = await response.json()

      setHasPassword(data.hasPassword)

      // If no password is set, allow access
      if (!data.hasPassword) {
        setIsProtected(false)
      }
    } catch (error) {
      console.error("Error checking access:", error)
    } finally {
      setPageLoading(false)
    }
  }

  const verifyAccess = async () => {
    if (!accessPassword) {
      setAccessError("MD parolni kiriting")
      return
    }

    setLoading(true)
    setAccessError("")

    try {
      const response = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: accessPassword }),
      })

      const data = await response.json()

      if (data.valid) {
        setIsProtected(false)
        setAccessPassword("")
      } else {
        setAccessError(data.error || "Noto'g'ri parol")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setAccessError("Parolni tekshirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (password: string) => {
    return /^\d+$/.test(password) && password.length >= 4
  }

  const handleCreatePassword = async () => {
    setError("")
    setSuccess("")

    if (!validatePassword(newPassword)) {
      setError("Parol faqat raqamlardan iborat bo'lishi va kamida 4 ta raqam bo'lishi kerak")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Parollar mos kelmaydi")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/md-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setNewPassword("")
        setConfirmPassword("")
        setHasPassword(true)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error("Error creating password:", error)
      setError("Parol yaratishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    setError("")
    setSuccess("")

    if (!currentPassword) {
      setError("Joriy parolni kiriting")
      return
    }

    if (!validatePassword(newPassword)) {
      setError("Yangi parol faqat raqamlardan iborat bo'lishi va kamida 4 ta raqam bo'lishi kerak")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Yangi parollar mos kelmaydi")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/md-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error("Error updating password:", error)
      setError("Parolni yangilashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePassword = async () => {
    if (!confirm("MD parolni o'chirishni tasdiqlaysizmi? Bu juda xavfli amal!")) {
      return
    }

    if (!currentPassword) {
      setError("Joriy parolni kiriting")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/md-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          currentPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setCurrentPassword("")
        setHasPassword(false)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error("Error deleting password:", error)
      setError("Parolni o'chirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
            <p className="text-muted-foreground">Yuklanmoqda...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProtected && hasPassword) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md ios-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-destructive rounded-2xl flex items-center justify-center">
                <Lock className="h-8 w-8 text-destructive-foreground" />
              </div>
              <CardTitle className="text-2xl text-foreground">Himoyalangan bo'lim</CardTitle>
              <CardDescription>Sozlamalarga kirish uchun MD parolni kiriting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accessError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                  {accessError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="access-password">MD Parol</Label>
                <Input
                  id="access-password"
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="MD parolni kiriting"
                  pattern="[0-9]*"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      verifyAccess()
                    }
                  }}
                />
              </div>

              <Button onClick={verifyAccess} disabled={loading || !accessPassword} className="w-full ios-button">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Kirish
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sozlamalar</h1>
          <p className="text-muted-foreground">Admin panel sozlamalari</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* MD Password Management */}
        <Card className="ios-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  MD Parol Boshqaruvi
                </CardTitle>
                <CardDescription>Qarzdorlarni to'langan deb belgilash uchun maxsus parol</CardDescription>
              </div>
              <Badge variant={hasPassword ? "default" : "secondary"}>{hasPassword ? "Faol" : "O'rnatilmagan"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-200 text-sm">
                {success}
              </div>
            )}

            {!hasPassword ? (
              // Create Password
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Yangi MD parol yaratish</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    MD parol faqat raqamlardan iborat bo'lishi kerak va kamida 4 ta raqam bo'lishi kerak.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Yangi parol (faqat raqamlar)</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="1234"
                      pattern="[0-9]*"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Parolni tasdiqlang</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="1234"
                      pattern="[0-9]*"
                    />
                  </div>

                  <Button
                    onClick={handleCreatePassword}
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full ios-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Yaratilmoqda...
                      </>
                    ) : (
                      "MD Parol Yaratish"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Update/Delete Password
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">MD parol faol</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    MD parol o'rnatilgan va qarzdorlarni boshqarishda ishlatilmoqda.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Joriy parol</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Joriy parolni kiriting"
                      pattern="[0-9]*"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password-update">Yangi parol</Label>
                      <Input
                        id="new-password-update"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Yangi parol"
                        pattern="[0-9]*"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password-update">Parolni tasdiqlang</Label>
                      <Input
                        id="confirm-password-update"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Parolni tasdiqlang"
                        pattern="[0-9]*"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                      className="flex-1 ios-button"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {loading ? "Yangilanmoqda..." : "Parolni Yangilash"}
                    </Button>

                    <Button
                      onClick={handleDeletePassword}
                      disabled={loading || !currentPassword}
                      variant="destructive"
                      className="ios-button"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {loading ? "O'chirilmoqda..." : "O'chirish"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="ios-card border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 mb-3">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Xavfsizlik eslatmasi</span>
            </div>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <li>• MD parol faqat qarzdorlarni to'langan deb belgilashda ishlatiladi</li>
              <li>• Parolni boshqalar bilan baham ko'rmang</li>
              <li>• Parolni xavfsiz joyda saqlang</li>
              <li>• Parolni muntazam ravishda yangilang</li>
              <li>• Bu sahifaga kirish uchun MD parol talab qilinadi</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
