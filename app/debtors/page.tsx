"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Search,
  PhoneCall,
  Clock,
  CreditCard,
  AlertTriangle,
  User,
  Calendar,
  Plus,
  CheckCircle,
  History,
  MessageSquare,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { DebtPaymentDialog } from "@/components/debtors/debt-payment-dialog"
import { ExtendDebtDialog } from "@/components/debtors/extend-debt-dialog"
import { toast } from "sonner"

interface Debtor {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  borrowed_period: number
  borrowed_additional_period: number
  borrowed_updated_at: string
  created_at: string
  days_remaining: number
  is_overdue: boolean
  is_payed: boolean
  status: string
  // Add these if they are relevant for previous debtors display
  updated_at: string
  days_late?: number // Optional for previous debtors
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [previousDebtors, setPreviousDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("current")
  const [sendingSMS, setSendingSMS] = useState(false)

  // Dialog states
  const [paymentDebtor, setPaymentDebtor] = useState<Debtor | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [extendDebtor, setExtendDebtor] = useState<Debtor | null>(null)
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false)

  useEffect(() => {
    fetchDebtors()
    fetchPreviousDebtors()
  }, [])

  const fetchDebtors = async () => {
    setLoading(true) // Set loading true when starting to fetch
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("is_borrowed", true)
        .eq("is_payed", false)
        .order("borrowed_updated_at", { ascending: true })

      if (error) throw error

      // Calculate remaining days and overdue status
      const processedDebtors = (data || []).map((order) => {
        const borrowedDate = new Date(order.borrowed_updated_at)
        const totalPeriod = order.borrowed_period + (order.borrowed_additional_period || 0)
        const dueDate = new Date(borrowedDate.getTime() + totalPeriod * 24 * 60 * 60 * 1000)
        const today = new Date()
        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
        const isOverdue = daysRemaining < 0

        return {
          ...order,
          days_remaining: daysRemaining,
          is_overdue: isOverdue,
        }
      })

      setDebtors(processedDebtors)
    } catch (error) {
      console.error("Error fetching debtors:", error)
      toast.error("Joriy qarzdorlarni yuklashda xatolik yuz berdi.")
    } finally {
      setLoading(false)
    }
  }

  const fetchPreviousDebtors = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("is_borrowed", true)
        .eq("is_payed", true)
        .order("updated_at", { ascending: false })
        .limit(100)

      if (error) throw error

      // Calculate debt info for previous debtors
      const processedPreviousDebtors = (data || []).map((order) => {
        const borrowedDate = new Date(order.borrowed_updated_at)
        const totalPeriod = order.borrowed_period + (order.borrowed_additional_period || 0)
        const dueDate = new Date(borrowedDate.getTime() + totalPeriod * 24 * 60 * 60 * 1000)
        const paymentDate = new Date(order.updated_at)
        const daysLate = Math.ceil((paymentDate.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))

        return {
          ...order,
          days_remaining: 0,
          is_overdue: daysLate > 0, // In this context, is_overdue means they paid late
          days_late: Math.max(0, daysLate), // Ensure days_late is not negative
        }
      })

      setPreviousDebtors(processedPreviousDebtors)
    } catch (error) {
      console.error("Error fetching previous debtors:", error)
      toast.error("Oldingi qarzdorlarni yuklashda xatolik yuz berdi.")
    }
  }

  const filteredDebtors = debtors.filter(
    (debtor) =>
      debtor.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debtor.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debtor.customer_phone.includes(searchQuery),
  )

  const filteredPreviousDebtors = previousDebtors.filter(
    (debtor) =>
      debtor.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debtor.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debtor.customer_phone.includes(searchQuery),
  )

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
  }

  const handlePayDebt = (debtor: Debtor) => {
    setPaymentDebtor(debtor)
    setIsPaymentDialogOpen(true)
  }

  const handleExtendDebt = (debtor: Debtor) => {
    setExtendDebtor(debtor)
    setIsExtendDialogOpen(true)
  }

  const handleSendDebtReminders = async () => {
    setSendingSMS(true)
    try {
      const response = await fetch("/api/sms/send-debt-reminders", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`${result.totalDebtors} ta qarzdorga SMS yuborildi`)
        console.log("[v0] SMS results:", result.results)
      } else {
        toast.error("SMS yuborishda xatolik yuz berdi")
      }
    } catch (error) {
      console.error("[v0] Error sending SMS reminders:", error)
      toast.error("SMS yuborishda xatolik yuz berdi")
    } finally {
      setSendingSMS(false)
    }
  }

  const getDebtorStatusColor = (debtor: Debtor) => {
    if (debtor.is_payed) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    } else if (debtor.is_overdue) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    } else if (debtor.days_remaining <= 3) {
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    } else {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    }
  }

  const getDebtorStatusText = (debtor: Debtor) => {
    if (debtor.is_payed) {
      return "To'langan"
    } else if (debtor.is_overdue) {
      return `${Math.abs(debtor.days_remaining)} kun kechikdi`
    } else if (debtor.days_remaining === 0) {
      return "Bugun tugaydi"
    } else {
      return `${debtor.days_remaining} kun qoldi`
    }
  }

  // This function will be called when a debt payment is successfully processed in DebtPaymentDialog
  const handlePaymentSuccess = () => {
    toast.success("Qarz muvaffaqiyatli to'landi!")
    setIsPaymentDialogOpen(false) // Close the dialog
    fetchDebtors() // Re-fetch current debtors (to remove the paid one)
    fetchPreviousDebtors() // Re-fetch previous debtors (to add the newly paid one)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Qarzdorlar</h1>
          <p className="text-muted-foreground">
            Joriy: {debtors.length} ta, Oldingi: {previousDebtors.length} ta
          </p>
        </div>
        <Button
          onClick={handleSendDebtReminders}
          disabled={sendingSMS || debtors.length === 0}
          className="ios-button bg-blue-600 hover:bg-blue-700"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {sendingSMS ? "SMS yuborilmoqda..." : "Barcha qarzdorlarga SMS"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="current">Joriy qarzdorlar</TabsTrigger>
            <TabsTrigger value="previous">Oldingi qarzdorlar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="current">
          <div className="space-y-6">
            {/* Search */}
            <Card className="ios-card">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buyurtma raqami, mijoz nomi yoki telefon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="ios-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Jami qarzdorlar</p>
                      <p className="text-2xl font-bold text-foreground">{debtors.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="ios-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Kechikkanlar</p>
                      <p className="text-2xl font-bold text-red-600">{debtors.filter((d) => d.is_overdue).length}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="ios-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Jami qarz</p>
                      <p className="text-2xl font-bold text-foreground">
                        {debtors.reduce((sum, debtor) => sum + debtor.total_amount, 0).toLocaleString()} so'm
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Debtors List */}
            <div className="space-y-4">
              {filteredDebtors.map((debtor) => (
                <Card key={debtor.id} className="ios-card hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">#{debtor.order_number}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{debtor.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(debtor.borrowed_updated_at).toLocaleDateString("uz-UZ")}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge className={`${getDebtorStatusColor(debtor)} border-0 mb-2`}>
                              {getDebtorStatusText(debtor)}
                            </Badge>
                            <p className="text-lg font-bold">{debtor.total_amount.toLocaleString()} so'm</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Asosiy muddat:</span>
                              <span>{debtor.borrowed_period} kun</span>
                            </div>
                            {debtor.borrowed_additional_period > 0 && (
                              <div className="flex justify-between text-sm">
                                <span>Qo'shimcha muddat:</span>
                                <span>{debtor.borrowed_additional_period} kun</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-medium">
                              <span>Jami muddat:</span>
                              <span>{debtor.borrowed_period + (debtor.borrowed_additional_period || 0)} kun</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Telefon:</span>
                              <span>{debtor.customer_phone}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Holat:</span>
                              <Badge variant={debtor.is_overdue ? "destructive" : "secondary"} className="text-xs">
                                {debtor.is_overdue ? "Kechikkan" : "Faol"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCallCustomer(debtor.customer_phone)}
                              className="ios-button bg-blue-600 hover:bg-blue-700"
                            >
                              <PhoneCall className="h-3 w-3 mr-1" />
                              Qo'ng'iroq
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExtendDebt(debtor)}
                              className="ios-button bg-transparent"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Vaqt berish
                            </Button>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handlePayDebt(debtor)}
                            className="ios-button bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Qarz to'landi
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDebtors.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Qarzdorlar topilmadi</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha qarzdorlar mavjud emas"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="previous">
          <div className="space-y-6">
            {/* Search */}
            <Card className="ios-card">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Oldingi qarzdorlarni qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Previous Debtors List */}
            <div className="space-y-4">
              {filteredPreviousDebtors.map((debtor) => (
                <Card key={debtor.id} className="ios-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">#{debtor.order_number}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{debtor.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                To'langan: {new Date(debtor.updated_at).toLocaleDateString("uz-UZ")}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0 mb-2">
                              To'langan
                            </Badge>
                            <p className="text-lg font-bold">{debtor.total_amount.toLocaleString()} so'm</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Qarz muddati:</span>
                              <span>{debtor.borrowed_period + (debtor.borrowed_additional_period || 0)} kun</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Qarz olgan sana:</span>
                              <span>{new Date(debtor.borrowed_updated_at).toLocaleDateString("uz-UZ")}</span>
                            </div>
                            {debtor.days_late !== undefined &&
                              debtor.days_late > 0 && ( // Ensure days_late is checked for existence and value
                                <div className="flex justify-between text-sm text-red-600">
                                  <span>Kechikish:</span>
                                  <span>{debtor.days_late} kun</span>
                                </div>
                              )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Telefon:</span>
                              <span>{debtor.customer_phone}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Holat:</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Yakunlangan
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCallCustomer(debtor.customer_phone)}
                            className="ios-button bg-transparent"
                          >
                            <PhoneCall className="h-3 w-3 mr-1" />
                            Qo'ng'iroq
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPreviousDebtors.length === 0 && (
              <Card className="ios-card">
                <CardContent className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Oldingi qarzdorlar topilmadi</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Qidiruv bo'yicha natija yo'q" : "Hozircha oldingi qarzdorlar mavjud emas"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ModderSheet
            data={activeTab === "previous" ? previousDebtors : debtors}
            onDataChange={activeTab === "previous" ? setPreviousDebtors : setDebtors}
            tableName="debtors" // This should probably be "orders" since your data comes from "orders" table.
            onRefresh={() => {
              fetchDebtors()
              fetchPreviousDebtors()
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DebtPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        debtor={paymentDebtor}
        onSuccess={handlePaymentSuccess} // Use the new handler here
      />

      <ExtendDebtDialog
        open={isExtendDialogOpen}
        onOpenChange={setIsExtendDialogOpen}
        debtor={extendDebtor}
        onSuccess={fetchDebtors} // Only need to re-fetch current debtors for extension
      />
    </div>
  )
}
