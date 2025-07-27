import { NextResponse } from "next/server"
import { google } from "googleapis"

const FOLDER_ID = "1m4Vmycv5kLhY0ku1NCHZxh5Y89ZvCpS6"

export async function GET() {
  try {
    // Get credentials from environment variables
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

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    })

    const drive = google.drive({ version: "v3", auth })

    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: "files(id,name,size,mimeType,createdTime,modifiedTime,webViewLink)",
      orderBy: "modifiedTime desc",
    })

    const files = response.data.files || []

    // Calculate total size
    const totalSize = files.reduce((sum, file) => {
      return sum + Number.parseInt(file.size || "0")
    }, 0)

    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        size: Number.parseInt(file.size || "0"),
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
      })),
      totalSize,
      totalFiles: files.length,
    })
  } catch (error) {
    console.error("Error fetching Google Drive files:", error)
    return NextResponse.json({ error: "Google Drive fayllarini olishda xatolik" }, { status: 500 })
  }
}
