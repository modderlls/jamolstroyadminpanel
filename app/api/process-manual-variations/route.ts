import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withPermission } from "@/lib/api-middleware"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const POST = withPermission("orders", "edit", async (request: NextRequest, user: any) => {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // Get order with items and product specifications
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          products(id, specifications)
        )
      `)
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    let updatedProducts = 0

    // Process each order item
    for (const item of order.order_items) {
      if (!item.variations) continue

      try {
        const variations = typeof item.variations === "string" ? JSON.parse(item.variations) : item.variations
        if (!Array.isArray(variations)) continue

        const product = item.products
        const specifications = product.specifications || {}
        let specUpdated = false

        // Check for manual variations that need to be added to product specifications
        for (const variation of variations) {
          if (variation.manual_type === true && variation.additional_price > 0) {
            const variationType = variation.type
            const variationName = variation.name
            const variationValue = variation.value
            const additionalPrice = variation.additional_price

            // Initialize variation type if it doesn't exist
            if (!specifications[variationType]) {
              specifications[variationType] = []
            }

            // Check if this variation already exists
            const existingVariation = specifications[variationType].find(
              (v: any) => v.name === variationName && v.value === variationValue,
            )

            if (!existingVariation) {
              // Add new variation to specifications
              specifications[variationType].push({
                name: variationName,
                value: variationValue,
                additional_price: additionalPrice,
              })
              specUpdated = true
            }
          }
        }

        // Update product specifications if changed
        if (specUpdated) {
          const { error: updateError } = await supabase.from("products").update({ specifications }).eq("id", product.id)

          if (!updateError) {
            updatedProducts++
          }
        }
      } catch (error) {
        console.error("Error processing variations for item:", item.id, error)
      }
    }

    // Log admin action
    await supabase.rpc("log_admin_action", {
      p_action_type: "order_variations_process",
      p_module: "orders",
      p_entity_id: orderId,
      p_metadata: { updatedProducts, admin_id: user.id },
    })

    return NextResponse.json({
      message: "Manual variations processed successfully",
      updatedProducts,
    })
  } catch (error) {
    console.error("Error processing manual variations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
