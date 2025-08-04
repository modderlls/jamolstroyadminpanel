"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Clock, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Order {
  id: string
  order_number: string
  customer_name: string
  total_amount: number
}

interface PaymentConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onSuccess: () => void
}

export function PaymentConfirmDialog({ open, onOpenChange, order, onSuccess }: PaymentConfirmDialogProps) {
  const [paymentType, setPaymentType] = useState<"paid" | "debt">("paid")
  const [debtPeriod, setDebtPeriod] = useState(1)
  const [loading, setLoading] = useState(false)

  if (!order) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      if (paymentType === "paid") {
        // Mark as paid and confirmed
        const { error } = await supabase
          .from("orders")
          .update({
            is_payed: true,
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)

        if (error) throw error
      } else {
        // Mark as debt
        const { error } = await supabase
          .from("orders")
          .update({
            is_borrowed: true,
            borrowed_period: debtPeriod,
            borrowed_updated_at: new Date().toISOString(),
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)

        if (error) throw error
      }

      onSuccess()
      onOpenChange(false)
      setPaymentType("paid")
      setDebtPeriod(1)
    } catch (error) {
      console.error("Error confirming payment:", error)
      alert("To'lovni tasdiqlashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mahsulot to'lovi</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">#{order.order_number}</h3>
                <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                <p className="text-lg font-bold">{order.total_amount.toLocaleString()} so'm</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Label>Mahsulot to'lovi to'langanmi?</Label>

            <RadioGroup value={paymentType} onValueChange={(value: "paid" | "debt") => setPaymentType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  To'langan
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debt" id="debt" />
                <Label htmlFor="debt" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Qarzdor
                </Label>
              </div>
            </RadioGroup>

            {paymentType === "debt" && (
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Qarz muddati</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debt-period">Muddat (kunlarda)</Label>
                    <Input
                      id="debt-period"
                      type="number"
                      min="1"
                      max="365"
                      value={debtPeriod}
                      onChange={(e) => setDebtPeriod(Number(e.target.value))}
                    />
                  </div>

                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Mijoz {debtPeriod} kun ichida to'lovni amalga oshirishi kerak
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={
                paymentType === "paid" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {loading ? "Saqlanmoqda..." : paymentType === "paid" ? "To'langan" : "Qarzdor"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
