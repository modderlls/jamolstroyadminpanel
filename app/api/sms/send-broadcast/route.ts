import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { smsService } from "@/lib/sms-service"
import { withPermission } from "@/lib/api-middleware"

export const POST = withPermission("sms", "send", async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Validate message length
    if (message.length > 160) {
      return NextResponse.json({ error: "Message too long (max 160 characters)" }, { status: 400 })
    }

    const { data: customers, error } = await supabase
      .from("orders")
      .select("customer_phone, customer_name")
      .not("customer_phone", "is", null)

    if (error) {
      console.error("Error fetching customers:", error)
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

    // Log admin action
    await supabase.rpc("log_admin_action", {
      p_action_type: "sms_broadcast",
      p_module: "sms",
      p_entity_id: null,
      p_metadata: {
        message: message.substring(0, 50) + "...",
        totalCustomers: uniqueCustomers.length,
        admin_id: user.id,
      },
    })

    return NextResponse.json({
      message: "Broadcast SMS sent",
      totalCustomers: uniqueCustomers.length,
      success: result.success,
      failed: result.failed,
    })
  } catch (error) {
    console.error("Error sending broadcast SMS:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
