import type { NextRequest } from "next/server"
import { getAuthenticatedUser, requirePermission, createAuthResponse } from "./auth-utils"

export async function withAuth<T>(handler: (request: NextRequest, user: any) => Promise<T>) {
  return async (request: NextRequest) => {
    try {
      const user = await getAuthenticatedUser()

      if (!user) {
        return createAuthResponse("Authentication required")
      }

      return await handler(request, user)
    } catch (error) {
      console.error("Auth middleware error:", error)
      return createAuthResponse("Authentication failed")
    }
  }
}

export async function withPermission<T>(
  module: string,
  action: string,
  handler: (request: NextRequest, user: any) => Promise<T>,
) {
  return async (request: NextRequest) => {
    try {
      const user = await requirePermission(module, action)
      return await handler(request, user)
    } catch (error) {
      console.error("Permission middleware error:", error)
      if (error instanceof Error && error.message.startsWith("Permission denied")) {
        return createAuthResponse(error.message, 403)
      }
      return createAuthResponse("Authentication failed")
    }
  }
}
