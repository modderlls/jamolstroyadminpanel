import { NextResponse } from "next/server"

const BOT_TOKEN = "7712295404:AAGiPH07L2kwjWmSSPIIZ5E7nbuZuXn81k4"

export async function GET() {
  try {
    // Get bot info
    const botResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    const botData = await botResponse.json()

    // Get webhook info
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
    const webhookData = await webhookResponse.json()

    return NextResponse.json({
      bot: botData,
      webhook: webhookData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({
      error: "Status tekshirishda xatolik",
      details: error,
    })
  }
}
