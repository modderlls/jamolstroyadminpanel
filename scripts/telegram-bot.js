const TelegramBot = require("node-telegram-bot-api")
const { createClient } = require("@supabase/supabase-js")

// Bot tokenini o'rnatish
const token = "8093195655:AAHENZs_P5NW7Hou6130e3A4EU8PJDBcNXo"
const bot = new TelegramBot(token, { polling: true })

// Supabase clientini yaratish
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY"
const supabase = createClient(supabaseUrl, supabaseKey)

// App URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"

// Foydalanuvchi sessiyalarini saqlash
const userSessions = new Map()

// Bot start komandasi
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const startPayload = match[1].trim()

  console.log(`Start komandasi: ${userId}, payload: ${startPayload}`)

  if (startPayload.startsWith("_website_login_")) {
    // Website login flow
    const parts = startPayload.split("_")
    if (parts.length >= 5) {
      const loginToken = parts[3]
      const timestamp = parts[4]
      const clientId = parts[5] || "jamolstroy_web"

      console.log(`Website login request: token=${loginToken}, timestamp=${timestamp}, clientId=${clientId}`)
      await handleWebsiteLogin(chatId, userId, msg.from, loginToken, timestamp, clientId)
    } else {
      console.log("Invalid website login payload format")
      await bot.sendMessage(chatId, "Noto'g'ri login so'rovi. Iltimos, qaytadan urinib ko'ring.")
    }
  } else {
    await handleStart(chatId, userId, msg.from)
  }
})

// Start komandasi
async function handleStart(chatId, userId, user) {
  try {
    // Foydalanuvchi mavjudligini tekshirish
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (existingUser) {
      await bot.sendMessage(
        chatId,
        `Salom ${existingUser.first_name}! 👋\n\n` +
          `JamolStroy ilovasiga xush kelibsiz!\n\n` +
          `Ilovani ochish uchun quyidagi tugmani bosing:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "🏗️ Ilovani ochish", web_app: { url: appUrl } }]],
          },
        },
      )
    } else {
      await bot.sendMessage(
        chatId,
        `Assalomu alaykum! JamolStroy botiga xush kelibsiz! 🏗️\n\n` +
          `Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:`,
        {
          reply_markup: {
            keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      )
    }
  } catch (error) {
    console.error("Start komandasi xatoligi:", error)
    await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.")
  }
}

// Website login handler
async function handleWebsiteLogin(chatId, userId, user, loginToken, timestamp, clientId) {
  try {
    console.log(`Processing website login: userId=${userId}, token=${loginToken}`)

    // Foydalanuvchi mavjudligini tekshirish
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (userError && userError.code !== "PGRST116") {
      console.error("User lookup error:", userError)
      throw userError
    }

    if (!existingUser) {
      console.log("User not found, asking for registration")
      await bot.sendMessage(chatId, `Siz hali ro'yxatdan o'tmagansiz. Iltimos, avval ro'yxatdan o'ting:`, {
        reply_markup: {
          keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      })
      return
    }

    // Login session mavjudligini tekshirish
    const { data: existingSession, error: sessionCheckError } = await supabase
      .from("website_login_sessions")
      .select("*")
      .eq("login_token", loginToken)
      .single()

    if (sessionCheckError && sessionCheckError.code !== "PGRST116") {
      console.error("Session check error:", sessionCheckError)
      throw sessionCheckError
    }

    if (!existingSession) {
      console.log("Login session not found")
      await bot.sendMessage(chatId, "Login sessiyasi topilmadi. Iltimos, qaytadan urinib ko'ring.")
      return
    }

    // Session muddatini tekshirish
    if (new Date(existingSession.expires_at) < new Date()) {
      console.log("Login session expired")
      await bot.sendMessage(chatId, "Login sessiyasi muddati tugagan. Iltimos, qaytadan urinib ko'ring.")
      return
    }

    // Session ni yangilash - telegram_id va user_id qo'shish
    const { error: updateError } = await supabase
      .from("website_login_sessions")
      .update({
        telegram_id: userId.toString(),
        user_id: existingUser.id,
      })
      .eq("login_token", loginToken)

    if (updateError) {
      console.error("Session update error:", updateError)
      throw updateError
    }

    // OAuth-style permission request
    await bot.sendMessage(
      chatId,
      `🔐 **JamolStroy Web** ilovasiga kirish ruxsati\n\n` +
        `📱 **Ilova nomi:** JamolStroy\n` +
        `🌐 **Domen:** ${appUrl}\n` +
        `👤 **Foydalanuvchi:** ${existingUser.first_name} ${existingUser.last_name}\n\n` +
        `**Ruxsat beriladigan ma'lumotlar:**\n` +
        `• Ism va familiya\n` +
        `• Telegram username\n` +
        `• Profil ma'lumotlari\n\n` +
        `⚠️ **Diqqat:** Faqat ishonchli manbalardan kelgan so'rovlarga ruxsat bering.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Ruxsat berish", callback_data: `approve_website_${loginToken}` },
              { text: "❌ Rad etish", callback_data: `reject_website_${loginToken}` },
            ],
          ],
        },
      },
    )

    console.log("Website login permission request sent successfully")
  } catch (error) {
    console.error("Website login error:", error)
    await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.")
  }
}

// Callback query handler
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const userId = callbackQuery.from.id
  const data = callbackQuery.data

  console.log(`Callback query received: ${data} from user ${userId}`)

  if (data.startsWith("approve_website_")) {
    const loginToken = data.replace("approve_website_", "")
    await handleWebsiteLoginApproval(chatId, userId, loginToken, true, callbackQuery)
  } else if (data.startsWith("reject_website_")) {
    const loginToken = data.replace("reject_website_", "")
    await handleWebsiteLoginApproval(chatId, userId, loginToken, false, callbackQuery)
  }

  // Callback query ni javoblash
  await bot.answerCallbackQuery(callbackQuery.id)
})

// Website login approval handler
async function handleWebsiteLoginApproval(chatId, userId, loginToken, approved, callbackQuery) {
  try {
    console.log(`Website login approval: token=${loginToken}, approved=${approved}, userId=${userId}`)

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (!existingUser) {
      await bot.editMessageText("❌ Foydalanuvchi topilmadi.", {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      })
      return
    }

    // Session statusini yangilash
    const { error } = await supabase
      .from("website_login_sessions")
      .update({
        status: approved ? "approved" : "rejected",
        approved_at: approved ? new Date().toISOString() : null,
      })
      .eq("login_token", loginToken)
      .eq("telegram_id", userId.toString())

    if (error) {
      console.error("Session update error:", error)
      await bot.editMessageText("❌ Xatolik yuz berdi.", {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      })
      return
    }

    if (approved) {
      console.log("Website login approved successfully")
      await bot.editMessageText(
        `✅ **Muvaffaqiyatli tasdiqlandi!**\n\n` +
          `🎉 Siz JamolStroy websaytiga muvaffaqiyatli kirdingiz.\n\n` +
          `🌐 Websaytga qaytib, xaridlaringizni davom ettiring!`,
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🏗️ Websaytga o'tish", url: `${appUrl}?login_token=${loginToken}` }]],
          },
        },
      )
    } else {
      console.log("Website login rejected")
      await bot.editMessageText(
        `❌ **Login rad etildi**\n\n` +
          `🔒 Xavfsizlik uchun login so'rovi bekor qilindi.\n\n` +
          `Agar bu siz bo'lsangiz, qaytadan urinib ko'ring.`,
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          parse_mode: "Markdown",
        },
      )
    }
  } catch (error) {
    console.error("Website login approval error:", error)
    await bot.editMessageText("❌ Xatolik yuz berdi.", {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
    })
  }
}

