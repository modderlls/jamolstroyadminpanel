import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { withPermission } from "@/lib/api-middleware"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const POST = withPermission("products", "edit", async (request: NextRequest, user: any) => {
  try {
    const { productId, variationType, variationName, variationValue, additionalPrice } = await request.json()

    if (!productId || !variationType || !variationName || !variationValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get current product specifications
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("specifications")
      .eq("id", productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const specifications = product.specifications || {}

    // Initialize the variation type if it doesn't exist
    if (!specifications[variationType]) {
      specifications[variationType] = []
    }

    // Check if variation already exists
    const existingVariation = specifications[variationType].find(
      (v: any) => v.name === variationName && v.value === variationValue,
    )

    if (existingVariation) {
      return NextResponse.json({ error: "Variation already exists" }, { status: 400 })
    }

    // Add new variation
    const newVariation = {
      name: variationName,
      value: variationValue,
      ...(additionalPrice && { additional_price: additionalPrice }),
    }

    specifications[variationType].push(newVariation)

    // Update product specifications
    const { error: updateError } = await supabase.from("products").update({ specifications }).eq("id", productId)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }

    // Log admin action
    await supabase.rpc("log_admin_action", {
      p_action_type: "product_variation_add",
      p_module: "products",
      p_entity_id: productId,
      p_metadata: { variation: newVariation, admin_id: user.id },
    })

    return NextResponse.json({
      message: "Variation added successfully",
      variation: newVariation,
    })
  } catch (error) {
    console.error("Error adding manual variation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
