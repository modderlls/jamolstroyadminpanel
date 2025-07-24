"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, PhoneCall, Clock, CreditCard, AlertTriangle, User, Calendar, Plus, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModderSheet } from "@/components/moddersheet/modder-sheet"
import { DebtPaymentDialog } from "@/components/debtors/debt-payment-dialog"
import { ExtendDebtDialog } from "@/components/debtors/extend-debt-dialog"

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
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("main")

  // Dialog states
  const [paymentDebtor, setPaymentDebtor] = useState<Debtor | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [extendDebtor, setExtendDebtor] = useState<Debtor | null>(null)
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false)

  useEffect(() => {
    fetchDebtors()
  }, [])

  const fetchDebtors = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  const filteredDebtors = debtors.filter(
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

  const getDebtorStatusColor = (debtor: Debtor) => {
    if (debtor.is_overdue) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    } else if (debtor.days_remaining <= 3) {
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    } else {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    }
  }

  const getDebtorStatusText = (debtor: Debtor) => {
    if (debtor.is_overdue) {
      return `${Math.abs(debtor.days_remaining)} kun kechikdi`
    } else if (debtor.days_remaining === 0) {
      return "Bugun tugaydi"
    } else {
      return `${debtor.days_remaining} kun qoldi`
    }
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
          <p className="text-muted-foreground">Jami {debtors.length} ta qarzdor</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="main">Asosiy</TabsTrigger>
          <TabsTrigger value="table">Jadval</TabsTrigger>
        </TabsList>

        <TabsContent value="main">
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

            {/* Debtors List */}
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

        <TabsContent value="table">
          <ModderSheet data={debtors} onDataChange={setDebtors} tableName="debtors" onRefresh={fetchDebtors} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DebtPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        debtor={paymentDebtor}
        onSuccess={fetchDebtors}
      />

      <ExtendDebtDialog
        open={isExtendDialogOpen}
        onOpenChange={setIsExtendDialogOpen}
        debtor={extendDebtor}
        onSuccess={fetchDebtors}
      />
    </div>
  )
}
