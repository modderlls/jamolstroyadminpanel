"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Plus, ChevronRight, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Category {
  id: string
  name_uz: string
  name_ru: string
  parent_id: string | null
  level: number
  path: string
  is_active: boolean
}

interface CategorySelectorProps {
  value: string | null // value null bo'lishi mumkinligini ko'rsatamiz
  onChange: (value: string | null) => void // onChange ham null qabul qilishini ko'rsatamiz
  categories: Category[]
  onCategoriesUpdate: () => void // Bu prop funksiya ekanligini belgilaymiz
}

export function CategorySelector({ value, onChange, categories, onCategoriesUpdate }: CategorySelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<string>("none") // Dastlabki qiymat "none"
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryNameRu, setNewCategoryNameRu] = useState("")
  const [loading, setLoading] = useState(false)

  // Hierarchical categories ni tuzish
  const buildCategoryTree = (cats: Category[], parentId: string | null = null): Category[] => {
    // Faqat is_active = true bo'lgan kategoriyalarni ko'rsatish uchun filtr
    return cats.filter((cat) => cat.parent_id === parentId && cat.is_active).sort((a, b) => a.name_uz.localeCompare(b.name_uz))
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
      const categoryParts = newCategoryName
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean)
      
      // selectedParent ni to'g'ri null ga aylantiramiz
      let currentParentId: string | null = selectedParent === "none" ? null : selectedParent 

      // onCategoriesUpdate() ni chaqirishdan oldin category ma'lumotlarini mahalliy yangilash
      // Bu `existingCategory` tekshiruvini ancha aniqroq qiladi
      // Qayd: Bu yechim yangi kategoriya yaratilganda `categories` propining bir zumda yangilanishini ta'minlaydi.
      // Lekin `onCategoriesUpdate` hali ham kerak, chunki u `CategorySelector` dan tashqaridagi global state'ni yangilaydi.
      let currentCategories = [...categories]; 

      for (let i = 0; i < categoryParts.length; i++) {
        const categoryNameUz = categoryParts[i]
        // Faqat oxirgi qism uchun ruscha nomni qo'llash
        const categoryNameRu = i === categoryParts.length - 1 ? (newCategoryNameRu.trim() || categoryNameUz) : categoryNameUz; 

        // Check if category already exists at this level using the most recent categories list
        const existingCategory = currentCategories.find(
          (cat) => cat.name_uz.toLowerCase() === categoryNameUz.toLowerCase() && cat.parent_id === currentParentId && cat.is_active,
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
              name_uz: categoryNameUz,
              name_ru: categoryNameRu,
              parent_id: currentParentId,
              is_active: true, // is_active ustunini to'g'ridan-to'g'ri belgilash
            },
          ])
          .select()
          .single()

        if (error) throw error

        currentParentId = data.id
        currentCategories.push(data as Category); // Yangi yaratilgan kategoriyani mahalliy ro'yxatga qo'shamiz

        // If this is the last category, select it
        if (i === categoryParts.length - 1) {
          onChange(data.id)
        }
      }

      // onCategoriesUpdate funksiyasining mavjudligini tekshiramiz
      if (typeof onCategoriesUpdate === 'function') {
        await onCategoriesUpdate(); // Asosiy kategoriyalar ro'yxatini to'liq yangilash
      } else {
        console.warn("onCategoriesUpdate prop is not a function or is missing.");
        // Agar onCategoriesUpdate funksiya bo'lmasa, ogohlantirish beramiz
        // Lekin xatoni appni to'xtatmaymiz, chunki kategoriya yaratildi
      }
      
      setIsDialogOpen(false)
      setNewCategoryName("")
      setNewCategoryNameRu("")
      setSelectedParent("none") // Dialogni yopgandan keyin "none" ga qaytaramiz
    } catch (error: any) {
      console.error("Error creating category:", error)
      alert("Kategoriya yaratishda xatolik yuz berdi: " + error.message) // Xato xabarini ko'rsatish
    } finally {
      setLoading(false)
    }
  }

  const rootCategories = buildCategoryTree(categories, null)

  return (
    <div className="space-y-2">
      <Label>Kategoriya</Label>
      <div className="flex gap-2">
        <Select
          value={value === null ? "unselected" : value} // Agar `value` null bo'lsa, "unselected" ni tanlaymiz
          onValueChange={(newValue) => onChange(newValue === "unselected" ? null : newValue)} // "unselected" bo'lsa null ga qaytaramiz
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Kategoriyani tanlang" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {/* Mana bu yerda xatoni tuzatdik: value="unselected" */}
            <SelectItem value="unselected">Kategoriya tanlanmagan</SelectItem>
            {rootCategories.flatMap((category) => renderCategoryOption(category))}
          </SelectContent>
        </Select>

        
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
                  {/* "none" qiymatini saqlab qolamiz, chunki bu Select componentining ichki value'si */}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                Bekor qilish
              </Button>
              <Button type="button" onClick={handleCreateCategory} disabled={loading || !newCategoryName.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  "Yaratish"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}