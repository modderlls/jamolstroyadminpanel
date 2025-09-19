import { SystemHealthCheck } from "@/components/test/system-health-check"
import { DatabaseValidator } from "@/components/test/database-validator"

export default function TestPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">System Testing & Validation</h1>
        <p className="text-muted-foreground">Comprehensive testing tools to validate all system functionality</p>
      </div>

      <SystemHealthCheck />
      <DatabaseValidator />
    </div>
  )
}
