// pages/api/telegram-webhook.ts (yoki sizning Next.js API route faylingiz)
import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase" // Sizning supabase client import yo'lingiz

const BOT_TOKEN = "8093195655:AAGtYtQ3BzN0WcJ51rOttPCnVL7kJTpO0jA"
const BOT_USERNAME = "jamolstroybot"
// Supabase Edge Function URL'ini o'zingizning Supabase project ref va function nomi bilan almashtiring
// Bu URL Supabase dashboardingizdagi Edge Function bo'limida topiladi.
const SUPABASE_FUNCTION_URL = `https://your-project-ref.supabase.co/functions/v1/create-auth-user-from-telegram`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Telegram webhook received:", JSON.stringify(body, null, 2))

    // Message handling
    if (body.message) {
      const message = body.message
      const chatId = message.chat.id
      const userId = message.from.id
      const text = message.text

      // Save telegram user info
      try {
        const telegramUserData = {
          telegram_id: userId.toString(),
          first_name: message.from.first_name || "",
          last_name: message.from.last_name || "",
          username: message.from.username || "",
          is_bot: message.from.is_bot || false,
        }

        await supabase.from("telegram_users").upsert(telegramUserData, {
          onConflict: "telegram_id",
        })
      } catch (dbError) {
        console.error("Database error:", dbError)
      }

      // Handle /start command with parameters
      if (text && text.startsWith("/start")) {
        const startParam = text.replace("/start", "").trim()

        if (startParam && startParam.includes("_")) {
          // Parse login parameters: {temp_token}_{client_id}
          const parts = startParam.split("_")
          if (parts.length >= 2) {
            const tempToken = parts[0]
            const clientId = parts.slice(1).join("_") // In case client_id has underscores

            console.log("Login request:", { tempToken, clientId, userId })
            await handleWebsiteLogin(chatId, userId, message.from, tempToken, clientId)
            return NextResponse.json({ ok: true })
          }
        }

        // Regular start command
        await handleRegularStart(chatId, userId, message.from)
      } else if (text === "/help") {
        const helpMessage = `📋 Yordam:

/start - Botni qayta ishga tushirish
/help - Yordam ma'lumotlari
/contact - Aloqa ma'lumotlari

🛒 Xarid qilish uchun web ilovani ishlating.`

        await sendTelegramMessage(chatId, helpMessage)
      } else if (text === "/catalog11") {
        const catalogMessage = `📦 Mahsulotlar katalogi:

• Qurilish materiallari
• Elektr jihozlari
• Santexnika
• Bo'yoq va laklar
• Asboblar

🛒 To'liq katalogni ko'rish uchun web ilovani oching:`

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🛒 Katalogni ochish",
                web_app: {
                  url: `${process.env.NEXT_PUBLIC_APP_URL}/catalog` || "https://jamolstroy.vercel.app/catalog",
                },
              },
            ],
          ],
        }

        await sendTelegramMessage(chatId, catalogMessage, keyboard)
      } else if (text === "/contact") {
        const contactMessage = `📞 Aloqa ma'lumotlari:

📱 Telefon: +998 90 123 45 67
🌐 Website: jamolstroy.uz
📍 Manzil: Qashqadaryo v., G'uzor t.

🕒 Ish vaqti:
Dushanba - Shanba: 9:00 - 18:00
Yakshanba: Dam olish kuni`

        await sendTelegramMessage(chatId, contactMessage)
      } else {
        // Default response
        const defaultMessage = `Salom! 👋

Men JamolStroy botiman. Quyidagi buyruqlardan foydalaning:

/start - Botni ishga tushirish
/contact - Aloqa ma'lumotlari
/help - Yordam

Yoki web ilovani ochish uchun quyidagi tugmani bosing:`

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🛒 Ilovani ochish",
                web_app: {
                  url: process.env.NEXT_PUBLIC_APP_URL || "https://celebrated-stroopwafel-c34497.netlify.app",
                },
              },
            ],
          ],
        }

        await sendTelegramMessage(chatId, defaultMessage, keyboard)
      }
    }

    // Handle contact sharing
    if (body.message && body.message.contact) {
      const contact = body.message.contact
      const chatId = body.message.chat.id
      const userId = body.message.from.id

      await handleContactShared(chatId, userId, body.message.from, contact)
    }

    // Callback query handling
    if (body.callback_query) {
      const callbackQuery = body.callback_query
      const chatId = callbackQuery.message.chat.id
      const userId = callbackQuery.from.id
      const data = callbackQuery.data

      if (data === "contact") {
        const contactMessage = `📞 Aloqa ma'lumotlari:

📱 Telefon: +998 90 123 45 67
🌐 Website: jamolstroy.uz
📍 Manzil: Qashqadaryo v., G'uzor t.

🕒 Ish vaqti:
Dushanba - Shanba: 9:00 - 18:00
Yakshanba: Dam olish kuni`

        await sendTelegramMessage(chatId, contactMessage)
      } else if (data === "info") {
        const infoMessage = `ℹ️ JamolStroy haqida:

🏗️ Biz qurilish materiallari va jihozlari bo'yicha yetakchi kompaniyamiz.

✅ Bizning afzalliklarimiz:
• Yuqori sifatli mahsulotlar
• Raqobatbardosh narxlar
• Tez yetkazib berish
• Professional maslahat
• Kafolat xizmati

📱 Web ilovamizda 1000+ mahsulot mavjud!`

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🛒 Ilovani ochish",
                web_app: {
                  url: process.env.NEXT_PUBLIC_APP_URL || "https://celebrated-stroopwafel-c34497.netlify.app",
                },
              },
            ],
          ],
        }

        await sendTelegramMessage(chatId, infoMessage, keyboard)
      } else if (data.startsWith("approve_")) {
        // Approve login
        const tempToken = data.replace("approve_", "")
        await handleLoginApproval(chatId, userId, callbackQuery.from, tempToken, true, callbackQuery.message.message_id)
      } else if (data.startsWith("reject_")) {
        // Reject login
        const tempToken = data.replace("reject_", "")
        await handleLoginApproval(
          chatId,
          userId,
          callbackQuery.from,
          tempToken,
          false,
          callbackQuery.message.message_id,
        )
      }

      // Answer callback query
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleRegularStart(chatId: number, userId: number, user: any) {
  try {
    // Check if user exists in our system (public.users table)
    const { data: existingUser, error: userError } = await supabase
      .from("users") // public.users jadvali
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (userError && userError.code !== "PGRST116") {
      throw userError
    }

    if (existingUser) {
      // User exists, show welcome message
      const welcomeMessage = `🏗️ Qaytib kelganingiz bilan, ${existingUser.first_name}!

Bizning katalogimizda qurilish materiallari va jihozlarining keng assortimenti mavjud.

📱 Web ilovani ochish uchun quyidagi tugmani bosing:`

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "🛒 Ilovani ochish",
              web_app: {
                url: process.env.NEXT_PUBLIC_APP_URL || "https://celebrated-stroopwafel-c34497.netlify.app",
              },
            },
          ],
          [
            {
              text: "📞 Aloqa",
              callback_data: "contact",
            },
            {
              text: "ℹ️ Ma'lumot",
              callback_data: "info",
            },
          ],
        ],
      }

      await sendTelegramMessage(chatId, welcomeMessage, keyboard)
    } else {
      // New user, request phone number
      const welcomeMessage = `🏗️ JamolStroy ilovasiga xush kelibsiz!

Sizni ro'yxatdan o'tkazish uchun telefon raqamingizni ulashing:`

      const keyboard = {
        keyboard: [
          [
            {
              text: "📱 Telefon raqamni ulashish",
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      }

      await sendTelegramMessage(chatId, welcomeMessage, keyboard)
    }
  } catch (error) {
    console.error("Regular start error:", error)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
}

async function handleContactShared(chatId: number, userId: number, user: any, contact: any) {
  try {
    // Create new user in auth.users and public.users via Supabase Edge Function
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telegram_id: userId.toString(),
        first_name: contact.first_name || user.first_name || "",
        last_name: contact.last_name || user.last_name || "",
        username: user.username || "",
        phone_number: contact.phone_number || "",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Supabase Function error:", errorData)
      await sendTelegramMessage(chatId, "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
      return
    }

    const result = await response.json()
    console.log("Supabase Function result:", result)

    const successMessage = `✅ Ro'yxatdan o'tish muvaffaqiyatli!

Salom, ${contact.first_name || user.first_name}! Endi siz JamolStroy ilovasidan foydalanishingiz mumkin.

📱 Web ilovani ochish uchun quyidagi tugmani bosing:`

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🛒 Ilovani ochish",
            web_app: {
              url: process.env.NEXT_PUBLIC_APP_URL || "https://celebrated-stroopwafel-c34497.netlify.app",
            },
          },
        ],
        [
          {
            text: "📞 Aloqa",
            callback_data: "contact",
          },
          {
            text: "ℹ️ Ma'lumot",
            callback_data: "info",
          },
        ],
      ],
      remove_keyboard: true,
    }

    await sendTelegramMessage(chatId, successMessage, keyboard)
  } catch (error) {
    console.error("Contact sharing error:", error)
    await sendTelegramMessage(chatId, "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
}

async function handleWebsiteLogin(chatId: number, userId: number, user: any, tempToken: string, clientId: string) {
  try {
    console.log("Processing website login:", { tempToken, clientId, userId })

    // Find login session by temp_token and client_id
    const { data: session, error: sessionError } = await supabase
      .from("website_login_sessions")
      .select("*")
      .eq("temp_token", tempToken)
      .eq("client_id", clientId)
      .eq("status", "pending")
      .single()

    if (sessionError || !session) {
      console.log("Login session not found:", sessionError)
      await sendTelegramMessage(chatId, "❌ Login sessiyasi topilmadi yoki muddati tugagan.")
      return
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      console.log("Login session expired")
      await sendTelegramMessage(chatId, "❌ Login sessiyasi muddati tugagan. Qaytadan urinib ko'ring.")
      return
    }

    // Check if user exists in public.users
    const { data: existingUser, error: userError } = await supabase
      .from("users") // public.users jadvali
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (userError && userError.code !== "PGRST116") {
      console.error("User lookup error:", userError)
      throw userError
    }

    let userData = existingUser

    // If user doesn't exist in public.users, create new user using the Supabase Function
    if (!existingUser) {
      console.log("Creating new user for Telegram ID via Supabase Function:", userId)
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: userId.toString(),
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          username: user.username || "",
          // phone_number bu yerda mavjud emas, chunki u handleContactSharedda olinadi.
          // Agar bu yerda ham phone_number kerak bo'lsa, Telegram API orqali olishni ko'rib chiqing.
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Supabase Function error during login:", errorData)
        await sendTelegramMessage(chatId, "❌ Login uchun foydalanuvchi yaratishda xatolik yuz berdi.")
        return
      }

      const newUserResult = await response.json()
      console.log("New user created by function:", newUserResult)

      // Funktsiya qaytargan user_id (auth.users id) bo'yicha public.usersdagi ma'lumotni olish
      const { data: createdPublicUser, error: createdPublicUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", newUserResult.user_id) // Funktsiya qaytargan user_id
        .single()

      if (createdPublicUserError || !createdPublicUser) {
        console.error("Error fetching newly created public user:", createdPublicUserError)
        await sendTelegramMessage(chatId, "❌ Yaratilgan foydalanuvchi ma'lumotlarini olishda xatolik.")
        return
      }
      userData = createdPublicUser
    }

    // Show permission request with user info
    const permissionMessage = `🔐 **Website Login So'rovi**

**JamolStroy** websaytiga kirishga ruxsat berasizmi?

👤 **Sizning ma'lumotlaringiz:**
• Ism: ${userData.first_name} ${userData.last_name}
• Username: ${userData.username ? "@" + userData.username : "Yo'q"}
• Telegram ID: ${userId}

🌐 **Client ID:** ${clientId}
🔑 **Session:** ${tempToken.substring(0, 8)}...

⚠️ **Diqqat:** Faqat o'zingiz so'ragan bo'lsangina ruxsat bering!`

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Ruxsat berish",
            callback_data: `approve_${tempToken}`,
          },
          {
            text: "❌ Rad etish",
            callback_data: `reject_${tempToken}`,
          },
        ],
      ],
    }

    await sendTelegramMessage(chatId, permissionMessage, keyboard)
  } catch (error) {
    console.error("Website login error:", error)
    await sendTelegramMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
}

