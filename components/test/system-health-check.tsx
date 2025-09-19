"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase"

interface TestResult {
  name: string
  status: "pending" | "success" | "error" | "warning"
  message: string
  details?: string
}

export function SystemHealthCheck() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const supabase = createBrowserClient()

  const runTests = async () => {
    setIsRunning(true)
    const testResults: TestResult[] = []

    // Test 1: Database Connection
    try {
      const { data, error } = await supabase.from("workers").select("count").limit(1)
      testResults.push({
        name: "Database Connection",
        status: error ? "error" : "success",
        message: error ? "Failed to connect to database" : "Database connection successful",
        details: error?.message,
      })
    } catch (err) {
      testResults.push({
        name: "Database Connection",
        status: "error",
        message: "Database connection failed",
        details: err instanceof Error ? err.message : "Unknown error",
      })
    }

    // Test 2: Authentication
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      testResults.push({
        name: "Authentication",
        status: user ? "success" : "warning",
        message: user ? "User authenticated" : "No user session",
        details: user ? `User ID: ${user.id}` : "Please log in to test authentication",
      })
    } catch (err) {
      testResults.push({
        name: "Authentication",
        status: "error",
        message: "Authentication check failed",
        details: err instanceof Error ? err.message : "Unknown error",
      })
    }

    // Test 3: Admin Permissions
    try {
      const { data, error } = await supabase.from("admin_users").select("role").limit(1)
      testResults.push({
        name: "Admin Permissions",
        status: error ? "error" : "success",
        message: error ? "Failed to check admin permissions" : "Admin permissions accessible",
        details: error?.message,
      })
    } catch (err) {
      testResults.push({
        name: "Admin Permissions",
        status: "error",
        message: "Admin permissions check failed",
        details: err instanceof Error ? err.message : "Unknown error",
      })
    }

    // Test 4: Workers Table
    try {
      const { data, error } = await supabase.from("workers").select("id").limit(1)
      testResults.push({
        name: "Workers Table",
        status: error ? "error" : "success",
        message: error ? "Workers table not accessible" : "Workers table accessible",
        details: error?.message,
      })
    } catch (err) {
      testResults.push({
        name: "Workers Table",
        status: "error",
        message: "Workers table check failed",
        details: err instanceof Error ? err.message : "Unknown error",
      })
    }

    // Test 5: KPI Functions
    try {
      const { data, error } = await supabase.rpc("get_kpi_data")
      testResults.push({
        name: "KPI Functions",
        status: error ? "error" : "success",
        message: error ? "KPI functions not working" : "KPI functions working",
        details: error?.message,
      })
    } catch (err) {
      testResults.push({
        name: "KPI Functions",
        status: "error",
        message: "KPI functions check failed",
        details: err instanceof Error ? err.message : "Unknown error",
      })
    }

    // Test 6: API Endpoints
    try {
      const response = await fetch("/api/r2/storage-info")
      testResults.push({
        name: "API Endpoints",
        status: response.ok ? "success" : "error",
        message: response.ok ? "API endpoints responding" : "API endpoints not responding",
        details: `Status: ${response.status}`,
      })
    } catch (err) {
      testResults.push({
        name: "API Endpoints",
        status: "error",
        message: "API endpoints check failed",
        details: err instanceof Error ? err.message : "Unknown error",
      })
    }

    setTests(testResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      pending: "outline",
    } as const

    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          System Health Check
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              "Run Tests"
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(test.status)}
                <div>
                  <h3 className="font-medium">{test.name}</h3>
                  <p className="text-sm text-muted-foreground">{test.message}</p>
                  {test.details && <p className="text-xs text-muted-foreground mt-1">{test.details}</p>}
                </div>
              </div>
              {getStatusBadge(test.status)}
            </div>
          ))}
          {tests.length === 0 && !isRunning && (
            <p className="text-center text-muted-foreground py-8">Click "Run Tests" to validate system functionality</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
