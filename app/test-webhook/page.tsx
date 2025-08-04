"use client"

import { useState } from "react"
import { ArrowLeft, Bot, CheckCircle, XCircle, RefreshCw, Settings, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

interface TestResult {
  step: string
  success: boolean
  data: any
}

export default function TestWebhookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [status, setStatus] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const handleCompleteFixTest = async () => {
    setLoading(true)
    setResults([])

    try {
      const response = await fetch("/api/telegram-complete-fix", {
        method: "POST",
      })
      const data = await response.json()

      if (data.results) {
        setResults(data.results)
      }

      console.log("Complete fix results:", data)
    } catch (error) {
      console.error("Test error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusCheck = async () => {
    setStatusLoading(true)

    try {
      const response = await fetch("/api/telegram-status")
      const data = await response.json()
      setStatus(data)
      console.log("Status:", data)
    } catch (error) {
      console.error("Status error:", error)
    } finally {
      setStatusLoading(false)
    }
  }

  const getStepName = (step: string) => {
    const stepNames: { [key: string]: string } = {
      delete_webhook: "Eski webhook o'chirish",
      set_webhook: "Yangi webhook o'rnatish",
      get_webhook_info: "Webhook ma'lumotlari",
      get_bot_info: "Bot ma'lumotlari",
      test_webhook: "Webhook test",
    }
    return stepNames[step] || step
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Telegram Bot Test</h1>
              <p className="text-sm text-muted-foreground">@jamolstroy_bot</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleCompleteFixTest}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-2xl p-6 hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg ios-button"
          >
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Zap className="w-6 h-6" />
              )}
              <div className="text-left">
                <div className="font-semibold">To'liq Tuzatish</div>
                <div className="text-sm opacity-80">Webhook ni qayta sozlash</div>
              </div>
            </div>
          </button>

          <button
            onClick={handleStatusCheck}
            disabled={statusLoading}
            className="bg-card border border-border rounded-2xl p-6 hover:bg-muted transition-all disabled:opacity-50 shadow-sm ios-button"
          >
            <div className="flex items-center space-x-4">
              {statusLoading ? (
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Settings className="w-6 h-6 text-muted-foreground" />
              )}
              <div className="text-left">
                <div className="font-semibold text-foreground">Status Tekshirish</div>
                <div className="text-sm text-muted-foreground">Bot va webhook holati</div>
              </div>
            </div>
          </button>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center space-x-2">
              <RefreshCw className="w-5 h-5" />
              <span>Test Natijalari</span>
            </h2>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-xl border ${
                    result.success
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{getStepName(result.step)}</div>
                    {result.data?.description && <div className="text-sm opacity-80">{result.data.description}</div>}
                  </div>
                  <div className="text-sm font-mono">{result.success ? "✓" : "✗"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Information */}
        {status && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span>Bot Status</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bot Info */}
              {status.bot?.result && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Bot Ma'lumotlari</h3>
                  <div className="bg-muted rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nomi:</span>
                      <span className="font-medium text-foreground">{status.bot.result.first_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-medium text-foreground">@{status.bot.result.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-sm text-foreground">{status.bot.result.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Holat:</span>
                      <span className="text-green-600 font-medium">Faol</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Webhook Info */}
              {status.webhook?.result && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Webhook Ma'lumotlari</h3>
                  <div className="bg-muted rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">URL:</span>
                      <span className="font-mono text-xs text-foreground break-all">
                        {status.webhook.result.url || "O'rnatilmagan"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Oxirgi xatolik:</span>
                      <span className="text-sm text-foreground">
                        {status.webhook.result.last_error_message || "Yo'q"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="font-medium text-foreground">
                        {status.webhook.result.pending_update_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 mt-8">
          <h3 className="font-semibold text-foreground mb-3">Qo'llanma:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. <strong>To'liq Tuzatish</strong> - Webhook ni to'liq qayta sozlaydi
            </p>
            <p>
              2. <strong>Status Tekshirish</strong> - Bot va webhook holatini ko'rsatadi
            </p>
            <p>
              3. Bot username: <strong>@jamolstroy_bot</strong>
            </p>
            <p>
              4. Telegram da <strong>/start</strong> buyrug'ini yuboring
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
