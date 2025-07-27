import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { Readable } from "stream"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

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

    // Convert File to Buffer then to Readable stream
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileStream = Readable.from(fileBuffer)

    // Get folder ID from environment or use root
    const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "root"

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: file.type,
        body: fileStream,
      },
    })

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileName: file.name,
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}
