import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({
    "medic-gateway": true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] SMS Gateway webhook received:", body)

    const { messages = [], updates = [] } = body

    // Log incoming SMS messages
    if (messages.length > 0) {
      console.log("[v0] Incoming SMS messages:", messages)
    }

    // Log delivery status updates
    if (updates.length > 0) {
      console.log("[v0] SMS delivery updates:", updates)
    }

    return NextResponse.json({
      messages: [],
    })
  } catch (error) {
    console.error("[v0] SMS Gateway webhook error:", error)
    return NextResponse.json({ error: true, message: "Internal server error" }, { status: 500 })
  }
}
