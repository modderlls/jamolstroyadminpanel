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

    // Get storage quota
    const aboutResponse = await drive.about.get({
      fields: "storageQuota,user",
    })

    // Get files count
    const filesResponse = await drive.files.list({
      pageSize: 1,
      fields: "files(id)",
    })

    const storageQuota = aboutResponse.data.storageQuota
    const totalSpace = Number.parseInt(storageQuota?.limit || "0")
    const usedSpace = Number.parseInt(storageQuota?.usage || "0")
    const freeSpace = totalSpace - usedSpace

    return NextResponse.json({
      success: true,
      storage: {
        total: totalSpace,
        used: usedSpace,
        free: freeSpace,
        totalGB: (totalSpace / (1024 * 1024 * 1024)).toFixed(2),
        usedGB: (usedSpace / (1024 * 1024 * 1024)).toFixed(2),
        freeGB: (freeSpace / (1024 * 1024 * 1024)).toFixed(2),
        usagePercentage: totalSpace > 0 ? ((usedSpace / totalSpace) * 100).toFixed(1) : "0",
      },
      user: aboutResponse.data.user,
    })
  } catch (error: any) {
    console.error("Error fetching Google Drive storage info:", error.message || error)
    return NextResponse.json({ success: false, error: "Failed to fetch storage info" }, { status: 500 })
  }
}
