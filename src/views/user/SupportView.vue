<template>
  <div class="support-view">
    <div class="support-layout">
      <!-- Info Section -->
      <div class="info-section">
        <div class="support-header">
          <h1>Support Chat</h1>
          <p>Talk directly with your assigned worker at Agruni.</p>
        </div>

        <div v-if="worker" class="worker-card">
          <div class="worker-avatar">
            <Icon icon="ph:user-circle-gear" />
          </div>
          <div class="worker-info">
            <h3>{{ worker.name || (worker.firstName + ' ' + worker.lastName) }}</h3>
            <p>Your Assigned Worker</p>
            <div class="worker-contact">
              <Icon icon="ph:phone" /> {{ worker.phone || 'No phone listed' }}
            </div>
          </div>
        </div>
        
        <div class="emergency-contact">
          <h4>Need urgent help?</h4>
          <div class="contact-row">
            <Icon icon="ph:phone-call" />
            <span>+250 788 123 456 (HQ)</span>
          </div>
        </div>
      </div>

      <!-- Chat Section -->
      <div class="chat-section">
        <div v-if="loadingWorker" class="chat-placeholder">
          <Icon icon="ph:circle-notch" class="spin" />
          <p>Connecting to support...</p>
        </div>
        <div v-else-if="!worker" class="chat-placeholder chat-placeholder--error">
          <Icon icon="ph:warning-circle" />
          <p>No worker assigned yet. Please contact our head office.</p>
        </div>
        <div v-else class="chat-container">
          <div class="chat-messages" ref="chatContainer">
            <div v-for="msg in messages" :key="msg.id" 
                 class="message" :class="msg.senderId === clientId ? 'message--sent' : 'message--received'">
              <div class="message-bubble">
                <p>{{ msg.text }}</p>
                <div class="message-meta">
                  {{ formatTime(msg.createdAt) }}
                </div>
              </div>
            </div>
            
            <div v-if="messages.length === 0" class="chat-empty">
              <p>Type a message below to start a conversation with your worker.</p>
            </div>
          </div>

          <div class="chat-input-area">
            <input 
              v-model="newMessage" 
              placeholder="How can we help you today?" 
              @keyup.enter="sendMessage"
              :disabled="sending"
            />
            <button @click="sendMessage" :disabled="!newMessage.trim() || sending">
              <Icon :icon="sending ? 'ph:circle-notch' : 'ph:paper-plane-tilt-fill'" :class="{ 'spin': sending }" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '../../stores/auth.store'

const authStore = useAuthStore()
const clientId = computed(() => authStore.user?.id)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const worker = ref<any>(null)
const loadingWorker = ref(true)
const messages = ref<any[]>([])
const newMessage = ref('')
const sending = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
let pollTimer: any = null

const fetchWorker = async () => {
  if (!clientId.value) return
  loadingWorker.value = true
  try {
    const res = await fetch(`${API_BASE}/api/users/worker?clientId=${clientId.value}`)
    if (res.ok) {
      worker.value = await res.json()
      if (worker.value) fetchMessages()
    }
  } catch (err) {
    console.error('Fetch worker error:', err)
  } finally {
    loadingWorker.value = false
  }
}

const fetchMessages = async () => {
  if (!clientId.value || !worker.value) return
  try {
    const res = await fetch(`${API_BASE}/api/messages?userId1=${clientId.value}&userId2=${worker.value.id}`)
    if (res.ok) {
      const data = await res.json()
      // Only update if count changed or for initial load
      if (data.length !== messages.value.length) {
        messages.value = data
        await nextTick()
        scrollToBottom()
      }
    }
  } catch (err) {
    console.error('Fetch messages error:', err)
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !clientId.value || !worker.value || sending.value) return
  
  const text = newMessage.value
  newMessage.value = ''
  sending.value = true
  
  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: clientId.value,
        receiverId: worker.value.id,
        text
      })
    })
    
    if (res.ok) {
      const msg = await res.json()
      messages.value.push(msg)
      await nextTick()
      scrollToBottom()
    }
  } catch (err) {
    console.error('Send error:', err)
  } finally {
    sending.value = false
  }
}

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  fetchWorker()
  pollTimer = setInterval(fetchMessages, 5000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
@import '../../assets/styles/tokens.css';

.support-view {
  padding: var(--space-6);
  height: calc(100vh - 120px);
  max-width: 1200px;
  margin: 0 auto;
}

.support-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: var(--space-6);
  height: 100%;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.support-header h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary-600);
  margin-bottom: var(--space-2);
}

.support-header p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.worker-card {
  background: white;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-gray-200);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.worker-avatar {
  width: 50px;
  height: 50px;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.worker-info h3 {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  margin: 0;
}

.worker-info p {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: 0 0 var(--space-2);
}

.worker-contact {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-primary-600);
  font-weight: var(--font-semibold);
}

.emergency-contact {
  margin-top: auto;
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
}

.emergency-contact h4 {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.contact-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

/* Chat Section */
.chat-section {
  background: white;
  border-radius: var(--radius-2xl);
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: #fcfdfe;
}

.message {
  max-width: 80%;
  display: flex;
}

.message--sent {
  align-self: flex-end;
}

.message--received {
  align-self: flex-start;
}

.message-bubble {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-xl);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.message--sent .message-bubble {
  background: var(--color-primary-600);
  color: white;
  border-bottom-right-radius: var(--radius-xs);
}

.message--received .message-bubble {
  background: white;
  color: var(--color-text-primary);
  border: 1px solid var(--color-gray-200);
  border-bottom-left-radius: var(--radius-xs);
}

.message-meta {
  font-size: var(--text-2xs);
  margin-top: var(--space-1);
  opacity: 0.7;
  text-align: right;
}

.chat-input-area {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  gap: var(--space-3);
  background: white;
}

.chat-input-area input {
  flex: 1;
  height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  outline: none;
  font-family: var(--font-body);
  transition: border-color 0.2s;
}

.chat-input-area input:focus {
  border-color: var(--color-primary-600);
}

.chat-input-area button {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--color-primary-600);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

.chat-input-area button:hover:not(:disabled) {
  background: var(--color-primary-700);
  transform: translateY(-2px);
}

.chat-input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--color-text-tertiary);
}

.chat-placeholder svg {
  font-size: 48px;
}

.chat-placeholder--error {
  color: var(--color-error-500);
}

.chat-empty {
  text-align: center;
  padding: var(--space-10);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  display: flex;
  height: 100%;
  align-items: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .support-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .support-view {
    height: auto;
    min-height: calc(100vh - 120px);
  }
}
</style>
