"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, Lock, CreditCard, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Debtor {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  is_overdue: boolean
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
  const [paymentAmount, setPaymentAmount] = useState(debtor?.total_amount || 0)
  const [paymentNote, setPaymentNote] = useState("")

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

      // Mark debt as paid and set was_qarzdor to true
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          is_payed: true,
          is_borrowed: false,
          was_qarzdor: true, // Mark as previous debtor
          updated_at: new Date().toISOString(),
        })
        .eq("id", debtor.id)

      if (updateError) throw updateError

      // Create payment record if needed
      try {
        await supabase.from("payments").insert([
          {
            order_id: debtor.id,
            amount: paymentAmount,
            payment_date: new Date().toISOString(),
            note: paymentNote || "Qarz to'lovi",
            payment_type: "debt_payment",
            created_at: new Date().toISOString(),
          },
        ])
      } catch (paymentError) {
        // Payment table might not exist, continue anyway
        console.warn("Payment record not created:", paymentError)
      }

      onSuccess()
      onOpenChange(false)
      setMdPassword("")
      setError("")
      setPaymentNote("")
      alert("Qarz muvaffaqiyatli to'landi!")
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
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Qarz to'landi
          </DialogTitle>
          <DialogDescription>Qarzdorni to'langan deb belgilash uchun MD parolni kiriting</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">#{debtor.order_number}</h3>
                  <p className="text-sm text-muted-foreground">{debtor.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{debtor.customer_phone}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Qarz miqdori:</span>
                  <Badge variant="destructive" className="font-bold">
                    {debtor.total_amount.toLocaleString()} so'm
                  </Badge>
                </div>

                {debtor.is_overdue && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Holat:</span>
                    <Badge variant="destructive">Muddati o'tgan</Badge>
                  </div>
                )}
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
                Qarzni to'langan deb belgilash uchun MD parolni kiriting. Bu amal qaytarilmaydi.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">To'lov miqdori (so'm)</Label>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number.parseFloat(e.target.value) || 0)}
                min="0"
                max={debtor.total_amount}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-note">Izoh (ixtiyoriy)</Label>
              <Textarea
                id="payment-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="To'lov haqida qo'shimcha ma'lumot..."
                rows={2}
              />
            </div>

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
                setPaymentNote("")
              }}
              disabled={loading}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !mdPassword.trim() || paymentAmount <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Tasdiqlash
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
