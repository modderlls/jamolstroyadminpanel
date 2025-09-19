"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { createBrowserClient } from "@/lib/supabase"

export function DatabaseValidator() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const executeQuery = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.rpc("execute_sql", { sql_query: query })

      if (error) {
        setError(error.message)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const predefinedQueries = [
    {
      name: "Check Workers Table",
      query: "SELECT COUNT(*) as worker_count FROM workers;",
    },
    {
      name: "Check Admin Users",
      query: "SELECT COUNT(*) as admin_count FROM admin_users;",
    },
    {
      name: "Check KPI Data",
      query: "SELECT * FROM get_kpi_data() LIMIT 5;",
    },
    {
      name: "Check Permissions",
      query: "SELECT * FROM admin_permissions LIMIT 10;",
    },
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Database Validator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {predefinedQueries.map((item, index) => (
            <Button key={index} variant="outline" size="sm" onClick={() => setQuery(item.query)}>
              {item.name}
            </Button>
          ))}
        </div>

        <Textarea
          placeholder="Enter SQL query to test database functionality..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
        />

        <Button onClick={executeQuery} disabled={isLoading || !query.trim()}>
          {isLoading ? "Executing..." : "Execute Query"}
        </Button>

        {error && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <Badge variant="destructive" className="mb-2">
              Error
            </Badge>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <Badge variant="default" className="mb-2">
              Success
            </Badge>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
