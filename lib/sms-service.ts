interface SMSConfig {
  cloudToken: string
  localToken: string
  localEndpoint: string
}

interface SMSMessage {
  to: string
  message: string
}

class SMSService {
  private config: SMSConfig = {
    cloudToken:
      "fjAPXnH1SJi8uV5b9EeOzN:APA91bFzGUt4nklFuSg3nqGzCISoO2qGzwj-gZEKvQ823XZiGvq0dxl9k5P0KwsJ7rboeNjus0TD6x9wvEmv3GR6L_hTvUXeO7qa7hPZSUux-gh-SaYHxCM",
    localToken: "b31b7342-e5a2-47b9-8533-26ce9e25a1dc",
    localEndpoint: "http://192.168.100.142:8082",
  }

  async sendSMS(message: SMSMessage): Promise<boolean> {
    try {
      // Try local service first
      const localResponse = await this.sendViaLocal(message)
      if (localResponse) {
        console.log("[v0] SMS sent via local service:", message.to)
        return true
      }

      // Fallback to cloud service
      const cloudResponse = await this.sendViaCloud(message)
      if (cloudResponse) {
        console.log("[v0] SMS sent via cloud service:", message.to)
        return true
      }

      console.error("[v0] Failed to send SMS via both services")
      return false
    } catch (error) {
      console.error("[v0] SMS service error:", error)
      return false
    }
  }

  private async sendViaLocal(message: SMSMessage): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.localEndpoint}/api/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.localToken}`,
        },
        body: JSON.stringify({
          to: message.to,
          text: message.message,
        }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Local SMS service error:", error)
      return false
    }
  }

  private async sendViaCloud(message: SMSMessage): Promise<boolean> {
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${this.config.cloudToken}`,
        },
        body: JSON.stringify({
          to: "/topics/sms",
          data: {
            phone: message.to,
            message: message.message,
          },
        }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Cloud SMS service error:", error)
      return false
    }
  }

  // SMS Templates
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
}

export const smsService = new SMSService()
