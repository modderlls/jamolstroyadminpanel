import { type NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client"
import { withPermission } from "@/lib/api-middleware"

export const DELETE = withPermission("files", "delete", async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get("file")

    if (!fileName) {
      return NextResponse.json({ success: false, error: "No file name provided" }, { status: 400 })
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
    })

    await r2Client.send(command)

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting from R2:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete file from R2",
      },
      { status: 500 },
    )
  }
})
