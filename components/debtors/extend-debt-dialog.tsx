"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Debtor {
  id: string
  order_number: string
  customer_name: string
  borrowed_additional_period: number
}

interface ExtendDebtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debtor: Debtor | null
  onSuccess: () => void
}

export function ExtendDebtDialog({ open, onOpenChange, debtor, onSuccess }: ExtendDebtDialogProps) {
  const [additionalDays, setAdditionalDays] = useState(1)
  const [loading, setLoading] = useState(false)

  if (!debtor) return null

  const handleConfirm = async () => {
    if (additionalDays < 1) return

    setLoading(true)
    try {
      const newAdditionalPeriod = (debtor.borrowed_additional_period || 0) + additionalDays

      const { error } = await supabase
        .from("orders")
        .update({
          borrowed_additional_period: newAdditionalPeriod,
          borrowed_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", debtor.id)

      if (error) throw error

      onSuccess()
      onOpenChange(false)
      setAdditionalDays(1)
    } catch (error) {
      console.error("Error extending debt:", error)
      alert("Qarz muddatini uzaytirishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Qarz muddatini uzaytirish</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">#{debtor.order_number}</h3>
                <p className="text-sm text-muted-foreground">{debtor.customer_name}</p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Joriy qo'shimcha muddat: {debtor.borrowed_additional_period || 0} kun</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="additional-days" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Qo'shimcha kunlar
              </Label>
              <Input
                id="additional-days"
                type="number"
                min="1"
                max="365"
                value={additionalDays}
                onChange={(e) => setAdditionalDays(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Yangi jami qo'shimcha muddat: {(debtor.borrowed_additional_period || 0) + additionalDays} kun
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || additionalDays < 1}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Saqlanmoqda..." : "Uzaytirish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
