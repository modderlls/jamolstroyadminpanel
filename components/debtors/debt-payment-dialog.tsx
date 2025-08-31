"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Debtor {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
}

interface DebtPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debtor: Debtor | null
  onSuccess: () => void
}

export function DebtPaymentDialog({ open, onOpenChange, debtor, onSuccess }: DebtPaymentDialogProps) {
  const [mdPassword, setMdPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!debtor) return null

  const handleConfirm = async () => {
    if (!mdPassword.trim()) {
      setError("MD parol talab qilinadi")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Verify MD password
      const verifyResponse = await fetch("/api/md-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: mdPassword }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.valid) {
        setError(verifyData.error || "Noto'g'ri MD parol")
        setLoading(false)
        return
      }

      // Mark debt as paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          is_payed: true,
          is_borrowed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", debtor.id)

      if (updateError) throw updateError

      try {
        await fetch("/api/sms/send-payment-confirmation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName: debtor.customer_name,
            customerPhone: debtor.customer_phone,
            orderNumber: debtor.order_number,
            amount: debtor.total_amount,
          }),
        })
        console.log("[v0] Payment confirmation SMS sent to customer:", debtor.customer_phone)
      } catch (smsError) {
        console.error("[v0] Failed to send payment confirmation SMS:", smsError)
        // Don't fail the payment process if SMS fails
      }

      onSuccess()
      onOpenChange(false)
      setMdPassword("")
      setError("")
    } catch (error) {
      console.error("Error confirming debt payment:", error)
      setError("Qarzni to'lashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Qarz to'landi</DialogTitle>
          <DialogDescription>Qarzdorni to'langan deb belgilash uchun MD parolni kiriting</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">#{debtor.order_number}</h3>
                <p className="text-sm text-muted-foreground">{debtor.customer_name}</p>
                <p className="text-lg font-bold">{debtor.total_amount.toLocaleString()} so'm</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Xavfsizlik tekshiruvi</span>
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Qarzni to'langan deb belgilash uchun MD parolni kiriting
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="md-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                MD Parol
              </Label>
              <Input
                id="md-password"
                type="password"
                value={mdPassword}
                onChange={(e) => {
                  setMdPassword(e.target.value)
                  setError("")
                }}
                placeholder="MD parolni kiriting"
                className={error ? "border-red-500" : ""}
                pattern="[0-9]*"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setMdPassword("")
                setError("")
              }}
              disabled={loading}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !mdPassword.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
