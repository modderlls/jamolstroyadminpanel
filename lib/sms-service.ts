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

interface SMSMobileAPIResponse {
  success: boolean
  message?: string
  guid?: string
}

class SMSService {
  private readonly apiKey = "83df553b58f4a2655fd1a6ad58677bfe6d028b7eae62641c"
  private readonly baseUrl = "https://api.smsmobileapi.com"

  private pendingMessages: Map<string, SMSMessage> = new Map()

  async sendSMS(message: SMSMessage): Promise<boolean> {
    try {
      const url = new URL(`${this.baseUrl}/sendsms`)
      url.searchParams.append("apikey", this.apiKey)
      url.searchParams.append("recipients", message.to)
      url.searchParams.append("message", message.message)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        console.error("[v0] SMSMobileAPI error:", response.status, response.statusText)
        return false
      }

      const result = await response.json()
      console.log("[v0] SMS sent via SMSMobileAPI:", message.to, result)
      return true
    } catch (error) {
      console.error("[v0] SMS service error:", error)
      return false
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    // Send messages one by one (SMSMobileAPI doesn't support bulk sending in single request)
    for (const message of messages) {
      try {
        const sent = await this.sendSMS(message)
        if (sent) {
          success++
        } else {
          failed++
        }
        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error("[v0] Bulk SMS error for", message.to, error)
        failed++
      }
    }

    return { success, failed }
  }

  async getSMSLog(): Promise<any[]> {
    try {
      const url = new URL(`${this.baseUrl}/log/sent/sms`)
      url.searchParams.append("apikey", this.apiKey)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        console.error("[v0] SMSMobileAPI log error:", response.status, response.statusText)
        return []
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] SMS log service error:", error)
      return []
    }
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
