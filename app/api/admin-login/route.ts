import { type NextRequest, NextResponse } from "next/server"
import { supabase, createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { client_id } = await request.json()

    if (!client_id) {
      return NextResponse.json({ error: "Client ID talab qilinadi" }, { status: 400 })
    }

    const tempToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const { data: session, error } = await supabase
      .from("website_login_sessions")
      .insert([
        {
          temp_token: tempToken,
          client_id: client_id,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Session creation error:", error)
      return NextResponse.json({ error: "Sessiya yaratishda xatolik" }, { status: 500 })
    }

    const botUsername = "jamoladminbot"
    const startParam = `${tempToken}_${client_id}`
    const telegramUrl = `https://t.me/${botUsername}?start=${startParam}`

    return NextResponse.json({
      temp_token: tempToken,
      telegram_url: telegramUrl,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("Admin login API error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token talab qilinadi" }, { status: 400 })
    }

    const { data: session, error } = await supabase
      .from("website_login_sessions")
      .select(`
        *,
        user:users(*)
      `)
      .eq("temp_token", token)
      .single()

    if (error) {
      return NextResponse.json({ status: "not_found" }, { status: 404 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ status: "expired" }, { status: 410 })
    }

    if (session.status === "approved" && session.user) {
      if (session.user.role !== "admin") {
        return NextResponse.json({ status: "unauthorized", error: "Admin huquqi talab qilinadi" }, { status: 403 })
      }

      // Supabase sessiyasini yaratish
      const serverClient = createServerClient()

      // Foydalanuvchini Supabase auth ga qo'shish (agar mavjud bo'lmasa)
      const { data: authUser, error: signUpError } = await serverClient.auth.admin.createUser({
        email: `${session.user.telegram_id}@jamolstroy.local`,
        password: Math.random().toString(36),
        email_confirm: true,
        user_metadata: {
          telegram_id: session.user.telegram_id,
          telegram_username: session.user.telegram_username,
          full_name: session.user.full_name,
          role: session.user.role,
          user_id: session.user.id,
        },
      })

      if (signUpError && !signUpError.message.includes("already registered")) {
        console.error("Supabase user creation error:", signUpError)
        return NextResponse.json({ error: "Supabase sessiya yaratishda xatolik" }, { status: 500 })
      }

      // Session token yaratish
      let userId = authUser?.user?.id

      if (!userId) {
        // Agar user allaqachon mavjud bo'lsa, uni topish
        const { data: existingUsers } = await serverClient.auth.admin.listUsers()
        const existingUser = existingUsers.users.find((u) => u.user_metadata?.telegram_id === session.user.telegram_id)
        userId = existingUser?.id
      }

      if (userId) {
        // Access token yaratish
        const { data: tokenData, error: tokenError } = await serverClient.auth.admin.generateLink({
          type: "magiclink",
          email: `${session.user.telegram_id}@jamolstroy.local`,
        })

        if (!tokenError && tokenData.properties?.action_link) {
          const url = new URL(tokenData.properties.action_link)
          const accessToken = url.searchParams.get("access_token")
          const refreshToken = url.searchParams.get("refresh_token")

          return NextResponse.json({
            status: "approved",
            user: session.user,
            supabase_session: {
              access_token: accessToken,
              refresh_token: refreshToken,
              user: {
                id: userId,
                email: `${session.user.telegram_id}@jamolstroy.local`,
                user_metadata: {
                  telegram_id: session.user.telegram_id,
                  telegram_username: session.user.telegram_username,
                  full_name: session.user.full_name,
                  role: session.user.role,
                  user_id: session.user.id,
                },
              },
            },
          })
        }
      }

      return NextResponse.json({
        status: "approved",
        user: session.user,
      })
    } else if (session.status === "rejected") {
      return NextResponse.json({ status: "rejected" })
    } else {
      return NextResponse.json({ status: "pending" })
    }
  } catch (error) {
    console.error("Admin login status check error:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
