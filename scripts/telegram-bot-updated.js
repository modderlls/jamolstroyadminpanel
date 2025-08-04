const TelegramBot = require("node-telegram-bot-api")
const { createClient } = require("@supabase/supabase-js")

// Bot configuration
const BOT_TOKEN = "7712295404:AAGiPH07L2kwjWmSSPIIZ5E7nbuZuXn81k4"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jamolstroy.vercel.app"

// Initialize bot and Supabase
const bot = new TelegramBot(BOT_TOKEN, { polling: true })
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log("🤖 JamolStroy Telegram Bot ishga tushdi!")

// Start command handler
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const startParam = match[1].trim()

  console.log(`Start command from user ${userId}, param: "${startParam}"`)

  try {
    // Save telegram user info
    await saveTelegramUser(msg.from)

    // Handle website login parameters
    if (startParam && startParam.includes("_")) {
      const parts = startParam.split("_")
      if (parts.length >= 2) {
        const tempToken = parts[0]
        const clientId = parts.slice(1).join("_")

        console.log("Website login request:", { tempToken, clientId, userId })
        await handleWebsiteLogin(chatId, userId, msg.from, tempToken, clientId)
        return
      }
    }

    // Regular start command
    await handleRegularStart(chatId, userId, msg.from)
  } catch (error) {
    console.error("Start command error:", error)
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
})

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id

  const helpMessage = `📋 Yordam:

/start - Botni qayta ishga tushirish
/help - Yordam ma'lumotlari
/catalog - Mahsulotlar katalogi
/contact - Aloqa ma'lumotlari

🛒 Xarid qilish uchun web ilovani ishlating.`

  await bot.sendMessage(chatId, helpMessage)
})

// Catalog command
bot.onText(/\/catalog/, async (msg) => {
  const chatId = msg.chat.id

  const catalogMessage = `📦 Mahsulotlar katalogi:

• Qurilish materiallari
• Elektr jihozlari  
• Santexnika
• Bo'yoq va laklar
• Asboblar
• Ijara mahsulotlari

🛒 To'liq katalogni ko'rish uchun web ilovani oching:`

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🛒 Katalogni ochish",
          web_app: { url: `${APP_URL}/catalog` },
        },
      ],
    ],
  }

  await bot.sendMessage(chatId, catalogMessage, { reply_markup: keyboard })
})

// Contact command
bot.onText(/\/contact/, async (msg) => {
  const chatId = msg.chat.id

  const contactMessage = `📞 Aloqa ma'lumotlari:

📱 Telefon: +998 90 123 45 67
📧 Email: info@jamolstroy.uz
🌐 Website: jamolstroy.uz
📍 Manzil: Toshkent sh., Chilonzor t.

🕒 Ish vaqti:
Dushanba - Shanba: 9:00 - 18:00
Yakshanba: Dam olish kuni`

  await bot.sendMessage(chatId, contactMessage)
})

// Contact sharing handler
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const contact = msg.contact

  console.log("Contact shared:", contact)

  try {
    // Create new user with contact info
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          telegram_id: userId.toString(),
          first_name: contact.first_name || msg.from.first_name || "",
          last_name: contact.last_name || msg.from.last_name || "",
          username: msg.from.username || "",
          phone_number: contact.phone_number || "",
          is_verified: true,
          role: "customer",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("User creation error:", error)
      throw error
    }

    const successMessage = `✅ Ro'yxatdan o'tish muvaffaqiyatli!

Salom, ${newUser.first_name}! Endi siz JamolStroy ilovasidan foydalanishingiz mumkin.

📱 Web ilovani ochish uchun quyidagi tugmani bosing:`

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🛒 Ilovani ochish",
            web_app: { url: APP_URL },
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

    await bot.sendMessage(chatId, successMessage, { reply_markup: keyboard })
  } catch (error) {
    console.error("Contact sharing error:", error)
    await bot.sendMessage(chatId, "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
})

// Callback query handler
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data
  const messageId = callbackQuery.message.message_id

  console.log("Callback query:", data)

  try {
    await bot.answerCallbackQuery(callbackQuery.id)

    if (data === "contact") {
      const contactMessage = `📞 Aloqa ma'lumotlari:

📱 Telefon: +998 90 123 45 67
📧 Email: info@jamolstroy.uz
🌐 Website: jamolstroy.uz
📍 Manzil: Toshkent sh., Chilonzor t.

🕒 Ish vaqti:
Dushanba - Shanba: 9:00 - 18:00
Yakshanba: Dam olish kuni`

      await bot.sendMessage(chatId, contactMessage)
    } else if (data === "info") {
      const infoMessage = `ℹ️ JamolStroy haqida:

🏗️ Biz qurilish materiallari va jihozlari bo'yicha yetakchi kompaniyamiz.

✅ Bizning afzalliklarimiz:
• Yuqori sifatli mahsulotlar
• Raqobatbardosh narxlar
• Tez yetkazib berish
• Professional maslahat
• Kafolat xizmati
• Ijara xizmatlari

📱 Web ilovamizda 1000+ mahsulot mavjud!`

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "🛒 Ilovani ochish",
              web_app: { url: APP_URL },
            },
          ],
        ],
      }

      await bot.sendMessage(chatId, infoMessage, { reply_markup: keyboard })
    } else if (data.startsWith("approve_")) {
      // Approve login
      const tempToken = data.replace("approve_", "")
      await handleLoginApproval(chatId, userId, callbackQuery.from, tempToken, true, messageId)
    } else if (data.startsWith("reject_")) {
      // Reject login
      const tempToken = data.replace("reject_", "")
      await handleLoginApproval(chatId, userId, callbackQuery.from, tempToken, false, messageId)
    }
  } catch (error) {
    console.error("Callback query error:", error)
  }
})

