import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return NextResponse.json(
        {
          error: "No active session",
          needsAuth: true,
        },
        { status: 401 },
      )
    }

    // Check if user authenticated with Google
    const isGoogleUser = session.user.app_metadata.providers?.includes("google")

    if (!isGoogleUser) {
      return NextResponse.json(
        {
          error: "User not authenticated with Google",
          needsAuth: true,
        },
        { status: 400 },
      )
    }

    // Get Google access token
    const googleToken = session.provider_token

    if (!googleToken) {
      return NextResponse.json(
        {
          error: "No Google access token available",
          needsAuth: true,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      accessToken: googleToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata.full_name,
        avatar: session.user.user_metadata.avatar_url,
      },
    })
  } catch (error) {
    console.error("Error in Google auth:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
