"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog" // DialogFooter qo'shildi
import { Checkbox } from "@/components/ui/checkbox" // Checkbox komponenti qo'shildi
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
  is_active: boolean // is_active ustuni qo'shildi
  children?: Category[]
  products_count?: number
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [selectedParent, setSelectedParent] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryNameRu, setNewCategoryNameRu] = useState("")
  const [dialogLoading, setDialogLoading] = useState(false)

  // DELETE Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleteProductsToo, setDeleteProductsToo] = useState(false) // Mahsulotlarni ham o'chirish checkbox holati
  const [deleteDialogLoading, setDeleteDialogLoading] = useState(false) // Delete dialog uchun loading

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)

      // Fetch categories with product counts and filter by is_active = true
      const { data: categoriesData, error } = await supabase
        .from("categories")
        .select(`
          *,
          products(count)
        `)
        .eq("is_active", true) // Faqat faol kategoriyalarni olib kelish
        .order("name_uz")

      if (error) throw error

      // Process categories and build tree structure
      const processedCategories = (categoriesData || []).map((cat) => ({
        ...cat,
        products_count: cat.products?.[0]?.count || 0,
      })) as Category[] // Type assertion for clarity

      setCategories(processedCategories)
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
            is_active: true, // Yangi kategoriya sukut bo'yicha faol bo'lsin
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

  // handleDeleteCategory endi faqat dialog ochadi
  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
    setDeleteProductsToo(false) // Har safar yangidan boshlash
    setIsDeleteDialogOpen(true)
  }

  // Yangi funksiya: o'chirishni tasdiqlash va bajarish
  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return

    setDeleteDialogLoading(true)
    try {
      // Kategoriyani is_active = false qilish
      const { error: categoryUpdateError } = await supabase
        .from("categories")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", deletingCategory.id)

      if (categoryUpdateError) throw categoryUpdateError

      // Agar mahsulotlari ham o'chirilishi kerak bo'lsa
      if (deleteProductsToo) {
        const { error: productsUpdateError } = await supabase
          .from("products") // Mahsulotlar jadvali nomi
          .update({ is_available: false})
          .eq("category_id", deletingCategory.id) // Kategoriya ID'si bo'yicha bog'langan mahsulotlarni topish

        if (productsUpdateError) throw productsUpdateError
      }

      await fetchCategories() // Ro'yxatni yangilash
      setIsDeleteDialogOpen(false) // Dialogni yopish
      setDeletingCategory(null)
      setDeleteProductsToo(false)
      alert(`"${deletingCategory.name_uz}" kategoriyasi muvaffaqiyatli arxivlandi.`);
    } catch (error) {
      console.error("Error archiving category:", error)
      alert("Kategoriyani arxivlashda xatolik yuz berdi")
    } finally {
      setDeleteDialogLoading(false)
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
      <div key={category.id}>
        <div className={`tree-item ${level > 0 ? "tree-indent" : ""}`} style={{ paddingLeft: `${indent}px` }}>
          <div className="flex items-center gap-2 flex-1">
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

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.name_uz}</span>
                {category.products_count !== undefined && category.products_count > 0 && ( // products_count ni tekshirish
                  <Badge variant="secondary" className="text-xs">
                    {category.products_count}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{category.name_ru}</p>
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
              onClick={() => handleDeleteCategory(category)} // Yangi handleDeleteCategory ni chaqiramiz
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && <div>{category.children?.map((child) => renderTreeItem(child, level + 1))}</div>}
      </div>
    )
  }

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name_uz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.name_ru.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const rootCategories = buildCategoryTree(filteredCategories, null)

  if (loading) {
    return (
      <div className="p-6 space-y-6">
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
    <div className="p-6 space-y-6 bg-background min-h-screen">
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
           
        </TabsList>

        <TabsContent value="tree">
          <div className="space-y-6">
            {/* Search */}
            <Card className="ios-card">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Kategoriya qidirish..."
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
                  rootCategories.map((category) => renderTreeItem(category))
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
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Asosiy kategoriya</option>
                {categories
                  .filter((cat) => cat.parent_id === null)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_uz}
                    </option>
                  ))}
              </select>
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

            <DialogFooter>
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
            </DialogFooter>
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
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Asosiy kategoriya</option>
                {categories
                  .filter((cat) => cat.parent_id === null && cat.id !== editingCategory?.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_uz}
                    </option>
                  ))}
              </select>
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

            <DialogFooter>
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
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyani o'chirish</DialogTitle>
            <DialogDescription>
              Siz `"{deletingCategory?.name_uz}"` kategoriyasini arxivlamoqchisiz.
              Ushbu kategoriya endi ko'rinmaydi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="deleteProducts"
              checked={deleteProductsToo}
              onCheckedChange={(checked) => setDeleteProductsToo(Boolean(checked))}
            />
            <label
              htmlFor="deleteProducts"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ushbu kategoriya bilan bog'liq mahsulotlarni ham o'chirish (arxivlash)
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteDialogLoading}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteCategory}
              disabled={deleteDialogLoading}
            >
              {deleteDialogLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  O'chirilmoqda...
                </>
              ) : (
                "Arxivlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
