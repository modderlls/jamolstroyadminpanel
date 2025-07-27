import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET(request: NextRequest) {
  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_TYPE,
      GOOGLE_PROJECT_ID,
      GOOGLE_PRIVATE_KEY_ID,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CLIENT_EMAIL,
      GOOGLE_CLIENT_ID,
      GOOGLE_AUTH_URI,
      GOOGLE_TOKEN_URI,
      GOOGLE_AUTH_PROVIDER_CERT_URL,
      GOOGLE_CLIENT_CERT_URL,
      GOOGLE_UNIVERSE_DOMAIN,
    } = process.env

    if (
      !GOOGLE_PRIVATE_KEY ||
      !GOOGLE_CLIENT_EMAIL ||
      !GOOGLE_PROJECT_ID
    ) {
      throw new Error("Google credentials are missing from environment variables")
    }

    const credentials = {
      type: GOOGLE_SERVICE_ACCOUNT_TYPE,
      project_id: GOOGLE_PROJECT_ID,
      private_key_id: GOOGLE_PRIVATE_KEY_ID,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: GOOGLE_CLIENT_EMAIL,
      client_id: GOOGLE_CLIENT_ID,
      auth_uri: GOOGLE_AUTH_URI,
      token_uri: GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: GOOGLE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: GOOGLE_CLIENT_CERT_URL,
      universe_domain: GOOGLE_UNIVERSE_DOMAIN,
    }

    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ["https://www.googleapis.com/auth/drive"]
    )

    const drive = google.drive({ version: "v3", auth })

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
    return NextResponse.json(
      { success: false, error: "Failed to fetch files" },
      { status: 500 }
    )
  }
}