// Default message handler
bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  // Skip if it's a command or contact
  if (!text || text.startsWith("/") || msg.contact) {
    return
  }

  const defaultMessage = `Salom! 👋

Men JamolStroy botiman. Quyidagi buyruqlardan foydalaning:

/start - Botni ishga tushirish
/catalog - Mahsulotlar katalogi
/contact - Aloqa ma'lumotlari
/help - Yordam

Yoki web ilovani ochish uchun quyidagi tugmani bosing:`

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🛒 Ilovani ochish",
          web_app: { url: APP_URL },
        },
      ],
    ],
  }

  await bot.sendMessage(chatId, defaultMessage, { reply_markup: keyboard })
})

// Helper functions
async function saveTelegramUser(user) {
  try {
    const telegramUserData = {
      telegram_id: user.id.toString(),
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      username: user.username || "",
      is_bot: user.is_bot || false,
    }

    await supabase.from("telegram_users").upsert(telegramUserData, {
      onConflict: "telegram_id",
    })
  } catch (error) {
    console.error("Error saving telegram user:", error)
  }
}

async function handleRegularStart(chatId, userId, user) {
  try {
    // Check if user exists in our system
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    if (existingUser) {
      // User exists, show welcome message
      const welcomeMessage = `🏗️ Qaytib kelganingiz bilan, ${existingUser.first_name}!

Bizning katalogimizda qurilish materiallari va jihozlarining keng assortimenti mavjud.

🆕 Yangilik: Endi ijara xizmati ham mavjud!

📱 Web ilovani ochish uchun quyidagi tugmani bosing:`

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "🛒 Ilovani ochish",
              web_app: { url: APP_URL },
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

      await bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard })
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

      await bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard })
    }
  } catch (error) {
    console.error("Regular start error:", error)
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
}

async function handleWebsiteLogin(chatId, userId, user, tempToken, clientId) {
  try {
    console.log("Processing website login:", { tempToken, clientId, userId })

    // Find login session
    const { data: session, error: sessionError } = await supabase
      .from("website_login_sessions")
      .select("*")
      .eq("temp_token", tempToken)
      .eq("client_id", clientId)
      .eq("status", "pending")
      .single()

    if (sessionError || !session) {
      console.log("Login session not found:", sessionError)
      await bot.sendMessage(chatId, "❌ Login sessiyasi topilmadi yoki muddati tugagan.")
      return
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      console.log("Login session expired")
      await bot.sendMessage(chatId, "❌ Login sessiyasi muddati tugagan. Qaytadan urinib ko'ring.")
      return
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (userError && userError.code !== "PGRST116") {
      throw userError
    }

    let userData = existingUser

    // Create user if doesn't exist
    if (!existingUser) {
      console.log("Creating new user for Telegram ID:", userId)
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            telegram_id: userId.toString(),
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            username: user.username || "",
            is_verified: true,
            role: "customer",
          },
        ])
        .select()
        .single()

      if (createError) {
        console.error("User creation error:", createError)
        throw createError
      }
      userData = newUser
    }

    // Show permission request
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

    await bot.sendMessage(chatId, permissionMessage, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    })
  } catch (error) {
    console.error("Website login error:", error)
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.")
  }
}

async function handleLoginApproval(chatId, userId, user, tempToken, approved, messageId) {
  try {
    console.log("Login approval:", { tempToken, approved, userId })

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (userError) {
      console.error("User lookup error:", userError)
      await bot.editMessageText("❌ Foydalanuvchi topilmadi.", {
        chat_id: chatId,
        message_id: messageId,
      })
      return
    }

    if (approved) {
      // Delete existing sessions to avoid conflicts
      await supabase.from("website_login_sessions").delete().eq("user_id", userData.id).eq("status", "approved")

      // Update session with approval
      const { error: updateError } = await supabase
        .from("website_login_sessions")
        .update({
          status: "approved",
          user_id: userData.id,
          telegram_id: userId.toString(),
          approved_at: new Date().toISOString(),
        })
        .eq("temp_token", tempToken)

      if (updateError) {
        console.error("Session update error:", updateError)
        await bot.editMessageText("❌ Xatolik yuz berdi.", {
          chat_id: chatId,
          message_id: messageId,
        })
        return
      }

      await bot.editMessageText(
        `✅ **Login Tasdiqlandi!**

🎉 Siz JamolStroy websaytiga muvaffaqiyatli kirdingiz.

🌐 Websaytga qaytib, xaridlaringizni davom ettiring!

👤 **Kirgan foydalanuvchi:** ${userData.first_name} ${userData.last_name}`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        },
      )
    } else {
      // Update session with rejection
      const { error: updateError } = await supabase
        .from("website_login_sessions")
        .update({
          status: "rejected",
          approved_at: new Date().toISOString(),
        })
        .eq("temp_token", tempToken)

      if (updateError) {
        console.error("Session update error:", updateError)
        await bot.editMessageText("❌ Xatolik yuz berdi.", {
          chat_id: chatId,
          message_id: messageId,
        })
        return
      }

      await bot.editMessageText(
        `❌ **Login Rad Etildi**

🔒 Xavfsizlik uchun login so'rovi bekor qilindi.

Agar bu siz bo'lsangiz, qaytadan urinib ko'ring.`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        },
      )
    }
  } catch (error) {
    console.error("Login approval error:", error)
    await bot.editMessageText("❌ Xatolik yuz berdi.", {
      chat_id: chatId,
      message_id: messageId,
    })
  }
}

// Error handling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error)
})

bot.on("error", (error) => {
  console.error("Bot error:", error)
})

console.log("✅ Bot ishga tushdi va xabarlarni kutmoqda...")
