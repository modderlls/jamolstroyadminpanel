import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function middleware(request: NextRequest) {
  // Login page uchun exception
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next()
  }

  // API routes uchun exception
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Static files uchun exception
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/placeholder.svg")
  ) {
    return NextResponse.next()
  }

  try {
    // Supabase client yaratish
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Authorization header dan token olish
    const authHeader = request.headers.get("authorization")
    const token =
      authHeader?.replace("Bearer ", "") ||
      request.cookies.get("sb-access-token")?.value ||
      request.cookies.get("supabase-auth-token")?.value

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Token ni tekshirish
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Admin role tekshirish
    if (user.user_metadata?.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
