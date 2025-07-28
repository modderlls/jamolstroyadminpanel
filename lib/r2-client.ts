// lib/r2-client.ts
import { S3Client } from "@aws-sdk/client-s3";

// CLOUDFLARE_ACCOUNT_ID o'rniga siz bergan endpoint URL'i ishlatiladi.
// R2_BUCKET_NAME ni o'zgartiring, agar sizning bucket nomingiz boshqa bo'lsa.
export const R2_BUCKET_NAME = "products"; // Bu sizning R2 bucketingizning nomi bo'lishi kerak

export const r2Client = new S3Client({
  region: "auto", // Cloudflare R2 uchun 'auto' region to'g'ri keladi
  endpoint: "https://8c83f8ed5e85977f5fbdb4e09366d010.r2.cloudflarestorage.com", // Siz bergan endpoint
  credentials: {
    accessKeyId: "e7b2bba9fcdef3c96307f500eb6c1a2e", // Siz bergan access key ID
    secretAccessKey: "9100d4f2cfaf8d9573fb76291a9647f528e9d2c4357f692664fcd713552586c1", // Siz bergan secret access key
  },
});
