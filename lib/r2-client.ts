import { S3Client } from "@aws-sdk/client-s3"

export const R2_BUCKET_NAME = "products"
export const R2_DOCUMENTS_BUCKET = "documents"
export const R2_WORKERS_BUCKET = "workers"
export const R2_PUBLIC_URL = "https://pub-23ea67916b0a4289aa375f3a4d4aa54d.r2.dev"

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://8c83f8ed5e85977f5fbdb4e09366d010.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})
