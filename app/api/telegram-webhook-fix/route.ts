import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TELEGRAM_BOT_TOKEN = "8093195655:AAHENZs_P5NW7Hou6130e3A4EU8PJDBcNXo"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    console.log("🔧 Starting webhook fix process...")

    // 1. Webhook ni butunlay o'chirish
    console.log("🗑️ Deleting existing webhook...")
    const deleteResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drop_pending_updates: true,
      }),
    })
    const deleteResult = await deleteResponse.json()
    console.log("Delete result:", deleteResult)

    // 2. Biroz kutish
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 3. To'g'ri URL yaratish
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    const WEBHOOK_URL = `${cleanBaseUrl}/api/telegram-webhook`

    console.log("🔗 Setting up new webhook URL:", WEBHOOK_URL)

    // 4. Yangi webhook o'rnatish
    const setResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
        max_connections: 40,
        secret_token: "jamolstroy_webhook_secret_2024",
      }),
    })

    const setResult = await setResponse.json()
    console.log("Set webhook result:", setResult)

    // 5. Webhook info olish
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const infoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const webhookInfo = await infoResponse.json()

    // 6. Bot ma'lumotlarini olish
    const botResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const botInfo = await botResponse.json()

    // 7. Test message yuborish
    let testResult = null
    try {
      const testResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=1`)
      testResult = await testResponse.json()
    } catch (error) {
      console.log("Test updates error:", error)
    }

    // 8. Bazaga saqlash
    if (setResult.ok) {
      await supabase.from("telegram_webhooks").upsert({
        webhook_url: WEBHOOK_URL,
        is_active: true,
        webhook_info: setResult,
        last_update: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: setResult.ok,
      message: setResult.ok ? "✅ Webhook muvaffaqiyatli tuzatildi!" : "❌ Webhook tuzatishda xatolik",
      steps: {
        "1_delete": deleteResult,
        "2_set": setResult,
        "3_info": webhookInfo.result,
        "4_bot": botInfo.result,
        "5_test": testResult?.result || null,
      },
      urls: {
        base_url: baseUrl,
        clean_base_url: cleanBaseUrl,
        final_webhook_url: WEBHOOK_URL,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Webhook fix error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Server xatoligi",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    // Manual test message yuborish
    const testChatId = 123456789 // Test uchun

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: testChatId,
        text: "🧪 Test message from webhook fix endpoint",
        parse_mode: "HTML",
      }),
    })

    const result = await response.json()

    return NextResponse.json({
      test_message_sent: result.ok,
      result: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
