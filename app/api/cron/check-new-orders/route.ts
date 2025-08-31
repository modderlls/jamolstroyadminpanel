import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { smsService } from "@/lib/sms-service"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Checking for new orders")

    // Get orders from the last 2 minutes to ensure we don't miss any
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const { data: newOrders, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers(first_name, last_name, phone_number),
        order_items(
          *,
          products(name_uz, specifications)
        )
      `)
      .gte("created_at", twoMinutesAgo)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching new orders:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    if (!newOrders || newOrders.length === 0) {
      return NextResponse.json({ message: "No new orders found", count: 0 })
    }

    const unnotifiedOrders = newOrders.filter((order) => !order.sms_notification_sent)

    if (unnotifiedOrders.length === 0) {
      return NextResponse.json({ message: "No new orders to notify", count: 0 })
    }

    let successCount = 0
    let failedCount = 0

    // Send SMS notification for each new order
    for (const order of unnotifiedOrders) {
      try {
        const orderDetails = order.order_items
          ? order.order_items.map((item: any) => `${item.products?.name_uz || "Mahsulot"} x${item.quantity}`).join(", ")
          : "Buyurtma tafsilotlari"

        const message = smsService.getNewOrderMessage(
          order.order_number,
          order.customer_name || "Noma'lum mijoz",
          order.customer_phone || "Telefon ko'rsatilmagan",
          order.delivery_address || "Manzil ko'rsatilmagan",
          orderDetails,
        )

        const sent = await smsService.sendSMS({
          to: "+998973834847", // Admin phone number
          message: message,
        })

        if (sent) {
          // Mark as notification sent
          await supabase.from("orders").update({ sms_notification_sent: true }).eq("id", order.id)

          successCount++
          console.log("[v0] New order notification sent for order:", order.order_number)
        } else {
          failedCount++
          console.log("[v0] Failed to send notification for order:", order.order_number)
        }

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error("[v0] Error processing order:", order.id, error)
        failedCount++
      }
    }

    console.log(`[v0] New order check completed: ${successCount} sent, ${failedCount} failed`)

    return NextResponse.json({
      message: "New order check completed",
      total: unnotifiedOrders.length,
      success: successCount,
      failed: failedCount,
    })
  } catch (error) {
    console.error("[v0] New order cron job error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
