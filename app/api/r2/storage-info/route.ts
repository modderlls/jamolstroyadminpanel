import { type NextRequest, NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client"

export async function GET(request: NextRequest) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
    })

    const response = await r2Client.send(command)

    const totalFiles = response.KeyCount || 0
    const totalSize = response.Contents?.reduce((sum, object) => sum + (object.Size || 0), 0) || 0

    // R2 has generous limits, but we'll show some stats
    const maxStorage = 10 * 1024 * 1024 * 1024 // 10GB for display purposes
    const usedPercentage = (totalSize / maxStorage) * 100

    return NextResponse.json({
      success: true,
      storage: {
        totalFiles,
        totalSize,
        totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
        maxStorage,
        maxStorageGB: (maxStorage / (1024 * 1024 * 1024)).toFixed(0),
        usedPercentage: Math.min(usedPercentage, 100).toFixed(1),
        bucketName: R2_BUCKET_NAME,
      },
    })
  } catch (error) {
    console.error("Error fetching R2 storage info:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch storage info from R2",
      },
      { status: 500 },
    )
  }
}
