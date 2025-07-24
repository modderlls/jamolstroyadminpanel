"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plus, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Category {
  id: string
  name_uz: string
  name_ru: string
  parent_id: string | null
  level: number
  path: string
}

interface CategorySelectorProps {
  value: string
  onChange: (value: string) => void
  categories: Category[]
  onCategoriesUpdate: () => void
}

export function CategorySelector({ value, onChange, categories, onCategoriesUpdate }: CategorySelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryNameRu, setNewCategoryNameRu] = useState("")
  const [loading, setLoading] = useState(false)

  // Hierarchical categories ni tuzish
  const buildCategoryTree = (cats: Category[], parentId: string | null = null): Category[] => {
    return cats.filter((cat) => cat.parent_id === parentId).sort((a, b) => a.name_uz.localeCompare(b.name_uz))
  }

  const renderCategoryOption = (category: Category, level = 0) => {
    const indent = "  ".repeat(level)
    const children = buildCategoryTree(categories, category.id)

    return [
      <SelectItem key={category.id} value={category.id}>
        <div className="flex items-center">
          {level > 0 && <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground" />}
          <span>
            {indent}
            {category.name_uz}
          </span>
        </div>
      </SelectItem>,
      ...children.flatMap((child) => renderCategoryOption(child, level + 1)),
    ]
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setLoading(true)
    try {
      // Parse category name for sub-categories (using / separator)
      const categoryParts = newCategoryName
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean)
      let currentParentId = selectedParent || null

      for (let i = 0; i < categoryParts.length; i++) {
        const categoryName = categoryParts[i]

        // Check if category already exists at this level
        const existingCategory = categories.find(
          (cat) => cat.name_uz.toLowerCase() === categoryName.toLowerCase() && cat.parent_id === currentParentId,
        )

        if (existingCategory) {
          currentParentId = existingCategory.id
          continue
        }

        // Create new category
        const { data, error } = await supabase
          .from("categories")
          .insert([
            {
              name_uz: categoryName,
              name_ru: newCategoryNameRu || categoryName,
              parent_id: currentParentId,
            },
          ])
          .select()
          .single()

        if (error) throw error

        currentParentId = data.id

        // If this is the last category, select it
        if (i === categoryParts.length - 1) {
          onChange(data.id)
        }
      }

      await onCategoriesUpdate()
      setIsDialogOpen(false)
      setNewCategoryName("")
      setNewCategoryNameRu("")
      setSelectedParent("")
    } catch (error) {
      console.error("Error creating category:", error)
      alert("Kategoriya yaratishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const rootCategories = buildCategoryTree(categories, null)

  return (
    <div className="space-y-2">
      <Label>Kategoriya</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Kategoriyani tanlang" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {rootCategories.flatMap((category) => renderCategoryOption(category))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
          className="ios-button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi kategoriya yaratish</DialogTitle>
            <DialogDescription>
              Yangi kategoriya yoki sub-kategoriya yarating. "/" belgisi bilan sub-kategoriya yaratishingiz mumkin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ota kategoriya (ixtiyoriy)</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Ota kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asosiy kategoriya</SelectItem>
                  {rootCategories.flatMap((category) => renderCategoryOption(category))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategoriya nomi (O'zbekcha)</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Masalan: Elektr jihozlar yoki Elektr/Konditsioner"
              />
              <p className="text-xs text-muted-foreground">Sub-kategoriya yaratish uchun "/" belgisidan foydalaning</p>
            </div>

            <div className="space-y-2">
              <Label>Kategoriya nomi (Ruscha)</Label>
              <Input
                value={newCategoryNameRu}
                onChange={(e) => setNewCategoryNameRu(e.target.value)}
                placeholder="Электрические приборы"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                Bekor qilish
              </Button>
              <Button type="button" onClick={handleCreateCategory} disabled={loading || !newCategoryName.trim()}>
                {loading ? "Yaratilmoqda..." : "Yaratish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
