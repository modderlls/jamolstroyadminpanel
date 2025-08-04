import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Email/Password login endpoint
export async function POST(request: NextRequest) {
  try {
    const { email, password, client_id } = await request.json()

    // If email and password provided, authenticate with Supabase
    if (email && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Supabase auth error:", error)
        return NextResponse.json({ error: "Noto'g'ri email yoki parol" }, { status: 401 })
      }

      if (!data.user) {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 401 })
      }

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (userError || !userData || userData.role !== "admin") {
        return NextResponse.json({ error: "Admin huquqi talab qilinadi" }, { status: 403 })
      }

      // Return success with user data and session
      return NextResponse.json({
        success: true,
        message: "Email/parol orqali muvaffaqiyatli kirildi",
        authenticated: true,
        user: userData,
        session: data.session,
        access_token: data.session?.access_token,
      })
    }

    // If client_id provided, create Telegram session (only after email/password auth)
    if (client_id) {
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
    }

    return NextResponse.json({ error: "Email/parol yoki client_id talab qilinadi" }, { status: 400 })
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
