import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

    authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!)
    authUrl.searchParams.set("redirect_uri", `${process.env.NEXTAUTH_URL}/api/google-auth`)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file")
    authUrl.searchParams.set("access_type", "offline")
    authUrl.searchParams.set("prompt", "consent")

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error("Error generating auth URL:", error)
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 })
  }
}
