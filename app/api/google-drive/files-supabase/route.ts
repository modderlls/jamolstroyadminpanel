import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    // Fetch files from Google Drive
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name,size,createdTime,modifiedTime,mimeType)",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform the data to match our interface
    const files =
      data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size ? Number.parseInt(file.size) : undefined,
        created_at: file.createdTime,
        updated_at: file.modifiedTime,
        mimeType: file.mimeType,
      })) || []

    return NextResponse.json({ success: true, files })
  } catch (error) {
    console.error("Error fetching Google Drive files:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}
