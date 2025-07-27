"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Upload,
  Download,
  Undo,
  Redo,
  MousePointer,
  Maximize,
  Minimize,
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

// Transliteration maps
const cyrillicToLatin: { [key: string]: string } = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
}

const latinToCyrillic: { [key: string]: string } = {
  a: "а",
  b: "б",
  v: "в",
  g: "г",
  d: "д",
  e: "е",
  yo: "ё",
  j: "ж",
  z: "з",
  i: "и",
  y: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  f: "ф",
  x: "х",
  ts: "ц",
  ch: "ч",
  sh: "ш",
  sch: "щ",
  yu: "ю",
  ya: "я",
  q: "қ",
  h: "ҳ",
}

function transliterate(text: string, toCyrillic = false): string {
  const map = toCyrillic ? latinToCyrillic : cyrillicToLatin
  let result = text.toLowerCase()

  // Handle multi-character mappings first
  const multiChar = toCyrillic ? ["yo", "yu", "ya", "ts", "ch", "sh", "sch"] : ["ё", "ю", "я", "ц", "ч", "ш", "щ"]
  multiChar.forEach((char) => {
    if (map[char]) {
      result = result.replace(new RegExp(char, "g"), map[char])
    }
  })

  // Handle single characters
  return result
    .split("")
    .map((char) => map[char] || char)
    .join("")
}

