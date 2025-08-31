"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquare, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function BroadcastSMSDialog() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.error("Xabar matnini kiriting")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/sms/send-broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`SMS yuborildi: ${data.success} muvaffaqiyatli, ${data.failed} xatolik`)
        setMessage("")
        setOpen(false)
      } else {
        toast.error(data.error || "SMS yuborishda xatolik")
      }
    } catch (error) {
      console.error("[v0] Broadcast SMS error:", error)
      toast.error("SMS yuborishda xatolik")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <MessageSquare className="h-4 w-4" />
          SMS Yuborish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Barcha mijozlarga SMS yuborish
          </DialogTitle>
          <DialogDescription>Bu xabar barcha mijozlarga yuboriladi. Diqqat bilan yozing.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message">Xabar matni</Label>
            <Textarea
              id="message"
              placeholder="Yangilik yoki e'lon matnini kiriting..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
            />
            <div className="text-sm text-muted-foreground text-right">{message.length}/160</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Bekor qilish
          </Button>
          <Button onClick={handleSendBroadcast} disabled={isLoading || !message.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                SMS Yuborish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