// Telefon raqam qabul qilish
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const contact = msg.contact

  if (contact.user_id !== userId) {
    await bot.sendMessage(chatId, "Iltimos, o'z telefon raqamingizni yuboring.")
    return
  }

  try {
    // Foydalanuvchi mavjudligini tekshirish
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId.toString())
      .single()

    if (existingUser) {
      await bot.sendMessage(chatId, "Siz allaqachon ro'yxatdan o'tgansiz! ✅")
      return
    }

    // Sessiyaga telefon raqamni saqlash
    userSessions.set(userId, {
      phoneNumber: contact.phone_number,
      step: "waiting_first_name",
    })

    await bot.sendMessage(chatId, "Telefon raqamingiz qabul qilindi! ✅\n\n" + "Endi ismingizni kiriting:", {
      reply_markup: { remove_keyboard: true },
    })
  } catch (error) {
    console.error("Contact qabul qilishda xatolik:", error)
    await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.")
  }
})

// Matn xabarlarini qabul qilish
bot.on("message", async (msg) => {
  if (msg.contact || msg.text?.startsWith("/")) return

  const chatId = msg.chat.id
  const userId = msg.from.id
  const text = msg.text

  const session = userSessions.get(userId)
  if (!session) return

  try {
    if (session.step === "waiting_first_name") {
      session.firstName = text
      session.step = "waiting_last_name"
      userSessions.set(userId, session)

      await bot.sendMessage(chatId, "Familiyangizni kiriting:")
    } else if (session.step === "waiting_last_name") {
      session.lastName = text

      // Foydalanuvchini ma'lumotlar bazasiga qo'shish
      const { data, error } = await supabase
        .from("users")
        .insert({
          telegram_id: userId.toString(),
          phone_number: session.phoneNumber,
          first_name: session.firstName,
          last_name: session.lastName,
          is_verified: true,
        })
        .select()
        .single()

      if (error) throw error

      await bot.sendMessage(
        chatId,
        `Tabriklaymiz! Ro'yxatdan o'tish muvaffaqiyatli yakunlandi! 🎉\n\n` +
          `👤 ${session.firstName} ${session.lastName}\n` +
          `📱 ${session.phoneNumber}\n\n` +
          `Endi JamolStroy ilovasidan foydalanishingiz mumkin!`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "🏗️ Ilovani ochish", web_app: { url: appUrl } }]],
          },
        },
      )

      // Sessionni tozalash
      userSessions.delete(userId)
    }
  } catch (error) {
    console.error("Matn xabarini qayta ishlashda xatolik:", error)
    await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.")
    userSessions.delete(userId)
  }
})

// Xatoliklarni qayta ishlash
bot.on("polling_error", (error) => {
  console.error("Polling xatoligi:", error)
})

console.log("JamolStroy Telegram bot ishga tushdi! 🚀")
console.log("Bot username: @jamolstroy_bot")
