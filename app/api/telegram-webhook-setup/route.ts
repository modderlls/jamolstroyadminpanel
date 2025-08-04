import { NextResponse } from "next/server"

const BOT_TOKEN = "7712295404:AAGiPH07L2kwjWmSSPIIZ5E7nbuZuXn81k4"

export async function POST() {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram-webhook`

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: "Webhook muvaffaqiyatli o'rnatildi",
        webhook_url: webhookUrl,
        data: data,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Webhook o'rnatishda xatolik",
        error: data,
      })
    }
  } catch (error) {
    console.error("Webhook setup error:", error)
    return NextResponse.json({
      success: false,
      message: "Server xatoligi",
      error: error,
    })
  }
}
