import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Default supabase client (no session/cookie attached)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with cookies (for Server Actions or Middleware)
export const createServerClient = () => {
  const cookieStore = cookies() // ❌ await emas, bu sync funksiya

  const accessToken = cookieStore.get("sb-access-token")?.value
  const refreshToken = cookieStore.get("sb-refresh-token")?.value

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      getSession: async () => {
        if (!accessToken || !refreshToken) {
          return { data: { session: null }, error: null }
        }

        return {
          data: {
            session: {
              access_token: accessToken,
              refresh_token: refreshToken,
              // Bu yerda agar kerak bo‘lsa, boshqa session maydonlarini qo‘shishingiz mumkin
            },
          },
          error: null,
        }
      },
    },
  })
}

// Client for admin/server actions (service role)
export const createServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required")
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
