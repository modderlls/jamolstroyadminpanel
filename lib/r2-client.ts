import { S3Client } from "@aws-sdk/client-s3"

export const R2_BUCKET_NAME = "products"
export const R2_DOCUMENTS_BUCKET = "documents"
export const R2_WORKERS_BUCKET = "workers"

export const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://pub-23ea67916b0a4289aa375f3a4d4aa54d.r2.dev",
  credentials: {
    accessKeyId: "e7b2bba9fcdef3c96307f500eb6c1a2e",
    secretAccessKey: "9100d4f2cfaf8d9573fb76291a9647f528e9d2c4357f692664fcd713552586c1",
  },
})
