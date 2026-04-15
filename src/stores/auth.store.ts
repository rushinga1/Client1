import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'user' | 'admin' | 'worker' | 'client' | string
  avatar?: string
  memberSince?: string
  createdAt?: string
  lastLogin?: string
  joinedDate?: string
  status?: string
  plan?: string
  district?: string
  sector?: string
  cell?: string
  village?: string
  houseNumber?: string
  category?: string
  metrics?: {
    paymentRate: number
    totalPaid: number
    rating: number
  }
  area?: {
    district: string
    sector: string
    cell: string
    houseNum: string
  }
  unreadMessagesCount?: number
  stats?: {
    totalPaid: number
    totalDebt: number
    weeksOwed: number
    paymentRate: number
  }
  assignedWorker?: {
    name: string
    phone: string
    distance?: string
    area?: string
    eta?: string
  }
  badges?: {
    debts: number
  }
  systemUpdates?: Array<{
    id: string
    title: string
    content: string
    date: string
    type: 'feature' | 'update' | 'alert' | string
    author?: string
  }>
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = ref(false)
  const isLoading = ref(false)
  const error = ref('')
  const pollingId = ref<any>(null)

  const loginWithEmail = async (email: string) => {
    isLoading.value = true
    try {
      const response = await fetch(`${API_BASE}/api/users/me?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        
        // Map database location fields to the UI 'area' structure used by components
        const area = data.district ? {
          district: data.district,
          sector: data.sector || 'N/A',
          cell: data.cell || 'N/A',
          houseNum: data.houseNumber || 'N/A'
        } : undefined
        
        const assignedWorker = data.registeredBy ? {
          name: data.registeredBy.name || `${data.registeredBy.firstName} ${data.registeredBy.lastName}`,
          phone: data.registeredBy.phone || 'N/A'
        } : undefined

        user.value = {
          ...data,
          lastLogin: new Date().toISOString(),
          area,
          assignedWorker,
          plan: data.category === 'rich' ? 'Premium Plan' : 'Standard Plan',
          metrics: {
            paymentRate: 0,
            totalPaid: 0,
            rating: 0
          }
        }
        
        isLoggedIn.value = true
        localStorage.setItem('agruni_user', JSON.stringify(user.value))
        localStorage.setItem('agruni_loggedin', 'true')
      }
    } catch (err) {
      console.error('Failed to log in with DB:', err)
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('agruni_user')
    localStorage.removeItem('agruni_loggedin')
    return true
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user.value) return false
    isLoading.value = true
    error.value = ''

    try {
      const response = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.value.email, ...updates })
      })

      if (response.ok) {
        const data = await response.json()
        user.value = { ...user.value, ...data }
        localStorage.setItem('agruni_user', JSON.stringify(user.value))
        
        // Fetch stats immediately after update
        await fetchStats()
        
        return true
      }
      return false
    } catch (err) {
      error.value = 'Profile update failed'
      console.error('Profile update error:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const checkAuth = () => {
    try {
      const stored = localStorage.getItem('agruni_user')
      if (stored) {
        user.value = JSON.parse(stored)
      }
    } catch (err) {
      console.error('Auth check error:', err)
      localStorage.removeItem('agruni_user')
    }
  }

  const fetchStats = async () => {
    if (!user.value?.id) return
    try {
      const response = await fetch(`${API_BASE}/api/system/pulse?userId=${user.value.id}&role=${user.value.role}`)

      if (response.ok) {
        const data = await response.json()
        if (user.value) {
          const { useToast } = await import('../composables/useToast')
          const { usePaymentStore } = await import('./payment.store')
          const toast = useToast()
          const paymentStore = usePaymentStore()

          // --- Change Detection for Interactivity ---
          
          // 1. New Messages
          if (data.unreadMessagesCount > (user.value.unreadMessagesCount || 0)) {
            toast.info('You have new messages from your worker!')
          }

          // 2. Debt Verification (Debt decreased)
          if (data.stats?.totalDebt < (user.value.stats?.totalDebt || 0)) {
            toast.success('Your payment has been verified and updated!')
            // Refresh payment lists across all pages
            paymentStore.initializePayments()
          }
          
          // 3. New Weekly Debt (Debt increased)
          if (data.stats?.totalDebt > (user.value.stats?.totalDebt || 0)) {
            toast.warning('New weekly service charge added to your account.')
            paymentStore.initializePayments()
          }

          // 4. Worker Assignment
          if (data.user?.assignedWorker?.name && !user.value.assignedWorker?.name) {
            toast.info(`Worker ${data.user.assignedWorker.name} has been assigned to your area!`)
          }

          // Update local state
          user.value.unreadMessagesCount = data.unreadMessagesCount
          user.value.stats = data.stats
          user.value.badges = data.badges
          user.value.systemUpdates = data.systemUpdates || []
          
          if (data.user?.assignedWorker) {
            user.value.assignedWorker = data.user.assignedWorker
          }

          // Update in storage
          localStorage.setItem('agruni_user', JSON.stringify(user.value))
        }
      }
    } catch (err) {
      console.error('Fetch stats (pulse) error:', err)
    }
  }

  const startPolling = (intervalMs = 15000) => {
    if (pollingId.value) return
    // Initial fetch
    fetchStats()
    pollingId.value = setInterval(fetchStats, intervalMs)
    console.log('[Auth] Polling started')
  }

  const stopPolling = () => {
    if (pollingId.value) {
      clearInterval(pollingId.value)
      pollingId.value = null
      console.log('[Auth] Polling stopped')
    }
  }

  const init = () => {
    checkAuth()
    const loggedIn = localStorage.getItem('agruni_loggedin') === 'true'
    if (loggedIn && user.value) {
      isLoggedIn.value = true
      startPolling() // Activate real-time sync for existing sessions
    } else {
      user.value = null
      isLoggedIn.value = false
      stopPolling()
    }
  }

  return {
    user,
    isLoggedIn,
    isLoading,
    error,
    loginWithEmail,
    logout,
    updateProfile,
    init,
    fetchStats,
    startPolling,
    stopPolling
  }
})
