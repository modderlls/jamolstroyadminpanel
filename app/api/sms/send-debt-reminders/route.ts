import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { smsService } from "@/lib/sms-service"

export async function POST(request: NextRequest) {
  try {
    // Get all current debtors
    const { data: debtors, error } = await supabase
      .from("orders")
      .select("*")
      .eq("is_borrowed", true)
      .eq("is_payed", false)

    if (error) {
      console.error("[v0] Error fetching debtors:", error)
      return NextResponse.json({ error: "Failed to fetch debtors" }, { status: 500 })
    }

    const results = []

    for (const debtor of debtors || []) {
      // Calculate days remaining
      const borrowedDate = new Date(debtor.borrowed_updated_at)
      const totalPeriod = debtor.borrowed_period + (debtor.borrowed_additional_period || 0)
      const dueDate = new Date(borrowedDate.getTime() + totalPeriod * 24 * 60 * 60 * 1000)
      const today = new Date()
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

      // Send reminder SMS
      const message = smsService.getDebtReminderMessage(
        debtor.customer_name,
        debtor.order_number,
        debtor.total_amount,
        daysRemaining,
      )

      const success = await smsService.sendSMS({
        to: debtor.customer_phone,
        message,
      })

      results.push({
        orderId: debtor.id,
        orderNumber: debtor.order_number,
        customerName: debtor.customer_name,
        phone: debtor.customer_phone,
        daysRemaining,
        success,
      })

      // Small delay between SMS to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    console.log("[v0] Debt reminder SMS results:", results)

    return NextResponse.json({
      message: "Debt reminders sent",
      totalDebtors: debtors?.length || 0,
      results,
    })
  } catch (error) {
    console.error("[v0] Error sending debt reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
