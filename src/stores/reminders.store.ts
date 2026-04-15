import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'

export interface Reminder {
  id: string
  title: string
  description: string
  date: string
  type: 'payment' | 'collection'
  recurring?: boolean
  priority?: 'low' | 'medium' | 'high'
  userId?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const useRemindersStore = defineStore('reminders', {
  state: () => ({
    reminders: [] as Reminder[],
    isLoading: false
  }),

  actions: {
    async fetchReminders() {
      this.isLoading = true
      try {
        const authStore = useAuthStore()
        const user = authStore.user
        const userId = user ? user.id : ''
        
        const response = await fetch(`${API_BASE}/api/reminders?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          this.reminders = data.map((r: any) => ({
            ...r,
            date: new Date(r.date).toISOString().split('T')[0] // formats back to YYYY-MM-DD
          }))
        }
      } catch (error) {
        console.error('Failed to fetch reminders:', error)
      } finally {
        this.isLoading = false
      }
    },

    async addReminder(reminder: Omit<Reminder, 'id'>) {
      try {
        const authStore = useAuthStore()
        const user = authStore.user
        
        const response = await fetch(`${API_BASE}/api/reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...reminder, userId: user ? user.id : null })
        })
        
        if (response.ok) {
          const newReminder = await response.json()
          this.reminders.push({
            ...newReminder,
            date: new Date(newReminder.date).toISOString().split('T')[0]
          })
        }
      } catch (error) {
        console.error('Failed to add reminder:', error)
      }
    },

    updateReminder(id: string, updates: Partial<Reminder>) {
      // For future: make a PUT request. Keeping local array update for instant UI feedback.
      const index = this.reminders.findIndex((r: Reminder) => r.id === id)
      if (index !== -1) {
        this.reminders[index] = { ...this.reminders[index], ...updates }
      }
    },

    async deleteReminder(id: string) {
      try {
        const response = await fetch(`${API_BASE}/api/reminders/${id}`, { method: 'DELETE' })
        if (response.ok) {
          this.reminders = this.reminders.filter((r: Reminder) => r.id !== id)
        }
      } catch (error) {
        console.error('Failed to delete reminder:', error)
      }
    },

    async snoozeReminder(id: string, days: number = 1) {
      const reminder = this.reminders.find((r: Reminder) => r.id === id)
      if (reminder) {
        const date = new Date(reminder.date)
        date.setDate(date.getDate() + days)
        reminder.date = date.toISOString().split('T')[0]
        // Optionally save back to API if PUT is implemented.
      }
    }
  }
})
