import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Get the current session from client-side
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 })
    }

    // Check if user has Google provider
    const googleProvider = session.user.app_metadata.providers?.includes("google")

    if (!googleProvider) {
      return NextResponse.json({ error: "User not authenticated with Google" }, { status: 400 })
    }

    // Get Google access token from session
    const googleAccessToken = session.provider_token

    if (!googleAccessToken) {
      return NextResponse.json({ error: "No Google access token available" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      accessToken: googleAccessToken,
      user: session.user,
    })
  } catch (error) {
    console.error("Error getting Google auth:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
