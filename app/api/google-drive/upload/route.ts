import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const accessToken = formData.get("accessToken") as string
    const folderId = formData.get("folderId") as string | null

    if (!file || !accessToken) {
      return NextResponse.json(
        {
          error: "File and access token required",
        },
        { status: 400 },
      )
    }

    // Create file metadata
    const metadata = {
      name: file.name,
      parents: folderId ? [folderId] : undefined,
    }

    // Step 1: Create resumable upload session
    const initResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    })

    if (!initResponse.ok) {
      throw new Error(`Failed to initiate upload: ${initResponse.statusText}`)
    }

    const uploadUrl = initResponse.headers.get("location")
    if (!uploadUrl) {
      throw new Error("No upload URL received from Google Drive")
    }

    // Step 2: Upload file content
    const fileBuffer = await file.arrayBuffer()
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBuffer,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.statusText}`)
    }

    const result = await uploadResponse.json()

    return NextResponse.json({
      success: true,
      file: {
        id: result.id,
        name: result.name,
        size: result.size,
        mimeType: result.mimeType,
      },
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file to Google Drive",
      },
      { status: 500 },
    )
  }
}
