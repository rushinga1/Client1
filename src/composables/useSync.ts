import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth.store'
import { usePaymentStore } from '../stores/payment.store'
import { useRemindersStore } from '../stores/reminders.store'

export function useSync() {
  const authStore = useAuthStore()
  const paymentStore = usePaymentStore()
  const remindersStore = useRemindersStore()
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  let intervalId: any = null

  const pulse = async () => {
    if (!authStore.user?.id) return
    await authStore.fetchStats()
    
    // Refresh other stores if needed
    // await paymentStore.refresh()
  }

  onMounted(() => {
    pulse()
    intervalId = setInterval(pulse, 30000)
  })

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return {
    pulse
  }
}
