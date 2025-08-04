import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      },
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role").eq("id", session.user.id).single()

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: "Parol kiritilmagan" }, { status: 400 })
    }

    // Get stored password
    const { data: storedData, error: fetchError } = await supabase
      .from("md_passwords")
      .select("password_hash")
      .limit(1)
      .single()

    if (fetchError || !storedData) {
      return NextResponse.json({ error: "MD parol topilmadi" }, { status: 404 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, storedData.password_hash)

    if (!isValid) {
      return NextResponse.json({ error: "Parol noto'g'ri" }, { status: 400 })
    }

    return NextResponse.json({
      message: "Parol to'g'ri",
      valid: true,
    })
  } catch (error) {
    console.error("Error verifying MD password:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
