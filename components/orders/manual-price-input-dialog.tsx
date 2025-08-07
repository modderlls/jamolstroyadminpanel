// components/orders/manual-price-input-dialog.tsx
import React, { useState, useEffect, useMemo  } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ManualPriceInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null; // The whole order object, ensure it's properly typed if possible
  onSuccess: () => void; // Callback after successful update
}

export const ManualPriceInputDialog: React.FC<ManualPriceInputDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order && order.order_items) {
      const initialPrices: Record<string, number> = {};
      order.order_items.forEach((item: any) => {
        try {
          const variations = typeof item.variations === 'string' ? JSON.parse(item.variations) : item.variations;
          if (Array.isArray(variations)) {
            variations.forEach((v: any) => {
              // Only collect prices for manual_type and (zero or undefined/null) additional_price
              if (v.manual_type && (v.additional_price === 0 || v.additional_price === null || typeof v.additional_price === 'undefined')) {
                initialPrices[`${item.id}_${v.type}_${v.name}`] = 0; // Initialize with 0 for new input
              }
            });
          }
        } catch (e) {
          console.error("Error parsing variations in dialog for initial prices:", e);
        }
      });
      setItemPrices(initialPrices);
    } else if (!order) {
        setItemPrices({});
    }
  }, [order]);

  const handlePriceChange = (key: string, value: string) => {
    setItemPrices((prev) => ({
      ...prev,
      [key]: Number.parseFloat(value) || 0, // Ensure value is number, default to 0 if invalid
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!order) {
        toast.error("Buyurtma ma'lumotlari mavjud emas.");
        return;
      }

      let newSubtotalForOrder = 0; // Accumulator for the order's new subtotal

      // Prepare updates for each order_item
      const orderItemUpdates = [];

      for (const item of order.order_items) {
        const itemCopy = { ...item }; // Create a mutable copy of the item
        let itemBasePrice = item.unit_price * item.quantity; // Base price of the item (products.price * quantity)
        let itemNewTotalPrice = itemBasePrice; // Start with base price for item's new total

        try {
          let variations = typeof itemCopy.variations === 'string' ? JSON.parse(itemCopy.variations) : itemCopy.variations;

          if (Array.isArray(variations)) {
            const updatedVariations = variations.map((v: any) => {
              if (v.manual_type && (v.additional_price === 0 || v.additional_price === null || typeof v.additional_price === 'undefined')) {
                const key = `${item.id}_${v.type}_${v.name}`;
                const newAdditionalPrice = itemPrices[key];

                if (typeof newAdditionalPrice === 'undefined' || newAdditionalPrice < 0) {
                    toast.error(`"${v.type}: ${v.name}" uchun qo'shimcha narx kiritilishi shart (musbat son).`);
                    throw new Error("Qo'shimcha narx kiritilishi shart");
                }
                itemNewTotalPrice += newAdditionalPrice * item.quantity; // Add new manual price to item's total
                return { ...v, additional_price: newAdditionalPrice };
              }
              itemNewTotalPrice += (v.additional_price || 0) * item.quantity; // Add existing additional price to item's total
              return v;
            });
            itemCopy.variations = JSON.stringify(updatedVariations); // Store updated variations back as string
          }
        } catch (e: any) {
          console.error("Error processing item variations for update:", e);
          if (e.message === "Qo'shimcha narx kiritilishi shart") throw e; // Re-throw custom error
          toast.error(`Mahsulot variantlarini yangilashda xatolik yuz berdi: ${e.message}`);
          return; // Stop processing this item
        }

        // Add this item's updated total to the order's new subtotal
        newSubtotalForOrder += itemNewTotalPrice;

        // Add this item's update to the batch
        orderItemUpdates.push({
          id: item.id, // Primary key of the order_items table
          variations: itemCopy.variations, // Updated variations JSON string
          total_price: itemNewTotalPrice, // Update total_price in order_items table
          // You might need to add other fields if they changed or are required by your RLS policies
        });
      }

      // Execute updates for order_items in a loop (Supabase doesn't support batch update for different rows easily via .update().in())
      for (const update of orderItemUpdates) {
        const { error: itemUpdateError } = await supabase
          .from("order_items")
          .update({
            variations: update.variations,
            total_price: update.total_price // Update total_price of the individual order_item
          })
          .eq("id", update.id);
        if (itemUpdateError) throw itemUpdateError;
      }

      const newTotalAmountForOrder = newSubtotalForOrder + (order.delivery_fee || 0); // Recalculate total amount

      // Update the main order in Supabase
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          total_amount: newTotalAmountForOrder,
          subtotal: newSubtotalForOrder,
          is_agree: true, // Mark as agreed after prices are set
          status: "processing", // Move to processing
          updated_at: new Date().toISOString(),
          // !!! IMPORTANT: DO NOT include 'order_items' here if it's a related table, not a column !!!
          // If you did, it would try to update a non-existent column and cause PGRST204.
        })
        .eq("id", order.id);

      if (orderUpdateError) throw orderUpdateError;

      toast.success("Qo'shimcha narxlar muvaffaqiyatli yangilandi va buyurtma qabul qilindi!");
      onSuccess(); // Notify parent to refresh data
      onOpenChange(false); // Close the dialog
    } catch (error: any) {
      console.error("Qo'shimcha narxlarni yangilashda xatolik:", error);
      toast.error(`Qo'shimcha narxlarni yangilashda xatolik yuz berdi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const hasManualPriceItems = useMemo(() => {
    return order?.order_items?.some((item: any) => {
        try {
            const variations = typeof item.variations === 'string' ? JSON.parse(item.variations) : item.variations;
            return Array.isArray(variations) && variations.some(v => v.manual_type && (v.additional_price === 0 || v.additional_price === null || typeof v.additional_price === 'undefined'));
        } catch (e) {
            console.error("Error checking manual price items:", e);
            return false;
        }
    }) || false; // Ensure it returns boolean
  }, [order]);


  if (!order || !hasManualPriceItems) {
    return null; // Don't show dialog if no order or no manual price items found
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Qo'shimcha narx kiritish</DialogTitle> {/* Corrected DialogTitle syntax */}
          <DialogDescription>
            Ushbu buyurtmadagi ba'zi mahsulotlar uchun mijoz tomonidan kiritilgan turdagi qo'shimcha narxlar belgilanmagan. Iltimos, narxlarni kiriting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {order.order_items.map((item: any) => {
            let variationsToInput: any[] = [];
            try {
              const variations = typeof item.variations === 'string' ? JSON.parse(item.variations) : item.variations;
              if (Array.isArray(variations)) {
                variationsToInput = variations.filter((v: any) => v.manual_type && (v.additional_price === 0 || v.additional_price === null || typeof v.additional_price === 'undefined'));
              }
            } catch (e) {
              console.error("Error parsing variations for display:", e);
            }

            if (variationsToInput.length === 0) return null; // Only render if there are manual prices to input

            return (
              <div key={item.id} className="space-y-2 border-b pb-2">
                {/* Display product name and its current unit price (excluding variations) */}
                <h4 className="text-sm font-semibold">
                  {item.products?.name_uz} ({item.quantity} dona) - Asosiy narxi: {item.unit_price?.toLocaleString()} so'm
                </h4>
                {variationsToInput.map((v: any) => (
                  <div key={`${item.id}_${v.type}_${v.name}`} className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor={`${item.id}_${v.type}_${v.name}`} className="text-right">
                      {v.type}: {v.name}
                    </Label>
                    <Input
                      id={`${item.id}_${v.type}_${v.name}`}
                      type="number"
                      value={itemPrices[`${item.id}_${v.type}_${v.name}`] || ''}
                      onChange={(e) => handlePriceChange(`${item.id}_${v.type}_${v.name}`, e.target.value)}
                      className="col-span-2"
                      placeholder="Qo'shimcha narx kiriting" // Changed placeholder
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Bekor qilish</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saqlanmoqda..." : "Qo'shimcha narxlash va qabul qilish"} {/* Changed button text */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};