import { supabase } from "@/lib/supabase"

export interface KPILogData {
  action_type: string
  module: string
  entity_id?: string
  metadata?: Record<string, any>
}

export class KPILogger {
  private static instance: KPILogger
  private queue: KPILogData[] = []
  private isProcessing = false

  private constructor() {}

  static getInstance(): KPILogger {
    if (!KPILogger.instance) {
      KPILogger.instance = new KPILogger()
    }
    return KPILogger.instance
  }

  async log(data: KPILogData): Promise<void> {
    this.queue.push(data)
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) return

    this.isProcessing = true

    try {
      while (this.queue.length > 0) {
        const logData = this.queue.shift()
        if (logData) {
          await this.sendLog(logData)
        }
      }
    } catch (error) {
      console.error("Error processing KPI queue:", error)
    } finally {
      this.isProcessing = false
    }
  }

  private async sendLog(data: KPILogData): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      await supabase.rpc("log_admin_action", {
        p_action_type: data.action_type,
        p_module: data.module,
        p_entity_id: data.entity_id || null,
        p_metadata: data.metadata || {},
      })
    } catch (error) {
      console.error("Error sending KPI log:", error)
      // Re-queue the failed log for retry
      this.queue.unshift(data)
    }
  }

  // Convenience methods for common actions
  async logLogin(): Promise<void> {
    await this.log({
      action_type: "login",
      module: "auth",
    })
  }

  async logProductAction(
    action: "create" | "update" | "delete",
    productId?: string,
    productName?: string,
  ): Promise<void> {
    await this.log({
      action_type: `product_${action}`,
      module: "products",
      entity_id: productId,
      metadata: { product_name: productName },
    })
  }

  async logOrderAction(
    action: "approve" | "update" | "cancel" | "mark_paid" | "mark_debt",
    orderId?: string,
    orderNumber?: string,
  ): Promise<void> {
    await this.log({
      action_type: `order_${action}`,
      module: "orders",
      entity_id: orderId,
      metadata: { order_number: orderNumber },
    })
  }

  async logCategoryAction(
    action: "create" | "update" | "delete",
    categoryId?: string,
    categoryName?: string,
  ): Promise<void> {
    await this.log({
      action_type: `category_${action}`,
      module: "categories",
      entity_id: categoryId,
      metadata: { category_name: categoryName },
    })
  }

  async logUserAction(action: "create" | "update" | "delete", userId?: string, userName?: string): Promise<void> {
    await this.log({
      action_type: `user_${action}`,
      module: "users",
      entity_id: userId,
      metadata: { user_name: userName },
    })
  }

  async logAdminAction(action: "create" | "update" | "delete", adminId?: string, adminName?: string): Promise<void> {
    await this.log({
      action_type: `admin_${action}`,
      module: "admins",
      entity_id: adminId,
      metadata: { admin_name: adminName },
    })
  }

  async logSMSAction(action: "send" | "broadcast", recipientCount?: number): Promise<void> {
    await this.log({
      action_type: `sms_${action}`,
      module: "sms",
      metadata: { recipient_count: recipientCount },
    })
  }

  async logWorkerAction(action: "create" | "update" | "delete", workerId?: string, workerName?: string): Promise<void> {
    await this.log({
      action_type: `worker_${action}`,
      module: "workers",
      entity_id: workerId,
      metadata: { worker_name: workerName },
    })
  }

  async logAdAction(action: "create" | "update" | "delete", adId?: string, adName?: string): Promise<void> {
    await this.log({
      action_type: `ad_${action}`,
      module: "ads",
      entity_id: adId,
      metadata: { ad_name: adName },
    })
  }

  async logPageView(page: string): Promise<void> {
    await this.log({
      action_type: "page_view",
      module: "navigation",
      metadata: { page },
    })
  }

  async logSettingsChange(setting: string, oldValue?: any, newValue?: any): Promise<void> {
    await this.log({
      action_type: "settings_change",
      module: "settings",
      metadata: { setting, old_value: oldValue, new_value: newValue },
    })
  }
}

// Export singleton instance
export const kpiLogger = KPILogger.getInstance()
