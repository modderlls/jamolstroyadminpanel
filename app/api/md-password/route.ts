import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const { data, error } = await supabase.from("md_passwords").select("id").limit(1).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json({
      hasPassword: !!data,
    })
  } catch (error) {
    console.error("Error checking MD password:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, currentPassword, newPassword } = body

    if (action === "create") {
      // Check if password already exists
      const { data: existing } = await supabase.from("md_passwords").select("id").limit(1).single()

      if (existing) {
        return NextResponse.json({ error: "MD parol allaqachon mavjud" }, { status: 400 })
      }

      // Validate new password
      if (!newPassword || !/^\d{4,}$/.test(newPassword)) {
        return NextResponse.json(
          { error: "Parol faqat raqamlardan iborat bo'lishi va kamida 4 ta raqam bo'lishi kerak" },
          { status: 400 },
        )
      }

      // Hash and save password
      const hashedPassword = await bcrypt.hash(newPassword, 12)

      const { error } = await supabase.from("md_passwords").insert([{ password_hash: hashedPassword }])

      if (error) throw error

      return NextResponse.json({
        message: "MD parol muvaffaqiyatli yaratildi",
      })
    }

    if (action === "update") {
      // Get current password
      const { data: currentData, error: fetchError } = await supabase
        .from("md_passwords")
        .select("password_hash")
        .limit(1)
        .single()

      if (fetchError || !currentData) {
        return NextResponse.json({ error: "MD parol topilmadi" }, { status: 404 })
      }

      // Verify current password
      const isCurrentValid = await bcrypt.compare(currentPassword, currentData.password_hash)
      if (!isCurrentValid) {
        return NextResponse.json({ error: "Joriy parol noto'g'ri" }, { status: 400 })
      }

      // Validate new password
      if (!newPassword || !/^\d{4,}$/.test(newPassword)) {
        return NextResponse.json(
          { error: "Yangi parol faqat raqamlardan iborat bo'lishi va kamida 4 ta raqam bo'lishi kerak" },
          { status: 400 },
        )
      }

      // Hash and update password
      const hashedPassword = await bcrypt.hash(newPassword, 12)

      const { error } = await supabase
        .from("md_passwords")
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("password_hash", currentData.password_hash)

      if (error) throw error

      return NextResponse.json({
        message: "MD parol muvaffaqiyatli yangilandi",
      })
    }

    if (action === "delete") {
      // Get current password
      const { data: currentData, error: fetchError } = await supabase
        .from("md_passwords")
        .select("password_hash")
        .limit(1)
        .single()

      if (fetchError || !currentData) {
        return NextResponse.json({ error: "MD parol topilmadi" }, { status: 404 })
      }

      // Verify current password
      const isCurrentValid = await bcrypt.compare(currentPassword, currentData.password_hash)
      if (!isCurrentValid) {
        return NextResponse.json({ error: "Joriy parol noto'g'ri" }, { status: 400 })
      }

      // Delete password
      const { error } = await supabase.from("md_passwords").delete().eq("password_hash", currentData.password_hash)

      if (error) throw error

      return NextResponse.json({
        message: "MD parol muvaffaqiyatli o'chirildi",
      })
    }

    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 })
  } catch (error) {
    console.error("Error managing MD password:", error)
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
  }
}
