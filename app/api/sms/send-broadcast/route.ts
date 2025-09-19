import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { smsService } from "@/lib/sms-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const { data: customers, error } = await supabase
      .from("orders")
      .select("customer_phone, customer_name")
      .not("customer_phone", "is", null)

    if (error) {
      console.error("[v0] Error fetching customers:", error)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    const uniqueCustomers =
      customers?.reduce(
        (acc, customer) => {
          if (!acc.find((c) => c.customer_phone === customer.customer_phone)) {
            acc.push(customer)
          }
          return acc
        },
        [] as typeof customers,
      ) || []

    const smsMessages = uniqueCustomers.map((customer) => ({
      to: customer.customer_phone,
      message: smsService.getBroadcastMessage(message),
    }))

    const result = await smsService.sendBulkSMS(smsMessages)

    console.log("[v0] Broadcast SMS results:", result)

    return NextResponse.json({
      message: "Broadcast SMS sent",
      totalCustomers: uniqueCustomers.length,
      success: result.success,
      failed: result.failed,
    })
  } catch (error) {
    console.error("[v0] Error sending broadcast SMS:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
