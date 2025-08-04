import { NextResponse } from "next/server"

const BOT_TOKEN = "7712295404:AAGiPH07L2kwjWmSSPIIZ5E7nbuZuXn81k4"

export async function POST() {
  try {
    const results = []

    // 1. Delete existing webhook
    console.log("1. Mavjud webhook o'chirilmoqda...")
    const deleteResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: "POST",
    })
    const deleteData = await deleteResponse.json()
    results.push({ step: "delete_webhook", success: deleteData.ok, data: deleteData })

    // 2. Wait 2 seconds
    console.log("2. 2 soniya kutilmoqda...")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 3. Set new webhook
    console.log("3. Yangi webhook o'rnatilmoqda...")
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram-webhook`
    const setResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    })
    const setData = await setResponse.json()
    results.push({ step: "set_webhook", success: setData.ok, data: setData })

    // 4. Wait 2 seconds
    console.log("4. 2 soniya kutilmoqda...")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 5. Get webhook info
    console.log("5. Webhook ma'lumotlari olinmoqda...")
    const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
    const infoData = await infoResponse.json()
    results.push({ step: "get_webhook_info", success: infoData.ok, data: infoData })

    // 6. Get bot info
    console.log("6. Bot ma'lumotlari olinmoqda...")
    const botResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    const botData = await botResponse.json()
    results.push({ step: "get_bot_info", success: botData.ok, data: botData })

    // 7. Test webhook
    console.log("7. Webhook test qilinmoqda...")
    const testResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: "Test",
            username: "test_user",
          },
          chat: {
            id: 123456789,
            first_name: "Test",
            username: "test_user",
            type: "private",
          },
          date: Math.floor(Date.now() / 1000),
          text: "/start",
        },
      }),
    })
    const testData = await testResponse.json()
    results.push({ step: "test_webhook", success: testResponse.ok, data: testData })

    const allSuccess = results.every((result) => result.success)

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? "Barcha amallar muvaffaqiyatli bajarildi!" : "Ba'zi amallar muvaffaqiyatsiz tugadi",
      results: results,
      webhook_url: webhookUrl,
      bot_username: "jamolstroy_bot",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Complete fix error:", error)
    return NextResponse.json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error,
    })
  }
}
