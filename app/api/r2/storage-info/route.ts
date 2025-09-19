// /api/r2/storage-info/route.ts
import { NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client"
import { withPermission } from "@/lib/api-middleware"

export const dynamic = "force-dynamic"  // <<< Shu qator qo'shiladi

export const GET = withPermission("files", "read", async () => {
  try {
    const command = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME })
    const response = await r2Client.send(command)

    const totalFiles = response.KeyCount || 0
    const totalSize = (response.Contents || []).reduce((sum, object) => sum + (object.Size || 0), 0)
    const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2)

    const maxStorage = 10 * 1024 * 1024 * 1024
    const maxStorageGB = "10"
    const usedPercentage = ((totalSize / maxStorage) * 100).toFixed(1)

    return NextResponse.json({
      success: true,
      storage: { totalFiles, totalSize, totalSizeGB, maxStorage, maxStorageGB, usedPercentage, bucketName: R2_BUCKET_NAME },
    })
  } catch (error) {
    console.error("Error getting R2 storage info:", error)
    return NextResponse.json({ success: false, error: "Failed to get storage info from R2" }, { status: 500 })
  }
})
