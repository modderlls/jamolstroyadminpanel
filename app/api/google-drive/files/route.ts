import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    // Fetch files from Google Drive
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?" +
        "pageSize=100&" +
        "fields=files(id,name,size,mimeType,createdTime,modifiedTime,webViewLink,thumbnailLink)&" +
        "orderBy=modifiedTime desc",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Google Drive API error:", errorText)
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform files to our format
    const files =
      data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size ? Number.parseInt(file.size) : undefined,
        mimeType: file.mimeType,
        created_at: file.createdTime,
        updated_at: file.modifiedTime,
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
      })) || []

    return NextResponse.json({
      success: true,
      files,
    })
  } catch (error) {
    console.error("Error fetching Google Drive files:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch files from Google Drive",
      },
      { status: 500 },
    )
  }
}
