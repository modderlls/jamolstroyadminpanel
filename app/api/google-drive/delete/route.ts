import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { fileId, accessToken } = await request.json()

    if (!fileId || !accessToken) {
      return NextResponse.json(
        {
          error: "File ID and access token required",
        },
        { status: 400 },
      )
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
    return NextResponse.json(
      {
        error: "Failed to delete file from Google Drive",
      },
      { status: 500 },
    )
  }
}
