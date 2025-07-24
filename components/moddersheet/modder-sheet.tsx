"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Replace,
  Save,
  Edit3,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  ImageIcon,
  RefreshCw,
  Settings,
  Database,
  FileText,
  Upload,
  Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import * as XLSX from "xlsx"

interface ModderSheetProps {
  data: any[]
  onDataChange: (data: any[]) => void
  tableName: string
  categories?: any[]
  onRefresh?: () => void
}

export function ModderSheet({ data, onDataChange, tableName, categories = [], onRefresh }: ModderSheetProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [replaceWith, setReplaceWith] = useState("")
  const [editedData, setEditedData] = useState(data)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])

  useEffect(() => {
    setEditedData(data)
  }, [data])

  // Define visible columns based on table
  const getVisibleColumns = () => {
    if (tableName === "products") {
      return [
        { key: "images", label: "Rasm", type: "image" },
        { key: "name_uz", label: "Nomi (UZ)", type: "text" },
        { key: "price", label: "Narxi", type: "number" },
        { key: "unit", label: "O'lchov", type: "select", options: ["dona", "kg", "m", "m2", "m3", "litr"] },
        { key: "stock_quantity", label: "Miqdor", type: "number" },
        {
          key: "category_id",
          label: "Kategoriya",
          type: "select",
          options: categories.map((c) => ({ value: c.id, label: c.name_uz })),
        },
        {
          key: "product_type",
          label: "Turi",
          type: "select",
          options: [
            { value: "sale", label: "Sotuv" },
            { value: "rental", label: "Ijara" },
          ],
        },
        { key: "is_available", label: "Mavjud", type: "boolean" },
        { key: "is_featured", label: "Tavsiya", type: "boolean" },
        { key: "is_popular", label: "Mashhur", type: "boolean" },
        { key: "has_delivery", label: "Yetkazish", type: "boolean" },
        { key: "delivery_price", label: "Yetkazish narxi", type: "number" },
        { key: "minimum_order", label: "Min buyurtma", type: "number" },
        { key: "view_count", label: "Ko'rishlar", type: "number" },
        { key: "average_rating", label: "Reyting", type: "number" },
      ]
    } else if (tableName === "orders") {
      return [
        { key: "order_number", label: "Raqam", type: "text" },
        { key: "customer_name", label: "Mijoz", type: "text" },
        { key: "customer_phone", label: "Telefon", type: "text" },
        {
          key: "status",
          label: "Holat",
          type: "select",
          options: [
            { value: "pending", label: "Kutilmoqda" },
            { value: "confirmed", label: "Tasdiqlangan" },
            { value: "processing", label: "Jarayonda" },
            { value: "shipped", label: "Yuborilgan" },
            { value: "delivered", label: "Yetkazilgan" },
            { value: "cancelled", label: "Bekor qilingan" },
          ],
        },
        { key: "total_amount", label: "Summa", type: "number" },
        { key: "is_payed", label: "To'langan", type: "boolean" },
        { key: "is_agree", label: "Kelishilgan", type: "boolean" },
        { key: "is_claimed", label: "Qabul", type: "boolean" },
        { key: "is_borrowed", label: "Qarzdor", type: "boolean" },
        { key: "borrowed_period", label: "Qarz muddati", type: "number" },
        { key: "delivery_address", label: "Manzil", type: "text" },
        { key: "created_at", label: "Sana", type: "datetime" },
      ]
    } else if (tableName === "debtors") {
      return [
        { key: "order_number", label: "Raqam", type: "text" },
        { key: "customer_name", label: "Mijoz", type: "text" },
        { key: "customer_phone", label: "Telefon", type: "text" },
        { key: "total_amount", label: "Summa", type: "number" },
        { key: "borrowed_period", label: "Asosiy muddat", type: "number" },
        { key: "borrowed_additional_period", label: "Qo'shimcha muddat", type: "number" },
        { key: "days_remaining", label: "Qolgan kunlar", type: "number" },
        { key: "is_overdue", label: "Kechikkan", type: "boolean" },
        { key: "borrowed_updated_at", label: "Yangilangan", type: "datetime" },
      ]
    } else if (tableName === "categories") {
      return [
        { key: "name_uz", label: "Nomi (UZ)", type: "text" },
        { key: "name_ru", label: "Nomi (RU)", type: "text" },
        {
          key: "parent_id",
          label: "Ota kategoriya",
          type: "select",
          options: categories.map((c) => ({ value: c.id, label: c.name_uz })),
        },
        { key: "level", label: "Daraja", type: "number" },
        { key: "products_count", label: "Mahsulotlar", type: "number" },
        { key: "created_at", label: "Yaratilgan", type: "datetime" },
      ]
    }
    return []
  }

  const visibleColumns = getVisibleColumns().filter((col) => !hiddenColumns.includes(col.key))

  const filteredData = editedData.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0

    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const handleCellEdit = async (rowIndex: number, columnKey: string, value: any) => {
    const newData = [...editedData]
    const actualIndex = editedData.findIndex((item) => item.id === sortedData[rowIndex].id)

    // Convert value based on column type
    const column = visibleColumns.find((col) => col.key === columnKey)
    let convertedValue = value

    if (column?.type === "number") {
      convertedValue = Number.parseFloat(value) || 0
    } else if (column?.type === "boolean") {
      convertedValue = value === "true" || value === true
    } else if (column?.type === "image" && value instanceof FileList) {
      // Handle image upload
      const uploadedUrls = await uploadImages(value)
      convertedValue = uploadedUrls
    }

    newData[actualIndex] = { ...newData[actualIndex], [columnKey]: convertedValue }
    setEditedData(newData)
    setHasChanges(true)
    setEditingCell(null)
  }

  const uploadImages = async (files: FileList): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage.from("products").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const handleSave = async () => {
    try {
      // Update all changed records
      for (const item of editedData) {
        const updateData: any = {}

        visibleColumns.forEach((col) => {
          if (col.key !== "images") {
            updateData[col.key] = item[col.key]
          }
        })

        updateData.updated_at = new Date().toISOString()

        const { error } = await supabase.from(tableName).update(updateData).eq("id", item.id)

        if (error) throw error
      }

      onDataChange(editedData)
      setHasChanges(false)
      alert("Ma'lumotlar muvaffaqiyatli saqlandi!")

      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error("Error saving data:", error)
      alert("Ma'lumotlarni saqlashda xatolik yuz berdi")
    }
  }

  const handleReplace = () => {
    if (!replaceQuery || !replaceWith) return

    const newData = editedData.map((item) => {
      const newItem = { ...item }
      Object.keys(newItem).forEach((key) => {
        if (typeof newItem[key] === "string") {
          newItem[key] = newItem[key].replace(new RegExp(replaceQuery, "gi"), replaceWith)
        }
      })
      return newItem
    })

    setEditedData(newData)
    setHasChanges(true)
    setReplaceQuery("")
    setReplaceWith("")
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns((prev) =>
      prev.includes(columnKey) ? prev.filter((col) => col !== columnKey) : [...prev, columnKey],
    )
  }

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows((prev) => (prev.includes(rowIndex) ? prev.filter((i) => i !== rowIndex) : [...prev, rowIndex]))
  }

  const handleSelectAll = () => {
    if (selectedRows.length === sortedData.length && sortedData.length > 0) {
      setSelectedRows([])
    } else {
      setSelectedRows(sortedData.map((_, index) => index))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return

    if (confirm(`${selectedRows.length} ta yozuvni o'chirishni tasdiqlaysizmi?`)) {
      try {
        const idsToDelete = selectedRows.map((index) => sortedData[index].id)

        const { error } = await supabase.from(tableName).delete().in("id", idsToDelete)

        if (error) throw error

        const newData = editedData.filter((item) => !idsToDelete.includes(item.id))
        setEditedData(newData)
        onDataChange(newData)
        setSelectedRows([])

        if (onRefresh) {
          onRefresh()
        }
      } catch (error) {
        console.error("Error deleting rows:", error)
        alert("Yozuvlarni o'chirishda xatolik yuz berdi")
      }
    }
  }

  const addNewRow = () => {
    const newRow: any = {
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Initialize with default values
    visibleColumns.forEach((col) => {
      if (col.type === "boolean") {
        newRow[col.key] = false
      } else if (col.type === "number") {
        newRow[col.key] = 0
      } else if (col.type === "image") {
        newRow[col.key] = []
      } else {
        newRow[col.key] = ""
      }
    })

    setEditedData((prev) => [...prev, newRow])
    setHasChanges(true)
  }

  // Excel Export Functions
  const exportToExcel = () => {
    try {
      // Prepare data for Excel
      const excelData = sortedData.map((item) => {
        const row: any = {}
        visibleColumns.forEach((col) => {
          const value = item[col.key]

          if (col.type === "boolean") {
            row[col.label] = value ? "Ha" : "Yo'q"
          } else if (col.type === "image") {
            row[col.label] = Array.isArray(value) ? `${value.length} ta rasm` : "0 ta rasm"
          } else if (col.type === "datetime") {
            row[col.label] = value ? new Date(value).toLocaleDateString("uz-UZ") : ""
          } else if (col.type === "select" && col.key === "category_id") {
            const category = categories.find((c) => c.id === value)
            row[col.label] = category?.name_uz || value
          } else if (col.type === "select" && col.key === "status") {
            const statusLabels: any = {
              pending: "Kutilmoqda",
              confirmed: "Tasdiqlangan",
              processing: "Jarayonda",
              shipped: "Yuborilgan",
              delivered: "Yetkazilgan",
              cancelled: "Bekor qilingan",
            }
            row[col.label] = statusLabels[value] || value
          } else if (col.type === "select" && col.key === "product_type") {
            row[col.label] = value === "rental" ? "Ijara" : "Sotuv"
          } else {
            row[col.label] = value || ""
          }
        })
        return row
      })

      // Create workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = visibleColumns.map((col) => ({ wch: 15 }))
      ws["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, tableName)

      // Save file
      XLSX.writeFile(wb, `${tableName}_export_${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      alert("Excel eksport qilishda xatolik yuz berdi")
    }
  }

  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // Process imported data
        const processedData = jsonData.map((row: any) => {
          const processedRow: any = {
            id: `import_${Date.now()}_${Math.random()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          visibleColumns.forEach((col) => {
            const excelValue = row[col.label]

            if (col.type === "boolean") {
              processedRow[col.key] = excelValue === "Ha" || excelValue === true
            } else if (col.type === "number") {
              processedRow[col.key] = Number.parseFloat(excelValue) || 0
            } else if (col.type === "select" && col.key === "product_type") {
              processedRow[col.key] = excelValue === "Ijara" ? "rental" : "sale"
            } else if (col.type === "select" && col.key === "status") {
              const statusMap: any = {
                Kutilmoqda: "pending",
                Tasdiqlangan: "confirmed",
                Jarayonda: "processing",
                Yuborilgan: "shipped",
                Yetkazilgan: "delivered",
                "Bekor qilingan": "cancelled",
              }
              processedRow[col.key] = statusMap[excelValue] || "pending"
            } else {
              processedRow[col.key] = excelValue || ""
            }
          })

          return processedRow
        })

        // Add imported data to existing data
        setEditedData((prev) => [...prev, ...processedData])
        setHasChanges(true)

        alert(`${processedData.length} ta yozuv import qilindi`)

        // Reset file input
        event.target.value = ""
      } catch (error) {
        console.error("Error importing Excel:", error)
        alert("Excel import qilishda xatolik yuz berdi")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const exportToMSHT = () => {
    try {
      // Create advanced MSHT format with styling
      const exportData = {
        meta: {
          version: "3.0",
          exported: new Date().toISOString(),
          source: "JamolStroy Admin Panel",
          table: tableName,
          rows: sortedData.length,
          columns: visibleColumns.length,
        },
        schema: {
          columns: visibleColumns.map((col) => ({
            key: col.key,
            label: col.label,
            type: col.type,
            options: col.options || null,
          })),
        },
        data: {
          rows: sortedData.map((item, index) => ({
            id: item.id,
            index: index + 1,
            cells: visibleColumns.map((col) => {
              const value = item[col.key]
              let displayValue = value
              let style = {
                fontFamily: "Arial",
                fontSize: 12,
                color: "#000000",
                backgroundColor: "#ffffff",
                fontWeight: "normal",
              }

              // Apply conditional styling
              if (col.type === "boolean") {
                displayValue = value ? "Ha" : "Yo'q"
                style.color = value ? "#16a34a" : "#dc2626"
                style.fontWeight = "bold"
              } else if (col.type === "number") {
                displayValue = typeof value === "number" ? value.toLocaleString() : value
                style.fontFamily = "monospace"
              } else if (col.key === "status") {
                const statusStyles: any = {
                  pending: { color: "#f59e0b", backgroundColor: "#fef3c7" },
                  confirmed: { color: "#3b82f6", backgroundColor: "#dbeafe" },
                  processing: { color: "#8b5cf6", backgroundColor: "#e9d5ff" },
                  shipped: { color: "#06b6d4", backgroundColor: "#cffafe" },
                  delivered: { color: "#10b981", backgroundColor: "#d1fae5" },
                  cancelled: { color: "#ef4444", backgroundColor: "#fee2e2" },
                }
                if (statusStyles[value]) {
                  style = { ...style, ...statusStyles[value] }
                }
              }

              return {
                key: col.key,
                value: displayValue,
                rawValue: value,
                style: style,
              }
            }),
          })),
        },
      }

      // Encode with Base64 and custom encryption
      const jsonString = JSON.stringify(exportData)
      const base64Data = btoa(unescape(encodeURIComponent(jsonString)))

      // Add custom header and footer
      const finalData = `MSHT_V3_START\n${base64Data}\nMSHT_V3_END`

      const blob = new Blob([finalData], {
        type: "application/octet-stream",
      })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${tableName}_advanced_${new Date().toISOString().split("T")[0]}.msht`
      link.click()
    } catch (error) {
      console.error("Error exporting to MSHT:", error)
      alert("MSHT eksport qilishda xatolik yuz berdi")
    }
  }

  const renderCellValue = (item: any, column: any, rowIndex: number) => {
    const value = item[column.key]
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === column.key

    if (isEditing) {
      if (column.type === "boolean") {
        return (
          <select
            defaultValue={value ? "true" : "false"}
            onBlur={(e) => handleCellEdit(rowIndex, column.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCellEdit(rowIndex, column.key, e.currentTarget.value)
              } else if (e.key === "Escape") {
                setEditingCell(null)
              }
            }}
            className="boolean-cell w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground border-border"
            autoFocus
          >
            <option value="true">Ha</option>
            <option value="false">Yo'q</option>
          </select>
        )
      } else if (column.type === "select") {
        return (
          <select
            defaultValue={value}
            onBlur={(e) => handleCellEdit(rowIndex, column.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCellEdit(rowIndex, column.key, e.currentTarget.value)
              } else if (e.key === "Escape") {
                setEditingCell(null)
              }
            }}
            className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground border-border"
            autoFocus
          >
            {Array.isArray(column.options)
              ? column.options.map((option: any) => (
                  <option
                    key={typeof option === "string" ? option : option.value}
                    value={typeof option === "string" ? option : option.value}
                  >
                    {typeof option === "string" ? option : option.label}
                  </option>
                ))
              : null}
          </select>
        )
      } else if (column.type === "image") {
        return (
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleCellEdit(rowIndex, column.key, e.target.files)}
            className="w-full text-xs bg-background text-foreground"
            autoFocus
          />
        )
      }

      return (
        <Input
          defaultValue={value}
          onBlur={(e) => handleCellEdit(rowIndex, column.key, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCellEdit(rowIndex, column.key, e.currentTarget.value)
            } else if (e.key === "Escape") {
              setEditingCell(null)
            }
          }}
          className="w-full h-8 text-xs"
          type={column.type === "number" ? "number" : "text"}
          autoFocus
        />
      )
    }

    if (column.type === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs">
          {value ? "Ha" : "Yo'q"}
        </Badge>
      )
    }

    if (column.type === "image") {
      const images = Array.isArray(value) ? value : []
      return (
        <div className="flex items-center gap-1">
          {images.length > 0 ? (
            <div className="flex -space-x-1">
              {images.slice(0, 3).map((img: string, idx: number) => (
                <div key={idx} className="w-6 h-6 rounded border-2 border-background overflow-hidden">
                  <Image
                    src={img || "/placeholder.svg"}
                    alt=""
                    width={24}
                    height={24}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
              {images.length > 3 && (
                <div className="w-6 h-6 rounded border-2 border-background bg-muted flex items-center justify-center text-xs">
                  +{images.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
              <ImageIcon className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      )
    }

    if (column.type === "number") {
      return <span className="font-mono text-sm">{typeof value === "number" ? value.toLocaleString() : value}</span>
    }

    if (column.type === "select" && column.key === "category_id") {
      const category = categories.find((c) => c.id === value)
      return <span className="text-sm">{category?.name_uz || value}</span>
    }

    if (column.type === "select" && column.key === "product_type") {
      return <span className="text-sm">{value === "rental" ? "Ijara" : "Sotuv"}</span>
    }

    if (column.type === "select" && column.key === "status") {
      const statusLabels: any = {
        pending: "Kutilmoqda",
        confirmed: "Tasdiqlangan",
        processing: "Jarayonda",
        shipped: "Yuborilgan",
        delivered: "Yetkazilgan",
        cancelled: "Bekor qilingan",
      }
      return <span className="text-sm">{statusLabels[value] || value}</span>
    }

    if (column.type === "datetime") {
      return value ? (
        <span className="text-sm">{new Date(value).toLocaleDateString("uz-UZ")}</span>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      )
    }

    return (
      <span className="text-sm line-clamp-2" title={value}>
        {value}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Advanced Toolbar */}
      <Card className="ios-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">ModderSheet - {tableName}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{sortedData.length} yozuv</Badge>
              {hasChanges && <Badge variant="destructive">Saqlanmagan</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Replace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nima..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Nima bilan..."
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleReplace}
                variant="outline"
                size="sm"
                disabled={!replaceQuery || !replaceWith}
                className="ios-button bg-transparent"
              >
                <Replace className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Primary Actions */}
            <Button onClick={handleSave} disabled={!hasChanges} className="ios-button">
              <Save className="h-4 w-4 mr-2" />
              Saqlash
              {hasChanges && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  !
                </Badge>
              )}
            </Button>

            <Button onClick={addNewRow} variant="outline" className="ios-button bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Qator qo'shish
            </Button>

            {/* Bulk Actions */}
            {selectedRows.length > 0 && (
              <>
                <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="ios-button">
                  <Trash2 className="h-4 w-4 mr-2" />
                  O'chirish ({selectedRows.length})
                </Button>
                <Button variant="outline" size="sm" className="ios-button bg-transparent">
                  <Copy className="h-4 w-4 mr-2" />
                  Dublikatlash
                </Button>
              </>
            )}

            {/* Excel Export/Import */}
            <Button onClick={exportToExcel} variant="outline" className="ios-button bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Excel Export
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={importFromExcel}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="excel-import"
              />
              <Button variant="outline" className="ios-button bg-transparent">
                <Upload className="h-4 w-4 mr-2" />
                Excel Import
              </Button>
            </div>

            <Button onClick={exportToMSHT} variant="outline" className="ios-button bg-transparent">
              <FileText className="h-4 w-4 mr-2" />
              MSHT Export
            </Button>

            {/* Utility Actions */}
            <Button onClick={() => onRefresh?.()} variant="outline" size="sm" className="ios-button bg-transparent">
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ios-button bg-transparent">
                  <Eye className="h-4 w-4 mr-2" />
                  Ustunlar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {getVisibleColumns().map((column) => (
                  <DropdownMenuItem
                    key={column.key}
                    onClick={() => toggleColumnVisibility(column.key)}
                    className="flex items-center justify-between"
                  >
                    <span>{column.label}</span>
                    {hiddenColumns.includes(column.key) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ios-button bg-transparent">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedRows([])}>Tanlovni bekor qilish</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortColumn("")}>Saralashni bekor qilish</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setHiddenColumns([])}>Barcha ustunlarni ko'rsatish</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Data Table - Fixed Container */}
      <div className="modder-sheet-container">
        <Card className="ios-card h-full">
          <CardContent className="p-0 h-full">
            <div className="modder-sheet-content">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/50 z-10">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-sm bg-muted/50 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === sortedData.length && sortedData.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-sm bg-muted/50 w-12">#</th>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.key}
                        className="text-left p-3 font-medium text-sm bg-muted/50 min-w-[120px] cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort(column.key)}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {sortColumn === column.key &&
                            (sortDirection === "asc" ? (
                              <SortAsc className="h-3 w-3" />
                            ) : (
                              <SortDesc className="h-3 w-3" />
                            ))}
                        </div>
                      </th>
                    ))}
                    <th className="text-left p-3 font-medium text-sm bg-muted/50 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item, rowIndex) => (
                    <tr
                      key={item.id}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        selectedRows.includes(rowIndex) ? "bg-muted/50" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(rowIndex)}
                          onChange={() => handleSelectRow(rowIndex)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{rowIndex + 1}</td>
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className="p-3 cursor-pointer hover:bg-accent/50 transition-colors max-w-[200px]"
                          onClick={() => setEditingCell({ row: rowIndex, col: column.key })}
                        >
                          {renderCellValue(item, column, rowIndex)}
                        </td>
                      ))}
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingCell({ row: rowIndex, col: visibleColumns[0].key })}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSelectRow(rowIndex)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Tanlash
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Bu yozuvni o'chirishni tasdiqlaysizmi?")) {
                                  const newData = editedData.filter((d) => d.id !== item.id)
                                  setEditedData(newData)
                                  setHasChanges(true)
                                }
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}

                  {/* Add New Row Button */}
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td colSpan={visibleColumns.length + 3} className="p-3">
                      <Button
                        onClick={addNewRow}
                        variant="ghost"
                        className="w-full h-8 text-muted-foreground hover:text-foreground ios-button"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi qator qo'shish
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>

              {sortedData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ma'lumot topilmadi</p>
                  <Button onClick={addNewRow} variant="outline" className="mt-4 ios-button bg-transparent">
                    <Plus className="h-4 w-4 mr-2" />
                    Birinchi yozuvni qo'shish
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Footer */}
      <div className="text-sm text-muted-foreground text-center space-y-2">
        <div className="flex items-center justify-center gap-4">
          <span>Jami: {sortedData.length} ta yozuv</span>
          {selectedRows.length > 0 && <span>Tanlangan: {selectedRows.length} ta</span>}
          {hasChanges && (
            <Badge variant="destructive" className="text-xs">
              Saqlanmagan o'zgarishlar bor
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground/70">ModderSheet v3.0 - JamolStroy Admin Panel</div>
      </div>
    </div>
  )
}
