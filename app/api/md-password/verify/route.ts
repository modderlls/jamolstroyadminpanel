import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: "Parol talab qilinadi", valid: false }, { status: 400 })
    }

    // Get stored password hash
    const { data, error } = await supabase.from("md_passwords").select("password_hash").limit(1).single()

    if (error || !data) {
      return NextResponse.json({ error: "MD parol o'rnatilmagan", valid: false }, { status: 404 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, data.password_hash)

    if (isValid) {
      return NextResponse.json({
        valid: true,
        message: "Parol to'g'ri",
      })
    } else {
      return NextResponse.json({
        valid: false,
        error: "Noto'g'ri parol",
      })
    }
  } catch (error) {
    console.error("Error verifying MD password:", error)
    return NextResponse.json({ error: "Server xatoligi", valid: false }, { status: 500 })
  }
}
