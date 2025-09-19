import { type NextRequest, NextResponse } from "next/server"
import { smsService } from "@/lib/sms-service"
import { withPermission } from "@/lib/api-middleware"

export const POST = withPermission("orders", "create", async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { orderNumber, customerName, customerPhone, address, orderDetails } = body

    if (!orderNumber || !customerName || !customerPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const message = smsService.getNewOrderMessage(
      orderNumber,
      customerName,
      customerPhone,
      address || "Manzil ko'rsatilmagan",
      orderDetails || "Buyurtma tafsilotlari",
    )

    const success = await smsService.sendSMS({
      to: "+998973834847", // Admin phone number
      message,
    })

    console.log("[v0] New order notification sent:", { orderNumber, success })

    return NextResponse.json({
      message: "New order notification sent",
      success,
    })
  } catch (error) {
    console.error("[v0] Error sending new order notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