async function handleLoginApproval(
  chatId: number,
  userId: number,
  user: any,
  tempToken: string,
  approved: boolean,
  messageId: number,
) {
  try {
    console.log("Login approval:", { tempToken, approved, userId })

    // Get user data from public.users table using telegram_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (userError) {
      console.error("User lookup error:", userError)
      await editTelegramMessage(chatId, messageId, "❌ Foydalanuvchi topilmadi.")
      return
    }

    if (approved) {
      // Delete any existing active sessions for this user to avoid duplicate key error
      // `userData.id` public.usersdagi id, u auth.users idsi bilan bir xil bo'lishi kerak.
      await supabase.from("website_login_sessions").delete().eq("user_id", userData.id).eq("status", "approved")

      // Update login session with approval
      const { error: updateError } = await supabase
        .from("website_login_sessions")
        .update({
          status: "approved",
          user_id: userData.id, // public.usersdagi id (u auth.users idsi bilan bir xil)
          telegram_id: userId.toString(),
          approved_at: new Date().toISOString(),
        })
        .eq("temp_token", tempToken)

      if (updateError) {
        console.error("Session update error:", updateError)
        await editTelegramMessage(chatId, messageId, "❌ Xatolik yuz berdi.")
        return
      }

      await editTelegramMessage(
        chatId,
        messageId,
        `✅ **Login Tasdiqlandi!**

🎉 Siz JamolStroy websaytiga muvaffaqiyatli kirdingiz.

🌐 Websaytga qaytib, xaridlaringizni davom ettiring!

👤 **Kirgan foydalanuvchi:** ${userData.first_name} ${userData.last_name}`,
      )
    } else {
      // Update login session with rejection
      const { error: updateError } = await supabase
        .from("website_login_sessions")
        .update({
          status: "rejected",
          approved_at: new Date().toISOString(),
        })
        .eq("temp_token", tempToken)

      if (updateError) {
        console.error("Session update error:", updateError)
        await editTelegramMessage(chatId, messageId, "❌ Xatolik yuz berdi.")
        return
      }

      await editTelegramMessage(
        chatId,
        messageId,
        `❌ **Login Rad Etildi**

🔒 Xavfsizlik uchun login so'rovi bekor qilindi.

Agar bu siz bo'lsangiz, qaytadan urinib ko'ring.`,
      )
    }
  } catch (error) {
    console.error("Login approval error:", error)
    await editTelegramMessage(chatId, messageId, "❌ Xatolik yuz berdi.")
  }
}

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Telegram API error:", errorData)
    }

    return response.json()
  } catch (error) {
    console.error("Send message error:", error)
    throw error
  }
}

async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Telegram edit message error:", errorData)
    }

    return response.json()
  } catch (error) {
    console.error("Edit message error:", error)
    throw error
  }
}
