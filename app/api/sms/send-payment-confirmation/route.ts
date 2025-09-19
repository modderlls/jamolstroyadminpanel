import { type NextRequest, NextResponse } from "next/server"
import { smsService } from "@/lib/sms-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, customerPhone, orderNumber, amount } = body

    if (!customerName || !customerPhone || !orderNumber || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const message = smsService.getPaymentConfirmationMessage(customerName, orderNumber, amount)

    const success = await smsService.sendSMS({
      to: customerPhone,
      message,
    })

    console.log("[v0] Payment confirmation SMS sent:", { orderNumber, customerPhone, success })

    return NextResponse.json({
      message: "Payment confirmation sent",
      success,
    })
  } catch (error) {
    console.error("[v0] Error sending payment confirmation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
