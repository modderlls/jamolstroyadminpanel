import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/sms/send-debt-reminders`,
      {
        method: "POST",
      },
    )

    const result = await response.json()

    console.log("[v0] Daily debt reminders cron job executed:", result)

    return NextResponse.json({
      message: "Daily debt reminders sent via SMS Gateway",
      result,
    })
  } catch (error) {
    console.error("[v0] Error in daily debt reminders cron:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow POST as well for manual triggering
  return GET(request)
}
