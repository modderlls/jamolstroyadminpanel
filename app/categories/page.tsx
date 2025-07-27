"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Search,
  Loader2,
  Package,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"

interface Category {
  id: string
  name_uz: string
  name_ru: string
  parent_id: string | null
  level: number
  path: string
  created_at: string
  updated_at: string
  children?: Category[]
  products_count?: number
}

// Enhanced transliteration maps
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("tree")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [selectedParent, setSelectedParent] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryNameRu, setNewCategoryNameRu] = useState("")
  const [dialogLoading, setDialogLoading] = useState(false)
  const [moveToCategory, setMoveToCategory] = useState<string>("")

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)

      // Fetch categories with product counts
      const { data: categoriesData, error } = await supabase.from("categories").select("*").order("name_uz")

      if (error) throw error

      // Get product counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (cat) => {
          const { data: productsCount } = await supabase.rpc("get_category_products_count", { category_uuid: cat.id })

          return {
            ...cat,
            products_count: productsCount || 0,
          }
        }),
      )

      setCategories(categoriesWithCounts)
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildCategoryTree = (cats: Category[], parentId: string | null = null): Category[] => {
    return cats
      .filter((cat) => cat.parent_id === parentId)
      .map((cat) => ({
        ...cat,
        children: buildCategoryTree(cats, cat.id),
      }))
      .sort((a, b) => a.name_uz.localeCompare(b.name_uz))
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setDialogLoading(true)
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([
          {
            name_uz: newCategoryName.trim(),
            name_ru: newCategoryNameRu.trim() || newCategoryName.trim(),
            parent_id: selectedParent || null,
          },
        ])
        .select()
        .single()

      if (error) throw error

      await fetchCategories()
      setIsCreateDialogOpen(false)
      setNewCategoryName("")
      setNewCategoryNameRu("")
      setSelectedParent("")
    } catch (error) {
      console.error("Error creating category:", error)
      alert("Kategoriya yaratishda xatolik yuz berdi")
    } finally {
      setDialogLoading(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return

    setDialogLoading(true)
    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name_uz: newCategoryName.trim(),
          name_ru: newCategoryNameRu.trim() || newCategoryName.trim(),
          parent_id: selectedParent || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCategory.id)

      if (error) throw error

      await fetchCategories()
      setIsEditDialogOpen(false)
      setEditingCategory(null)
      setNewCategoryName("")
      setNewCategoryNameRu("")
      setSelectedParent("")
    } catch (error) {
      console.error("Error updating category:", error)
      alert("Kategoriyani yangilashda xatolik yuz berdi")
    } finally {
      setDialogLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    setDialogLoading(true)
    try {
      if (moveToCategory) {
        // Move products to selected category first
        const { error: moveError } = await supabase
          .from("products")
          .update({ category_id: moveToCategory })
          .eq("category_id", deletingCategory.id)

        if (moveError) throw moveError
      }

      // Delete the category (cascade will handle subcategories)
      const { error } = await supabase.from("categories").delete().eq("id", deletingCategory.id)

      if (error) throw error

      await fetchCategories()
      setIsDeleteDialogOpen(false)
      setDeletingCategory(null)
      setMoveToCategory("")
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("Kategoriyani o'chirishda xatolik yuz berdi")
    } finally {
      setDialogLoading(false)
    }
  }

  const openCreateDialog = (parentId?: string) => {
    setSelectedParent(parentId || "")
    setNewCategoryName("")
    setNewCategoryNameRu("")
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name_uz)
    setNewCategoryNameRu(category.name_ru)
    setSelectedParent(category.parent_id || "")
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setDeletingCategory(category)
    setMoveToCategory("")
    setIsDeleteDialogOpen(true)
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedItems(newExpanded)
  }

  const renderTreeItem = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedItems.has(category.id)
    const indent = level * 24

    return (
      <div key={category.id} className="fade-in">
        <div className={`tree-item ${level > 0 ? "tree-indent" : ""}`} style={{ paddingLeft: `${indent}px` }}>
          <div className="flex items-center gap-3 flex-1">
            {hasChildren ? (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpanded(category.id)}>
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            ) : (
              <div className="w-6" />
            )}

            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500" />
              )
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{category.name_uz}</span>
                {category.products_count > 0 && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {category.products_count}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{category.name_ru}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openCreateDialog(category.id)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(category)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => openDeleteDialog(category)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="slide-in">{category.children?.map((child) => renderTreeItem(child, level + 1))}</div>
        )}
      </div>
    )
  }

  // Enhanced search with transliteration
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const searchCyrillic = transliterate(searchQuery, true)
    const searchLatin = transliterate(searchQuery, false)

    const nameUz = cat.name_uz.toLowerCase()
    const nameRu = cat.name_ru.toLowerCase()

    return (
      nameUz.includes(searchLower) ||
      nameUz.includes(searchCyrillic) ||
      nameUz.includes(searchLatin) ||
      nameRu.includes(searchLower) ||
      nameRu.includes(searchCyrillic) ||
      nameRu.includes(searchLatin)
    )
  })

  const rootCategories = buildCategoryTree(filteredCategories, null)

  if (loading) {
    return (
      <div className="responsive-container space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="responsive-container space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kategoriyalar</h1>
          <p className="text-muted-foreground">Jami {categories.length} ta kategoriya</p>
        </div>
        <Button onClick={() => openCreateDialog()} className="ios-button">
          <Plus className="h-4 w-4 mr-2" />
          Yangi kategoriya
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tree">Daraxt ko'rinishi</TabsTrigger>
          <TabsTrigger value="table">Jadval</TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <div className="space-y-6">
            {/* Search */}
            <Card className="ios-card">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Kategoriya qidirish (Kiril/Lotin)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tree View */}
            <Card className="ios-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5" />
                  Kategoriyalar daraxti
                </CardTitle>
                <CardDescription>Kategoriyalarni daraxt ko'rinishida boshqaring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {rootCategories.length > 0 ? (
                  <div className="category-tree">{rootCategories.map((category) => renderTreeItem(category))}</div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Kategoriyalar topilmadi</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha kategoriyalar mavjud emas"}
                    </p>
                    <Button onClick={() => openCreateDialog()} className="mt-4 ios-button">
                      <Plus className="h-4 w-4 mr-2" />
                      Birinchi kategoriyani yaratish
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet
            data={categories}
            onDataChange={setCategories}
            tableName="categories"
            onRefresh={fetchCategories}
          />
        </TabsContent>
      </Tabs>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi kategoriya yaratish</DialogTitle>
            <DialogDescription>Yangi kategoriya yoki sub-kategoriya yarating</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ota kategoriya (ixtiyoriy)</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Asosiy kategoriya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asosiy kategoriya</SelectItem>
                  {categories
                    .filter((cat) => cat.parent_id === null)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name_uz}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategoriya nomi (O'zbekcha)</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Masalan: Elektr jihozlar"
              />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={dialogLoading}
              >
                Bekor qilish
              </Button>
              <Button type="button" onClick={handleCreateCategory} disabled={dialogLoading || !newCategoryName.trim()}>
                {dialogLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  "Yaratish"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyani tahrirlash</DialogTitle>
            <DialogDescription>Kategoriya ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ota kategoriya (ixtiyoriy)</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Asosiy kategoriya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asosiy kategoriya</SelectItem>
                  {categories
                    .filter((cat) => cat.parent_id === null && cat.id !== editingCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name_uz}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategoriya nomi (O'zbekcha)</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Masalan: Elektr jihozlar"
              />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={dialogLoading}
              >
                Bekor qilish
              </Button>
              <Button type="button" onClick={handleEditCategory} disabled={dialogLoading || !newCategoryName.trim()}>
                {dialogLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yangilanmoqda...
                  </>
                ) : (
                  "Yangilash"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Kategoriyani o'chirish
            </DialogTitle>
            <DialogDescription>
              Bu amal qaytarib bo'lmaydi. Kategoriya va uning barcha sub-kategoriyalari o'chiriladi.
            </DialogDescription>
          </DialogHeader>

          {deletingCategory && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">O'chiriladigan kategoriya:</h4>
                <p className="text-sm">
                  <strong>{deletingCategory.name_uz}</strong>
                  {deletingCategory.products_count > 0 && (
                    <span className="text-muted-foreground"> ({deletingCategory.products_count} ta mahsulot)</span>
                  )}
                </p>
              </div>

              {deletingCategory.products_count > 0 && (
                <div className="space-y-2">
                  <Label>Mahsulotlarni qaysi kategoriyaga ko'chirish kerak?</Label>
                  <Select value={moveToCategory} onValueChange={setMoveToCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategoriyani tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((cat) => cat.id !== deletingCategory.id)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name_uz}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Agar kategoriya tanlanmasa, mahsulotlar ota kategoriyaga ko'chiriladi
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={dialogLoading}
                >
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteCategory}
                  disabled={dialogLoading || (deletingCategory.products_count > 0 && !moveToCategory)}
                >
                  {dialogLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      O'chirilmoqda...
                    </>
                  ) : (
                    "O'chirish"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
