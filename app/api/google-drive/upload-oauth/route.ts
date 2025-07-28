import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { Readable } from "stream"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const accessToken = formData.get("accessToken") as string

    if (!file || !accessToken) {
      return NextResponse.json({ error: "File and access token required" }, { status: 400 })
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

    // Get public URL
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })

    const publicUrl = `https://drive.google.com/file/d/${response.data.id}/view`

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileName: file.name,
      publicUrl,
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
