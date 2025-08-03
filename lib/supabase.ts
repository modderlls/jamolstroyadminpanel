'use client' // Bu fayl clientda ham ishlatilishini istasangiz qo‘ymang

import { createClient } from "@supabase/supabase-js"
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"

// ⚠️ cookies faqat server componentda ishlaydi, shuning uchun dynamic import ishlatamiz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ Client-side Supabase client — bu to‘g‘ri ishlaydi
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ Server-side Supabase client — faqat Server Componentda ishlatilsin
export const createServerClient = async () => {
  // Dinamik import — bu `next/headers` ni faqat serverda chaqirishni ta'minlaydi
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Componentda emasligi uchun xatoni yutamiz
        }
      },
    },
  })
}
