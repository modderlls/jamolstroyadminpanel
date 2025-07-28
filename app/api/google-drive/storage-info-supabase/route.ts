import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    // Get user info
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.statusText}`)
    }

    const userInfo = await userResponse.json()

    // Get storage quota
    const aboutResponse = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!aboutResponse.ok) {
      throw new Error(`Failed to get storage info: ${aboutResponse.statusText}`)
    }

    const aboutData = await aboutResponse.json()
    const quota = aboutData.storageQuota

    // Calculate storage info
    const total = Number.parseInt(quota.limit || "0")
    const used = Number.parseInt(quota.usage || "0")
    const free = total - used

    const totalGB = (total / (1024 * 1024 * 1024)).toFixed(2)
    const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2)
    const freeGB = (free / (1024 * 1024 * 1024)).toFixed(2)
    const usagePercentage = total > 0 ? ((used / total) * 100).toFixed(1) : "0"

    return NextResponse.json({
      success: true,
      user: {
        displayName: userInfo.name,
        emailAddress: userInfo.email,
        picture: userInfo.picture,
      },
      storage: {
        total,
        used,
        free,
        totalGB,
        usedGB,
        freeGB,
        usagePercentage,
      },
    })
  } catch (error) {
    console.error("Error fetching Google Drive storage info:", error)
    return NextResponse.json({ error: "Failed to fetch storage info" }, { status: 500 })
  }
}
