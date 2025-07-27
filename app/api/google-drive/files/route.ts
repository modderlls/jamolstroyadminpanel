import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET(request: NextRequest) {
  try {
    // Get Google Drive credentials from environment variables
    const credentials = {
      type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI,
      token_uri: process.env.GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
      universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
    }

    // Create JWT auth
    const auth = new google.auth.JWT(credentials.client_email, undefined, credentials.private_key, [
      "https://www.googleapis.com/auth/drive",
    ])

    const drive = google.drive({ version: "v3", auth })

    // List files
    const response = await drive.files.list({
      pageSize: 100,
      fields: "nextPageToken, files(id, name, size, mimeType, createdTime)",
      orderBy: "createdTime desc",
    })

    return NextResponse.json({
      success: true,
      files: response.data.files || [],
    })
  } catch (error) {
    console.error("Error fetching Google Drive files:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch files" }, { status: 500 })
  }
}
