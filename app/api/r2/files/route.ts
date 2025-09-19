import { NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2-client"

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
    })

    const response = await r2Client.send(command)

    const files = (response.Contents || []).map((object) => ({
      id: object.Key || "",
      name: object.Key || "",
      size: object.Size || 0,
      created_at: object.LastModified?.toISOString() || new Date().toISOString(),
      updated_at: object.LastModified?.toISOString() || new Date().toISOString(),
      mimeType: "application/octet-stream",
      url: `${R2_PUBLIC_URL}/${object.Key}`,
    }))

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
    })
  } catch (error) {
    console.error("Error listing R2 files:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list files from R2",
      },
      { status: 500 },
    )
  }
}
