interface SMSConfig {
  gatewayUrl: string
  username?: string
  password?: string
}

interface SMSMessage {
  to: string
  message: string
}

interface SMSGatewayMessage {
  id: string
  to: string
  content: string
}

interface SMSGatewayResponse {
  messages: SMSGatewayMessage[]
}

class SMSService {
  private config: SMSConfig = {
    gatewayUrl: process.env.SMS_GATEWAY_URL || "http://192.168.100.142:8080/smsgateway",
    username: process.env.SMS_GATEWAY_USERNAME,
    password: process.env.SMS_GATEWAY_PASSWORD,
  }

  private pendingMessages: Map<string, SMSGatewayMessage> = new Map()

  async sendSMS(message: SMSMessage): Promise<boolean> {
    try {
      const gatewayMessage: SMSGatewayMessage = {
        id: this.generateUUID(),
        to: message.to,
        content: message.message,
      }

      this.pendingMessages.set(gatewayMessage.id, gatewayMessage)

      const response = await this.sendViaGateway([gatewayMessage])
      if (response) {
        console.log("[v0] SMS sent via SMS Gateway:", message.to)
        return true
      }

      console.error("[v0] Failed to send SMS via SMS Gateway")
      return false
    } catch (error) {
      console.error("[v0] SMS service error:", error)
      return false
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<{ success: number; failed: number }> {
    try {
      const gatewayMessages: SMSGatewayMessage[] = messages.map((msg) => ({
        id: this.generateUUID(),
        to: msg.to,
        content: msg.message,
      }))

      gatewayMessages.forEach((msg) => {
        this.pendingMessages.set(msg.id, msg)
      })

      const success = await this.sendViaGateway(gatewayMessages)

      return {
        success: success ? messages.length : 0,
        failed: success ? 0 : messages.length,
      }
    } catch (error) {
      console.error("[v0] Bulk SMS service error:", error)
      return { success: 0, failed: messages.length }
    }
  }

  private async sendViaGateway(messages: SMSGatewayMessage[]): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Charset": "utf-8",
        "Cache-Control": "no-cache",
      }

      if (this.config.username && this.config.password) {
        const credentials = btoa(`${this.config.username}:${this.config.password}`)
        headers.Authorization = `Basic ${credentials}`
      }

      const response = await fetch(this.config.gatewayUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [],
          updates: [],
        }),
      })

      if (!response.ok) {
        console.error("[v0] SMS Gateway error:", response.status, response.statusText)
        return false
      }

      const sendResponse = await fetch(this.config.gatewayUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: messages,
          updates: [],
        }),
      })

      return sendResponse.ok
    } catch (error) {
      console.error("[v0] SMS Gateway service error:", error)
      return false
    }
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c == "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  getDebtReminderMessage(customerName: string, orderNumber: string, amount: number, daysRemaining: number): string {
    if (daysRemaining > 0) {
      return `Hurmatli ${customerName}, #${orderNumber} buyurtma bo'yicha ${amount.toLocaleString()} so'm qarzingiz ${daysRemaining} kun ichida tugaydi. JamolStroy`
    } else {
      const daysOverdue = Math.abs(daysRemaining)
      return `Hurmatli ${customerName}, #${orderNumber} buyurtma bo'yicha ${amount.toLocaleString()} so'm qarzingiz ${daysOverdue} kun kechikdi. Iltimos, tezda to'lang. JamolStroy`
    }
  }

  getNewOrderMessage(
    orderNumber: string,
    customerName: string,
    customerPhone: string,
    address: string,
    orderDetails: string,
  ): string {
    return `Sizda yangi buyurtma mavjud: #${orderNumber}
Mijoz: ${customerName}
Telefon: ${customerPhone}
Manzil: ${address}
Buyurtma: ${orderDetails}
Websaytga otib tekshiring. JamolStroy`
  }

  getPaymentConfirmationMessage(customerName: string, orderNumber: string, amount: number): string {
    return `Hurmatli ${customerName}, #${orderNumber} buyurtma bo'yicha ${amount.toLocaleString()} so'm to'lovingiz qabul qilindi. Rahmat! JamolStroy`
  }

  getBroadcastMessage(customMessage: string): string {
    return `${customMessage} - JamolStroy`
  }
}

export const smsService = new SMSService()
