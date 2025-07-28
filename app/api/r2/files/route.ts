import { type NextRequest, NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client"

export async function GET(request: NextRequest) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 100,
    })

    const response = await r2Client.send(command)

    const files =
      response.Contents?.map((object) => ({
        id: object.Key || "",
        name: object.Key || "",
        size: object.Size || 0,
        created_at: object.LastModified?.toISOString(),
        updated_at: object.LastModified?.toISOString(),
        mimeType: "application/octet-stream", // R2 doesn't store MIME type by default
        url: `https://8c83f8ed5e85977f5fbdb4e09366d010.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${object.Key}`,
      })) || []

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
    })
  } catch (error) {
    console.error("Error fetching R2 files:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch files from R2",
      },
      { status: 500 },
    )
  }
}
