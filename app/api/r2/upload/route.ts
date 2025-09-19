import { type NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2-client"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2)
    const fileExtension = file.name.split(".").pop()
    const fileName = `${timestamp}-${randomString}.${fileExtension}`

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.type || "application/octet-stream",
      ContentLength: fileBuffer.length,
    })

    await r2Client.send(command)

    // Use public URL format
    const fileUrl = `${R2_PUBLIC_URL}/${fileName}`

    return NextResponse.json({
      success: true,
      file: {
        id: fileName,
        name: file.name,
        key: fileName,
        size: fileBuffer.length,
        mimeType: file.type,
        url: fileUrl,
      },
    })
  } catch (error) {
    console.error("Error uploading to R2:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload file to R2",
      },
      { status: 500 },
    )
  }
}
