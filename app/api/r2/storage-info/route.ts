import { type NextRequest, NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client"

export async function GET(request: NextRequest) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
    })

    const response = await r2Client.send(command)

    let totalSize = 0
    let totalFiles = 0

    if (response.Contents) {
      totalFiles = response.Contents.length
      totalSize = response.Contents.reduce((sum, object) => sum + (object.Size || 0), 0)
    }

    const maxStorage = 10 * 1024 * 1024 * 1024 // 10GB limit
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2)
    const maxStorageGB = (maxStorage / (1024 * 1024 * 1024)).toFixed(0)
    const usedPercentage = ((totalSize / maxStorage) * 100).toFixed(1)

    return NextResponse.json({
      success: true,
      storage: {
        totalFiles,
        totalSize,
        totalSizeGB,
        maxStorage,
        maxStorageGB,
        usedPercentage,
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
