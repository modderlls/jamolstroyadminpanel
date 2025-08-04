"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    chat_type?: string
    chat_instance?: string
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: "light" | "dark"
  themeParams: any
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  ready: () => void
  expand: () => void
  close: () => void
  showAlert: (message: string) => void
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void
  showPopup: (params: any, callback?: (buttonId: string) => void) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  onEvent: (eventType: string, eventHandler: () => void) => void
  offEvent: (eventType: string, eventHandler: () => void) => void
  sendData: (data: string) => void
  openLink: (url: string) => void
  openTelegramLink: (url: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
}

interface TelegramContextType {
  webApp: TelegramWebApp | null
  user: TelegramUser | null
  isReady: boolean
  isTelegramWebApp: boolean
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined)

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)

  useEffect(() => {
    // Check if we're in Telegram Web App environment
    const checkTelegramWebApp = () => {
      if (typeof window !== "undefined") {
        // Check for Telegram WebApp
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          console.log("Telegram WebApp detected")
          setWebApp(tg)
          setIsTelegramWebApp(true)

          // Initialize Telegram WebApp
          tg.ready()
          tg.expand()

          // Set theme
          tg.setHeaderColor("#000000")
          tg.setBackgroundColor("#000000")

          // Get user data
          if (tg.initDataUnsafe?.user) {
            console.log("Telegram user data:", tg.initDataUnsafe.user)
            setUser(tg.initDataUnsafe.user)
          }

          setIsReady(true)
        } else {
          console.log("Not in Telegram WebApp environment")
          setIsTelegramWebApp(false)
          setIsReady(true)
        }
      }
    }

    // Check immediately
    checkTelegramWebApp()

    // Also check after a short delay in case the script loads later
    const timeout = setTimeout(checkTelegramWebApp, 1000)

    return () => clearTimeout(timeout)
  }, [])

  const value = {
    webApp,
    user,
    isReady,
    isTelegramWebApp,
  }

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
}

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (context === undefined) {
    throw new Error("useTelegram must be used within a TelegramProvider")
  }
  return context
}
