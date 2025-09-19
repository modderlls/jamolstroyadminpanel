import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    },
  )

  // Login page uchun exception
  if (request.nextUrl.pathname === "/login") {
    return response
  }

  // API routes uchun exception (but we'll add auth checks in individual routes)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return response
  }

  // Static files uchun exception
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/placeholder.svg")
  ) {
    return response
  }

  // Check authentication with Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Check if user is admin
  const { data: userData, error } = await supabase
    .from("users")
    .select("role, is_active, admin_role_id")
    .eq("id", user.id)
    .single()

  if (error || !userData || userData.role !== "admin" || !userData.is_active) {
    // Clear session and redirect to login
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Update last activity
  await supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id)

  return response
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
