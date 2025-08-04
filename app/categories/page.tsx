"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)

      // Fetch categories with product counts
      const { data: categoriesData, error } = await supabase
        .from("categories")
        .select(`
          *,
          products(count)
        `)
        .order("name_uz")

      if (error) throw error

      // Process categories and build tree structure
      const processedCategories = (categoriesData || []).map((cat) => ({
        ...cat,
        products_count: cat.products?.[0]?.count || 0,
      }))

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

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`"${category.name_uz}" kategoriyasini o'chirishni tasdiqlaysizmi?`)) {
      return
    }

    try {
      const { error } = await supabase.from("categories").delete().eq("id", category.id)

      if (error) throw error

      await fetchCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("Kategoriyani o'chirishda xatolik yuz berdi")
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
                {category.products_count > 0 && (
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
              onClick={() => handleDeleteCategory(category)}
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
    </div>
  )
}
