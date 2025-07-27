import { NextResponse } from "next/server"
import { google } from "googleapis"

const GOOGLE_DRIVE_CREDENTIALS = {
  type: "service_account",
  project_id: "jamolstroy",
  private_key_id: "5e154543194f432f7dbd291d2aeecb4ea5ea1e4d",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5Xz8VURPAi5tA\ndxqXH9gmAqET5NH/M6BQorQw8PicL96vFTbQkQgHJWlUpgSt84WJDiOl9AcO+M+6\n3AXEUpw4o4hYPYibA+sw2/G0Hu0mMggqGbHtVyUL1hJrmKxEwdApxIfz4Yt/cr8P\nNaPAflv7T8IQSak4IDIjQNY0bN5iN84OoE1vmmnTnEiE9LFzXwIaLi6EhAmbjNNT\nmdLGLaIVi5LPiQ0wf+qfDIXWyW3P6jiH2PYgolljEc+enCL8I4p/N1h77dArB7Yz\nMPiynkm2ZmquM0tC0KpGP4B06MwE7oYHTEyCVGDgR/5bw2cGp7Vxxa+6jWhNHISv\nz7UcEiIBAgMBAAECggEALWpOqgIQYQjDC1by0oooel2ECbvyj//du8u08lWjTx6y\nQ7pikNQrf5a0mNrIxDZopaSraq3f6dTfDeR4XDoyEHVOQvImbPYXkcOdErhN+SDi\nW7AqZZ/HUYBLyIUh1YGXZphCB6ffNaUO9qK5YQCEOAy5GqT1Wq0Wo4jvwe3XSQAA\njqjRy0kqz0mH5FPw7Mf4P14dAts5UAXz3IHWQw4Lf7QB9I0zKNxRH2jCw6clY9h/\n/vz9OOi2iApvtRgDzjsAJq2i6sna8Brk8zE8us77CIY/hjFacZ6b5wVooqgD2q6A\nRUD962TLxJOmmJZySmfKyJ9gwraihjcl0sC5Xq1DjQKBgQDp36JQZBy8wTs0qWK+\ndr9S50hhoJdmgr/nQ5Xypehn2vnATOWo6PoFJUrePBLXUx+xu8dSxFTEhLOB9FB3\naMe9BQPStXhfFPpjfAW8ksaRtdTphXC69/G7BAppjP1dppd4ub1Zk+5ThaYQeXbR\n6eKl0d29fxOhz8wN6M+j5TMbJQKBgQDK6OqeB3xRvdnWkUMUEilnW6UGqONd8rG3\nMnJpHDY3Iry/tRw+U+2EMKSzo7DsTk7scq3s4TV2mFG0JgBJ8WQglRL9zGjTk5bh\n81ej1srHXj0SlLbmAe81g3gOOCzTNv8mVr/4Rz0mPZaDvMIpvX/XY0CwJ7kJgh9m\nXFOXdcCCrQKBgEtuuBmZ0LMI2CHKKHEqN9dzhaMHew2zSlY7NFgJLwagWEGwC7sJ\nOesC9jzrv1/4DZbz6/xEGtsvuf5GYNXC0/mhbnQ9189DIueHjwodhTJmJYAUbCHB\n6xPY38rfkLDuFJj5v5ru3cXOq5tQsgROna3CHPUL0bc1IKmz15UTTgKJAoGBAIP9\nhPitN+JYVAauUWsR8Vrpk2zEmbo4MABSUXgsQNwWvZ8a6bdlkuBlYA320hS1T8Oh\nSaAIU2XE6Yj9Gzz+SDqlnkf4GsxeekyapYzPIPMVSzb2BA+UfI1b6tGdGxN99/Vx\ngsi3VoC0mV8yfz71pN5wEtlDzarwuQo1zq58i3C1AoGBANaWnBAogMGtGsHEM0i+\nXVDgp1pJ31paZEuitLtwGcRFz6nZTWmM6tMyLWKtKKrr4cfMPWKzzjQUFvxfn5g2\n/qkqDaXh9RVBoVSk00q7VJfbIDHNin2CqgBwJf5es7AcyJfBN34t95aQ8ZiqtUOM\nSIAw/rrULF4mdLcwgaJRgHRp\n-----END PRIVATE KEY-----\n",
  client_email: "jamoladmin@jamolstroy.iam.gserviceaccount.com",
  client_id: "107908349590770064120",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/jamoladmin%40jamolstroy.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
}

const FOLDER_ID = "1m4Vmycv5kLhY0ku1NCHZxh5Y89ZvCpS6"

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_DRIVE_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    })

    const drive = google.drive({ version: "v3", auth })

    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: "files(id,name,mimeType,size,createdTime,webViewLink,thumbnailLink)",
      orderBy: "createdTime desc",
      pageSize: 100,
    })

    const files = response.data.files || []

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: Number.parseInt(file.size || "0"),
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
      })),
    })
  } catch (error) {
    console.error("Error fetching Google Drive files:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Google Drive fayllarini olishda xatolik",
      },
      { status: 500 },
    )
  }
}
