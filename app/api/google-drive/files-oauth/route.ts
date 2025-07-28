import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/google-auth`,
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const drive = google.drive({ version: "v3", auth: oauth2Client })

    const response = await drive.files.list({
      pageSize: 100,
      fields: "nextPageToken, files(id, name, size, mimeType, createdTime)",
      orderBy: "createdTime desc",
    })

    return NextResponse.json({
      success: true,
      files: response.data.files ?? [],
    })
  } catch (error: any) {
    console.error("Error fetching Google Drive files:", error.message || error)
    return NextResponse.json({ success: false, error: "Failed to fetch files" }, { status: 500 })
  }
}
