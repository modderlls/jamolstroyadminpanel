import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken, fileId } = await request.json()

    if (!accessToken || !fileId) {
      return NextResponse.json({ error: "Access token and file ID required" }, { status: 400 })
    }

    // Delete file from Google Drive
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting Google Drive file:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
