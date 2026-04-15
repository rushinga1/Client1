import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth.store'

export interface PaymentRecord {
  id: string
  date: string
  amount: number
  service: string
  method: 'MTN MoMo' | 'Airtel Money' | 'Visa' | 'Mastercard' | string
  status: 'completed' | 'pending' | 'failed' | string
  transactionId: string | null
}

export interface DebtInfo {
  totalDebt: number
  weeksOwed: number
  monthsBehind: number
  isBanned: boolean
  nextPaymentAmount: number
  nextPaymentDate: string
  overdueWeeks: any[]
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const usePaymentStore = defineStore('payment', () => {
  const history = ref<PaymentRecord[]>([])
  const trends = ref<{month: string, amount: number}[]>([])
  const weeks = ref<any[]>([])
  const isLoading = ref(false)

  // Actions
  const fetchPayments = async () => {
    isLoading.value = true
    try {
      const authStore = useAuthStore()
      const user = authStore.user
      const userId = user ? user.id : ''

      const response = await fetch(`${API_BASE}/api/payments?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        history.value = data.map((p: any) => ({
          ...p,
          date: new Date(p.date).toISOString().split('T')[0]
        }))

        // Recalculate trends based on history
        const calcTrends: Record<string, number> = {}
        history.value.forEach(p => {
          const m = new Date(p.date).toLocaleString('default', { month: 'short', year: 'numeric' })
          calcTrends[m] = (calcTrends[m] || 0) + p.amount
        })
        trends.value = Object.entries(calcTrends).map(([month, amount]) => ({ month, amount }))
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      isLoading.value = false
    }
  }

  const addPayment = async (payment: Omit<PaymentRecord, 'id' | 'status' | 'transactionId' | 'date'>) => {
    try {
      const authStore = useAuthStore()
      const user = authStore.user

      const response = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, userId: user ? user.id : null })
      })

      if (response.ok) {
        const newPayment = await response.json()
        history.value.unshift({
          ...newPayment,
          date: new Date(newPayment.date).toISOString().split('T')[0]
        })
        
        const currentMonth = new Date().toLocaleString('default', { month: 'short', year: 'numeric' })
        const trendIndex = trends.value.findIndex(t => t.month === currentMonth)
        if (trendIndex !== -1) {
          trends.value[trendIndex].amount += payment.amount
        } else {
          trends.value.push({ month: currentMonth, amount: payment.amount })
        }
      }
    } catch (error) {
      console.error('Failed to add payment:', error)
    }
  }

  // ── Real Billing Logic ──
  const paidWeeks = ref<any[]>([])
  const recentTransactions = ref<any[]>([])

  const fetchBilling = async () => {
    const authStore = useAuthStore()
    if (!authStore.user?.id) return
    
    try {
      const response = await fetch(`${API_BASE}/api/client/billing?userId=${authStore.user.id}`)
      if (response.ok) {
        weeks.value = await response.json()
      }
    } catch (err) {
      console.error('Fetch billing error:', err)
    }
  }

  const markWeeksAsPaid = async (weekIds: number[]) => {
    const authStore = useAuthStore()
    if (!authStore.user?.id) return

    // Calculate total
    const selectedWeeksData = weeks.value.filter(w => weekIds.includes(w.id))
    const totalAmount = selectedWeeksData.reduce((sum, w) => sum + w.amount, 0)

    try {
       await addPayment({
         amount: totalAmount,
         service: `Waste Collection - ${selectedWeeksData.length} weeks`,
         method: 'MTN MoMo'
       })
       // Refresh both lists
       await fetchPayments()
       await fetchBilling()
       return true
    } catch (err) {
       console.error('Mark weeks paid error:', err)
       return false
    }
  }

  const processPayment = async (paymentData: { 
    amount: number, 
    method: string, 
    phoneNumber?: string, 
    weekIds?: number[] 
  }): Promise<{ success: boolean, transactionId?: string }> => {
    if (paymentData.weekIds && paymentData.weekIds.length > 0) {
      const success = await markWeeksAsPaid(paymentData.weekIds)
      return { success: success || false, transactionId: success ? 'TX-W-' + Date.now() : undefined }
    }
    
    // Generic payment processing
    try {
      await addPayment({
        amount: paymentData.amount,
        service: 'Service Payment',
        method: paymentData.method
      })
      return { success: true, transactionId: 'TX-' + Date.now() }
    } catch (err) {
      console.error('Process payment error:', err)
      return { success: false }
    }
  }

  const initializePayments = async () => {
    isLoading.value = true
    try {
      await Promise.all([
        fetchPayments(),
        fetchBilling()
      ])
      
      recentTransactions.value = history.value.map(p => ({
        id: p.id,
        amount: p.amount,
        createdAt: p.date,
        status: p.status,
        method: p.method,
        referenceCode: p.transactionId
      }))
    } finally {
      isLoading.value = false
    }
  }

  return {
    history,
    trends,
    weeks,
    isLoading,
    fetchPayments,
    addPayment,
    markWeeksAsPaid,
    paidWeeks,
    recentTransactions,
    initializePayments,
    processPayment
  }
})