export function ModderSheet({ data, onDataChange, tableName, categories = [], onRefresh }: ModderSheetProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [replaceWith, setReplaceWith] = useState("")
  const [editedData, setEditedData] = useState(data)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: string }[]>([])
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: string } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentCell, setCurrentCell] = useState<{ row: number; col: string } | null>(null)

  const tableRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditedData(data)
    // Add to history
    if (data.length > 0) {
      setHistory([data])
      setHistoryIndex(0)
    }
  }, [data])

  const addToHistory = useCallback(
    (newData: any[]) => {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newData)))
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [history, historyIndex],
  )

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevData = history[historyIndex - 1]
      setEditedData(prevData)
      setHistoryIndex(historyIndex - 1)
      setHasChanges(true)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextData = history[historyIndex + 1]
      setEditedData(nextData)
      setHistoryIndex(historyIndex + 1)
      setHasChanges(true)
    }
  }

  // Keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault()
            if (hasChanges) {
              handleSave()
            }
            break
          case "z":
            e.preventDefault()
            if (!e.shiftKey) {
              handleUndo()
            }
            break
          case "y":
            e.preventDefault()
            handleRedo()
            break
          case "f":
            e.preventDefault()
            setShowSearch(true)
            setTimeout(() => searchInputRef.current?.focus(), 100)
            break
        }
      }

      // Navigation with arrow keys and Tab
      if (currentCell && !editingCell) {
        const visibleColumns = getVisibleColumns().filter((col) => !hiddenColumns.includes(col.key))
        const currentRowIndex = currentCell.row
        const currentColIndex = visibleColumns.findIndex((col) => col.key === currentCell.col)

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault()
            if (currentRowIndex > 0) {
              setCurrentCell({ row: currentRowIndex - 1, col: currentCell.col })
            }
            break
          case "ArrowDown":
            e.preventDefault()
            if (currentRowIndex < sortedData.length - 1) {
              setCurrentCell({ row: currentRowIndex + 1, col: currentCell.col })
            }
            break
          case "ArrowLeft":
            e.preventDefault()
            if (currentColIndex > 0) {
              setCurrentCell({ row: currentRowIndex, col: visibleColumns[currentColIndex - 1].key })
            }
            break
          case "ArrowRight":
          case "Tab":
            e.preventDefault()
            if (currentColIndex < visibleColumns.length - 1) {
              setCurrentCell({ row: currentRowIndex, col: visibleColumns[currentColIndex + 1].key })
            } else if (currentRowIndex < sortedData.length - 1) {
              setCurrentCell({ row: currentRowIndex + 1, col: visibleColumns[0].key })
            }
            break
          case "Enter":
            e.preventDefault()
            setEditingCell(currentCell)
            break
        }
      }

      if (e.key === "Escape") {
        setEditingCell(null)
        setShowSearch(false)
        setSelectedCells([])
        setSelectedRows([])
        setCurrentCell(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [hasChanges, currentCell, editingCell, sortedData?.length, hiddenColumns])

  // Define visible columns based on table
  const getVisibleColumns = () => {
    if (tableName === "products") {
      return [
        { key: "images", label: "Rasm", type: "image", sticky: true },
        { key: "name_uz", label: "Nomi", type: "text", sticky: true },
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
        { key: "customer_name", label: "Mijoz", type: "text", sticky: true },
        { key: "customer_phone", label: "Telefon", type: "text", sticky: true },
        {
          key: "status",
          label: "Buyurtma holati",
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
        { key: "is_payed", label: "To'langan", type: "boolean" },
        { key: "is_agree", label: "Kelishilgan", type: "boolean" },
        { key: "is_borrowed", label: "Qarzdor", type: "boolean" },
        { key: "borrowed_period", label: "Qarz muddati", type: "number" },
        { key: "delivery_address", label: "Manzil", type: "text" },
        { key: "created_at", label: "Sana", type: "datetime" },
      ]
    } else if (tableName === "debtors") {
      return [
        { key: "order_number", label: "Raqam", type: "text", sticky: true },
        { key: "customer_name", label: "Mijoz", type: "text", sticky: true },
        { key: "customer_phone", label: "Telefon", type: "text" },
        { key: "total_amount", label: "Summa", type: "number" },
        { key: "borrowed_period", label: "Asosiy muddat", type: "number" },
        { key: "borrowed_additional_period", label: "Qo'shimcha muddat", type: "number" },
        { key: "days_remaining", label: "Qolgan kunlar", type: "number" },
        { key: "is_overdue", label: "Kechikkan", type: "boolean" },
        { key: "was_qarzdor", label: "Oldingi qarzdor", type: "boolean" },
        { key: "borrowed_updated_at", label: "Yangilangan", type: "datetime" },
      ]
    } else if (tableName === "categories") {
      return [
        { key: "name_uz", label: "Nomi", type: "text", sticky: true },
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
    } else if (tableName === "rentals") {
      return [
        { key: "order_number", label: "Raqam", type: "text", sticky: true },
        { key: "customer_name", label: "Mijoz", type: "text", sticky: true },
        { key: "customer_phone", label: "Telefon", type: "text" },
        { key: "rental_duration", label: "Muddat (kun)", type: "number" },
        { key: "rental_price_per_day", label: "Kunlik narx", type: "number" },
        { key: "deposit_amount", label: "Omonat", type: "number" },
        { key: "is_deposit_paid", label: "Omonat to'langan", type: "boolean" },
        { key: "is_returned", label: "Qaytarilgan", type: "boolean" },
        { key: "rental_start_date", label: "Boshlanish", type: "datetime" },
        { key: "rental_end_date", label: "Tugash", type: "datetime" },
        { key: "return_date", label: "Qaytarilgan sana", type: "datetime" },
        { key: "total_amount", label: "Jami summa", type: "number" },
      ]
    } else if (tableName === "workers") {
      return [
        { key: "first_name", label: "Ism", type: "text", sticky: true },
        { key: "last_name", label: "Familiya", type: "text", sticky: true },
        { key: "profession_uz", label: "Kasb", type: "text" },
        { key: "phone_number", label: "Telefon", type: "text" },
        { key: "experience_years", label: "Tajriba (yil)", type: "number" },
        { key: "hourly_rate", label: "Soatlik narx", type: "number" },
        { key: "daily_rate", label: "Kunlik narx", type: "number" },
        { key: "rating", label: "Reyting", type: "number" },
        { key: "is_available", label: "Mavjud", type: "boolean" },
        { key: "location", label: "Manzil", type: "text" },
        { key: "created_at", label: "Yaratilgan", type: "datetime" },
      ]
    } else if (tableName === "ads") {
      return [
        { key: "name", label: "Nomi", type: "text", sticky: true },
        { key: "image_url", label: "Rasm", type: "image" },
        { key: "link", label: "Havola", type: "text" },
        { key: "is_active", label: "Faol", type: "boolean" },
        { key: "click_count", label: "Bosilishlar", type: "number" },
        { key: "sort_order", label: "Tartib", type: "number" },
        { key: "created_at", label: "Yaratilgan", type: "datetime" },
      ]
    }
    return []
  }

  const visibleColumns = getVisibleColumns().filter((col) => !hiddenColumns.includes(col.key))
  const stickyColumns = visibleColumns.filter((col) => col.sticky)
  const regularColumns = visibleColumns.filter((col) => !col.sticky)

  // Enhanced search with transliteration
  const filteredData = editedData.filter((item) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const searchCyrillic = transliterate(searchQuery, true)
    const searchLatin = transliterate(searchQuery, false)

    return Object.values(item).some((value) => {
      const valueStr = String(value).toLowerCase()
      return valueStr.includes(searchLower) || valueStr.includes(searchCyrillic) || valueStr.includes(searchLatin)
    })
  })

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
    addToHistory(newData)
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
    addToHistory(newData)
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

  // Excel-like cell selection with navigation
  const handleCellMouseDown = (rowIndex: number, columnKey: string, e: React.MouseEvent) => {
    setCurrentCell({ row: rowIndex, col: columnKey })

    if (e.shiftKey && selectionStart) {
      // Range selection
      const startRow = Math.min(selectionStart.row, rowIndex)
      const endRow = Math.max(selectionStart.row, rowIndex)
      const startColIndex = visibleColumns.findIndex((col) => col.key === selectionStart.col)
      const endColIndex = visibleColumns.findIndex((col) => col.key === columnKey)
      const startCol = Math.min(startColIndex, endColIndex)
      const endCol = Math.max(startColIndex, endColIndex)

      const newSelection: { row: number; col: string }[] = []
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          newSelection.push({ row, col: visibleColumns[col].key })
        }
      }
      setSelectedCells(newSelection)
    } else {
      setSelectionStart({ row: rowIndex, col: columnKey })
      setSelectedCells([{ row: rowIndex, col: columnKey }])
      setIsSelecting(true)
    }
  }

  const handleCellMouseEnter = (rowIndex: number, columnKey: string) => {
    if (isSelecting && selectionStart) {
      const startRow = Math.min(selectionStart.row, rowIndex)
      const endRow = Math.max(selectionStart.row, rowIndex)
      const startColIndex = visibleColumns.findIndex((col) => col.key === selectionStart.col)
      const endColIndex = visibleColumns.findIndex((col) => col.key === columnKey)
      const startCol = Math.min(startColIndex, endColIndex)
      const endCol = Math.max(startColIndex, endColIndex)

      const newSelection: { row: number; col: string }[] = []
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          newSelection.push({ row, col: visibleColumns[col].key })
        }
      }
      setSelectedCells(newSelection)
    }
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
  }

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [])

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return

    if (confirm(`${selectedRows.length} ta yozuvni o'chirishni tasdiqlaysizmi?`)) {
      try {
        const idsToDelete = selectedRows.map((index) => sortedData[index].id)

        const { error } = await supabase.from(tableName).delete().in("id", idsToDelete)

        if (error) throw error

        const newData = editedData.filter((item) => !idsToDelete.includes(item.id))
        setEditedData(newData)
        addToHistory(newData)
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

    // Initialize with default values based on table
    if (tableName === "orders") {
      newRow.order_number = `ORD-${Date.now()}`
      newRow.customer_name = ""
      newRow.customer_phone = ""
      newRow.status = "pending"
      newRow.is_payed = false
      newRow.is_agree = false
      newRow.is_borrowed = false
      newRow.borrowed_period = 0
      newRow.delivery_address = ""
      newRow.total_amount = 0
      newRow.subtotal = 0
      newRow.delivery_fee = 0
    } else if (tableName === "rentals") {
      newRow.order_number = `RNT-${Date.now()}`
      newRow.customer_name = ""
      newRow.customer_phone = ""
      newRow.status = "pending"
      newRow.product_type = "rental"
      newRow.rental_duration = 1
      newRow.rental_price_per_day = 0
      newRow.deposit_amount = 0
      newRow.is_deposit_paid = false
      newRow.is_returned = false
      newRow.rental_start_date = new Date().toISOString()
      newRow.rental_end_date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      newRow.total_amount = 0
    } else if (tableName === "workers") {
      newRow.first_name = ""
      newRow.last_name = ""
      newRow.profession_uz = ""
      newRow.phone_number = ""
      newRow.experience_years = 0
      newRow.hourly_rate = 0
      newRow.daily_rate = 0
      newRow.rating = 0
      newRow.is_available = true
      newRow.location = ""
    } else if (tableName === "ads") {
      newRow.name = ""
      newRow.image_url = ""
      newRow.link = ""
      newRow.is_active = true
      newRow.click_count = 0
      newRow.sort_order = 0
    } else {
      // Initialize with default values for other tables
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
    }

    const newData = [...editedData, newRow]
    setEditedData(newData)
    addToHistory(newData)
    setHasChanges(true)
  }

  // Excel Export Functions with full Excel library features
  const exportToExcel = (selectedOnly = false) => {
    try {
      const dataToExport =
        selectedOnly && selectedRows.length > 0 ? selectedRows.map((index) => sortedData[index]) : sortedData

      // Prepare data for Excel with advanced formatting
      const excelData = dataToExport.map((item, index) => {
        const row: any = { "#": index + 1 }
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
              returned: "Qaytarilgan",
            }
            row[col.label] = statusLabels[value] || value
          } else if (col.type === "select" && col.key === "product_type") {
            row[col.label] = value === "rental" ? "Ijara" : "Sotuv"
          } else if (col.type === "number") {
            row[col.label] = typeof value === "number" ? value : Number.parseFloat(value) || 0
          } else {
            row[col.label] = value || ""
          }
        })
        return row
      })

      // Create workbook with advanced features
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [{ wch: 5 }, ...visibleColumns.map((col) => ({ wch: col.type === "text" ? 20 : 15 }))]
      ws["!cols"] = colWidths

      // Add autofilter
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1")
      ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) }

      // Freeze first row
      ws["!freeze"] = { xSplit: 0, ySplit: 1 }

      // Add conditional formatting for boolean columns
      const conditionalFormats: any[] = []
      visibleColumns.forEach((col, colIndex) => {
        if (col.type === "boolean") {
          const colLetter = XLSX.utils.encode_col(colIndex + 1)
          conditionalFormats.push({
            type: "cellIs",
            operator: "equal",
            formula: '"Ha"',
            style: { fill: { fgColor: { rgb: "90EE90" } } },
            ref: `${colLetter}2:${colLetter}${excelData.length + 1}`,
          })
        }
      })

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, tableName)

      // Add summary sheet
      const summaryData = [
        ["Jadval nomi", tableName],
        ["Export sanasi", new Date().toLocaleDateString("uz-UZ")],
        ["Jami yozuvlar", excelData.length],
        ["Ustunlar soni", visibleColumns.length],
        ["", ""],
        ["Ustunlar ro'yxati", ""],
        ...visibleColumns.map((col) => [col.label, col.type]),
      ]

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      summaryWs["!cols"] = [{ wch: 20 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, summaryWs, "Ma'lumot")

      // Save file with timestamp
      const suffix = selectedOnly ? "_selected" : ""
      const timestamp = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `${tableName}_export${suffix}_${timestamp}.xlsx`)
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
                Qaytarilgan: "returned",
              }
              processedRow[col.key] = statusMap[excelValue] || "pending"
            } else {
              processedRow[col.key] = excelValue || ""
            }
          })

          return processedRow
        })

        // Add imported data to existing data
        const newData = [...editedData, ...processedData]
        setEditedData(newData)
        addToHistory(newData)
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

  const renderCellValue = (item: any, column: any, rowIndex: number) => {
    const value = item[column.key]
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === column.key
    const isSelected = selectedCells.some((cell) => cell.row === rowIndex && cell.col === column.key)
    const isCurrent = currentCell?.row === rowIndex && currentCell?.col === column.key

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

    const cellClass = `p-3 cursor-pointer hover:bg-accent/50 transition-colors max-w-[200px] ${
      isSelected ? "bg-primary/20 border-2 border-primary" : ""
    } ${isCurrent ? "ring-2 ring-primary/50" : ""} ${
      column.sticky ? "sticky left-0 bg-background z-10 border-r border-border" : ""
    }`

    if (column.type === "boolean") {
      return (
        <div className={cellClass}>
          <Badge variant={value ? "default" : "secondary"} className="text-xs">
            {value ? "Ha" : "Yo'q"}
          </Badge>
        </div>
      )
    }

    if (column.type === "image") {
      const images = Array.isArray(value) ? value : []
      return (
        <div className={cellClass}>
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
        </div>
      )
    }

    if (column.type === "number") {
      return (
        <div className={cellClass}>
          <span className="font-mono text-sm">{typeof value === "number" ? value.toLocaleString() : value}</span>
        </div>
      )
    }

    if (column.type === "select" && column.key === "category_id") {
      const category = categories.find((c) => c.id === value)
      return (
        <div className={cellClass}>
          <span className="text-sm">{category?.name_uz || value}</span>
        </div>
      )
    }

    if (column.type === "select" && column.key === "product_type") {
      return (
        <div className={cellClass}>
          <span className="text-sm">{value === "rental" ? "Ijara" : "Sotuv"}</span>
        </div>
      )
    }

    if (column.type === "select" && column.key === "status") {
      const statusLabels: any = {
        pending: "Kutilmoqda",
        confirmed: "Tasdiqlangan",
        processing: "Jarayonda",
        shipped: "Yuborilgan",
        delivered: "Yetkazilgan",
        cancelled: "Bekor qilingan",
        returned: "Qaytarilgan",
      }
      return (
        <div className={cellClass}>
          <span className="text-sm">{statusLabels[value] || value}</span>
        </div>
      )
    }

    if (column.type === "datetime") {
      return (
        <div className={cellClass}>
          {value ? (
            <span className="text-sm">{new Date(value).toLocaleDateString("uz-UZ")}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      )
    }

    return (
      <div className={cellClass}>
        <span className="text-sm line-clamp-2" title={value}>
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}`}>
      {/* Advanced Toolbar */}
      <Card className="ios-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">ModderSheet - {tableName}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{sortedData.length} yozuv</Badge>
              {selectedRows.length > 0 && <Badge variant="secondary">{selectedRows.length} tanlangan</Badge>}
              {selectedCells.length > 0 && <Badge variant="secondary">{selectedCells.length} katak</Badge>}
              {hasChanges && <Badge variant="destructive">Saqlanmagan</Badge>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="ios-button bg-transparent"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Replace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Qidirish (Kiril/Lotin)..."
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
              Saqlash (Ctrl+S)
              {hasChanges && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  !
                </Badge>
              )}
            </Button>

            <Button onClick={addNewRow} variant="outline" className="ios-button bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              {tableName === "orders"
                ? "Yangi buyurtma"
                : tableName === "rentals"
                  ? "Yangi arenda"
                  : tableName === "workers"
                    ? "Yangi ishchi"
                    : tableName === "ads"
                      ? "Yangi reklama"
                      : "Qator qo'shish"}
            </Button>

            {/* History Actions */}
            <Button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              variant="outline"
              size="sm"
              className="ios-button bg-transparent"
            >
              <Undo className="h-4 w-4 mr-1" />
              Bekor qilish (Ctrl+Z)
            </Button>

            <Button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              variant="outline"
              size="sm"
              className="ios-button bg-transparent"
            >
              <Redo className="h-4 w-4 mr-1" />
              Qaytarish (Ctrl+Y)
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
            <Button onClick={() => exportToExcel(false)} variant="outline" className="ios-button bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Excel Export
            </Button>

            {selectedRows.length > 0 && (
              <Button onClick={() => exportToExcel(true)} variant="outline" className="ios-button bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Tanlanganlarni Export
              </Button>
            )}

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
                <DropdownMenuItem onClick={() => setSelectedRows([])}>Qator tanlovini bekor qilish</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedCells([])}>Katak tanlovini bekor qilish</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortColumn("")}>Saralashni bekor qilish</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setHiddenColumns([])}>Barcha ustunlarni ko'rsatish</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
            <strong>Klaviatura:</strong> Ctrl+S (Saqlash), Ctrl+Z (Bekor qilish), Ctrl+Y (Qaytarish), Ctrl+F (Qidirish),
            Shift+Click (Oraliq tanlash), Tab/Strelkalar (Navigatsiya), Enter (Tahrirlash)
          </div>
        </CardContent>
      </Card>

      {/* Data Table - Responsive Container */}
      <div className={`modder-sheet-container ${isFullscreen ? "h-[calc(100vh-200px)]" : ""}`}>
        <Card className="ios-card h-full">
          <CardContent className="p-0 h-full">
            <div className="modder-sheet-content overflow-auto" ref={tableRef}>
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/50 z-20">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-sm bg-muted/50 w-12 sticky left-0 z-30">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === sortedData.length && sortedData.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-sm bg-muted/50 w-12 sticky left-12 z-30">#</th>
                    {stickyColumns.map((column, index) => (
                      <th
                        key={column.key}
                        className={`text-left p-3 font-medium text-sm bg-muted/50 min-w-[120px] cursor-pointer hover:bg-muted/70 transition-colors sticky z-30 border-r border-border`}
                        style={{ left: `${48 + index * 120}px` }}
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
                    {regularColumns.map((column) => (
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
                      <td className="p-3 sticky left-0 bg-background z-10 border-r border-border">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(rowIndex)}
                          onChange={() => handleSelectRow(rowIndex)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 text-sm text-muted-foreground sticky left-12 bg-background z-10 border-r border-border">
                        {rowIndex + 1}
                      </td>
                      {stickyColumns.map((column, index) => (
                        <td
                          key={column.key}
                          className="border-r border-border sticky z-10 bg-background"
                          style={{ left: `${48 + index * 120}px` }}
                          onMouseDown={(e) => handleCellMouseDown(rowIndex, column.key, e)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, column.key)}
                          onDoubleClick={() => setEditingCell({ row: rowIndex, col: column.key })}
                        >
                          {renderCellValue(item, column, rowIndex)}
                        </td>
                      ))}
                      {regularColumns.map((column) => (
                        <td
                          key={column.key}
                          className="border-r border-border last:border-r-0"
                          onMouseDown={(e) => handleCellMouseDown(rowIndex, column.key, e)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, column.key)}
                          onDoubleClick={() => setEditingCell({ row: rowIndex, col: column.key })}
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
                              <MousePointer className="h-4 w-4 mr-2" />
                              Tanlash
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Bu yozuvni o'chirishni tasdiqlaysizmi?")) {
                                  const newData = editedData.filter((d) => d.id !== item.id)
                                  setEditedData(newData)
                                  addToHistory(newData)
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
                        {tableName === "orders"
                          ? "Yangi buyurtma qo'shish"
                          : tableName === "rentals"
                            ? "Yangi arenda qo'shish"
                            : tableName === "workers"
                              ? "Yangi ishchi qo'shish"
                              : tableName === "ads"
                                ? "Yangi reklama qo'shish"
                                : "Yangi qator qo'shish"}
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
                    {tableName === "orders"
                      ? "Birinchi buyurtmani qo'shish"
                      : tableName === "rentals"
                        ? "Birinchi arendani qo'shish"
                        : tableName === "workers"
                          ? "Birinchi ishchini qo'shish"
                          : tableName === "ads"
                            ? "Birinchi reklamani qo'shish"
                            : "Birinchi yozuvni qo'shish"}
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
          {selectedRows.length > 0 && <span>Tanlangan qatorlar: {selectedRows.length} ta</span>}
          {selectedCells.length > 0 && <span>Tanlangan kataklar: {selectedCells.length} ta</span>}
          {hasChanges && (
            <Badge variant="destructive" className="text-xs">
              Saqlanmagan o'zgarishlar bor
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground/70">ModderSheet v5.1 - JamolStroy Admin Panel</div>
      </div>
    </div>
  )
}
