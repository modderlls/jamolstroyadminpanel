import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const accessToken = formData.get("accessToken") as string
    const folderId = formData.get("folderId") as string | null

    if (!file || !accessToken) {
      return NextResponse.json({ error: "File and access token required" }, { status: 400 })
    }

    // First, upload file metadata
    const metadata = {
      name: file.name,
      parents: folderId ? [folderId] : undefined,
    }

    const metadataResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    })

    if (!metadataResponse.ok) {
      throw new Error(`Failed to initiate upload: ${metadataResponse.statusText}`)
    }

    const uploadUrl = metadataResponse.headers.get("location")
    if (!uploadUrl) {
      throw new Error("No upload URL received")
    }

    // Upload the actual file
    const fileBuffer = await file.arrayBuffer()
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: fileBuffer,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.statusText}`)
    }

    const uploadResult = await uploadResponse.json()

    return NextResponse.json({
      success: true,
      file: {
        id: uploadResult.id,
        name: uploadResult.name,
        size: uploadResult.size,
      },
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
