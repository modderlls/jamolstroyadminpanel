import { type NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ success: false, error: "No file key provided" }, { status: 400 })
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })

    await r2Client.send(command)

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting R2 file:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete file from R2",
      },
      { status: 500 },
    )
  }
}
