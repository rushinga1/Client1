<template>
  <div class="messages-page">
    <div class="messages-layout">
      <!-- Conversation List -->
      <div class="conversations-panel" :class="{ 'conversations-panel--hidden': isMobile && activeConvo }">
        <div class="conversations-header">
          <h3>Messages</h3>
        </div>
        <div class="conversations-search">
          <Icon icon="ph:magnifying-glass" />
          <input type="text" placeholder="Search conversations..." v-model="searchConvo" />
        </div>

        <!-- Loading -->
        <div v-if="loadingConvos" class="conversations-loading">
          <div class="loading-spinner"></div>
          <span>Loading conversations...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredConversations.length === 0" class="conversations-empty">
          <Icon icon="ph:chat-circle-dots" />
          <p v-if="searchConvo">No conversations matching "{{ searchConvo }}"</p>
          <p v-else>No conversations yet</p>
        </div>

        <!-- Conversation List -->
        <div v-else class="conversations-list">
          <div
            v-for="convo in filteredConversations"
            :key="convo.id"
            class="conversation-item"
            :class="{ 'conversation-item--active': activeConvo === convo.id, 'conversation-item--unread': convo.unreadCount > 0 }"
            @click="openConversation(convo)"
          >
            <div class="convo-avatar" :class="`convo-avatar--${convo.role}`">{{ getInitials(convo.name) }}</div>
            <div class="convo-info">
              <div class="convo-name">{{ convo.name }}</div>
              <div class="convo-role">
                <span v-if="convo.role === 'worker'" class="role-tag role-tag--worker">Agent</span>
                <span v-else class="role-tag role-tag--client">Client</span>
              </div>
              <div class="convo-preview">{{ convo.lastMessage }}</div>
            </div>
            <div class="convo-meta">
              <span class="convo-time">{{ formatTime(convo.time) }}</span>
              <span v-if="convo.unreadCount > 0" class="convo-badge">{{ convo.unreadCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Panel -->
      <div class="chat-panel" :class="{ 'chat-panel--visible': isMobile && activeConvo }">
        <template v-if="activeConvo && activeConversation">
          <div class="chat-header">
            <div class="chat-header-left">
              <button v-if="isMobile" class="back-btn" @click="activeConvo = null">
                <Icon icon="ph:caret-left" />
              </button>
              <div class="chat-user">
                <div class="chat-avatar" :class="`chat-avatar--${activeConversation.role}`">{{ getInitials(activeConversation.name) }}</div>
                <div>
                  <div class="chat-name">{{ activeConversation.name }}</div>
                  <div class="chat-status">
                    <span v-if="activeConversation.role === 'worker'" class="role-tag role-tag--worker">Assigned Agent</span>
                    <span v-else class="role-tag role-tag--client">Client</span>
                  </div>
                </div>
              </div>
            </div>
            <button class="chat-action" @click="callUser" :title="'Call ' + activeConversation.name">
              <Icon icon="ph:phone" />
            </button>
          </div>

          <!-- Messages -->
          <div class="chat-messages" ref="chatContainer">
            <div v-if="loadingMessages" class="chat-loading">
              <div class="loading-spinner"></div>
              <span>Loading messages...</span>
            </div>
            <template v-else>
              <div v-if="messages.length === 0" class="chat-start">
                <Icon icon="ph:hand-waving" />
                <p>Start a conversation with {{ activeConversation.name }}</p>
              </div>
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="message"
                :class="msg.senderId === currentUserId ? 'message--sent' : 'message--received'"
              >
                <div class="message-bubble">
                  <p>{{ msg.text }}</p>
                  <span class="message-time">{{ formatMessageTime(msg.createdAt) }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Input -->
          <div class="chat-input">
            <input
              type="text"
              v-model="newMessage"
              placeholder="Type a message..."
              @keyup.enter="sendMessage"
            />
            <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim() || sendingMessage">
              <Icon v-if="!sendingMessage" icon="ph:paper-plane-tilt-fill" />
              <div v-else class="loading-spinner loading-spinner--sm"></div>
            </button>
          </div>
        </template>

        <div v-else class="chat-empty">
          <Icon icon="ph:chat-circle-dots" />
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the left to start messaging</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '../../stores/auth.store'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id || '')

interface Conversation {
  id: string
  name: string
  lastMessage: string
  time: string
  unreadCount: number
  role: string
}

interface Message {
  id: string
  text: string
  senderId: string
  receiverId: string
  read: boolean
  createdAt: string
}

// State
const searchConvo = ref('')
const activeConvo = ref<string | null>(null)
const newMessage = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const conversations = ref<Conversation[]>([])
const messages = ref<Message[]>([])
const loadingConvos = ref(true)
const loadingMessages = ref(false)
const sendingMessage = ref(false)
const isMobile = ref(window.innerWidth < 768)
let messagePollingId: ReturnType<typeof setInterval> | null = null
let convoPollingId: ReturnType<typeof setInterval> | null = null

// Computed
const filteredConversations = computed(() => {
  if (!searchConvo.value) return conversations.value
  return conversations.value.filter(c => c.name.toLowerCase().includes(searchConvo.value.toLowerCase()))
})

const activeConversation = computed(() => conversations.value.find(c => c.id === activeConvo.value))

// Methods
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

const formatTime = (time: string) => {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString()
}

const formatMessageTime = (time: string) => {
  if (!time) return ''
  return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const fetchConversations = async () => {
  if (!currentUserId.value) return
  try {
    const res = await fetch(`${API_BASE}/api/conversations?userId=${currentUserId.value}`)
    if (res.ok) {
      conversations.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load conversations:', err)
  } finally {
    loadingConvos.value = false
  }
}

const fetchMessages = async () => {
  if (!activeConvo.value || !currentUserId.value) return
  try {
    const res = await fetch(`${API_BASE}/api/messages?userId1=${currentUserId.value}&userId2=${activeConvo.value}`)
    if (res.ok) {
      const data = await res.json()
      const hadNewMessages = data.length > messages.value.length
      messages.value = data
      if (hadNewMessages) {
        await nextTick()
        scrollToBottom()
      }
    }
  } catch (err) {
    console.error('Failed to load messages:', err)
  }
}

const openConversation = async (convo: Conversation) => {
  activeConvo.value = convo.id
  loadingMessages.value = true
  messages.value = []

  // Reset unread count locally
  convo.unreadCount = 0

  await fetchMessages()
  loadingMessages.value = false

  // Start polling messages for this conversation
  startMessagePolling()

  await nextTick()
  scrollToBottom()
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeConvo.value || !currentUserId.value) return
  sendingMessage.value = true

  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: currentUserId.value,
        receiverId: activeConvo.value,
        text: newMessage.value.trim()
      })
    })

    if (res.ok) {
      const msg = await res.json()
      messages.value.push(msg)
      newMessage.value = ''

      // Update conversation preview
      const convo = conversations.value.find(c => c.id === activeConvo.value)
      if (convo) {
        convo.lastMessage = msg.text
        convo.time = msg.createdAt
      }

      await nextTick()
      scrollToBottom()
    }
  } catch (err) {
    console.error('Failed to send message:', err)
  } finally {
    sendingMessage.value = false
  }
}

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const startMessagePolling = () => {
  stopMessagePolling()
  messagePollingId = setInterval(fetchMessages, 5000)
}

const stopMessagePolling = () => {
  if (messagePollingId) {
    clearInterval(messagePollingId)
    messagePollingId = null
  }
}

const callUser = () => {
  // placeholder for phone call action
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
}

// Lifecycle
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await fetchConversations()

  // Poll conversations every 10s
  convoPollingId = setInterval(fetchConversations, 10000)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  stopMessagePolling()
  if (convoPollingId) clearInterval(convoPollingId)
})
</script>

<style scoped>
.messages-page { height: calc(100vh - 140px); }

.messages-layout { display: flex; height: 100%; background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; }

/* Conversations Panel */
.conversations-panel { width: 340px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; flex-shrink: 0; }

.conversations-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid #f1f5f9; }
.conversations-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }

.conversations-search { display: flex; align-items: center; gap: 8px; margin: 12px 16px; padding: 0 14px; height: 40px; background: #f8fafc; border-radius: 10px; border: 1px solid #e5e7eb; }
.conversations-search svg { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; }
.conversations-search input { flex: 1; border: none; background: none; font-size: 13px; color: #334155; outline: none; }

.conversations-list { flex: 1; overflow-y: auto; }

.conversations-loading,
.conversations-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #94a3b8; font-size: 14px; padding: 40px; }
.conversations-empty svg { width: 48px; height: 48px; }

.conversation-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; transition: background 0.15s; border-left: 3px solid transparent; }
.conversation-item:hover { background: #f8fafc; }
.conversation-item--active { background: #eff6ff; border-left-color: #3b82f6; }
.conversation-item--unread .convo-name { font-weight: 700; }

.convo-avatar { width: 42px; height: 42px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.convo-avatar--worker { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.convo-avatar--client { background: linear-gradient(135deg, #10b981, #059669); }

.convo-info { flex: 1; min-width: 0; }
.convo-name { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
.convo-role { margin-bottom: 2px; }
.convo-preview { font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.convo-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.convo-time { font-size: 11px; color: #94a3b8; }
.convo-badge { width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; color: white; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

.role-tag { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.role-tag--worker { background: #dbeafe; color: #1d4ed8; }
.role-tag--client { background: #d1fae5; color: #047857; }

/* Chat Panel */
.chat-panel { flex: 1; display: flex; flex-direction: column; }

.chat-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.chat-header-left { display: flex; align-items: center; gap: 8px; }
.back-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e5e7eb; background: white; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.chat-user { display: flex; align-items: center; gap: 12px; }
.chat-avatar { width: 40px; height: 40px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.chat-avatar--worker { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.chat-avatar--client { background: linear-gradient(135deg, #10b981, #059669); }
.chat-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.chat-status { font-size: 12px; color: #94a3b8; }
.chat-action { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #e5e7eb; background: white; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.chat-action:hover { background: #f8fafc; color: #3b82f6; border-color: #3b82f6; }
.chat-action svg { width: 20px; height: 20px; }

.chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }

.chat-loading,
.chat-start { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #94a3b8; font-size: 14px; }
.chat-start svg { width: 48px; height: 48px; }

.message { display: flex; max-width: 75%; }
.message--sent { align-self: flex-end; }
.message--received { align-self: flex-start; }

.message-bubble { padding: 12px 16px; border-radius: 16px; }
.message--sent .message-bubble { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-bottom-right-radius: 4px; }
.message--received .message-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }

.message-bubble p { margin: 0 0 4px; font-size: 14px; line-height: 1.5; }
.message-time { font-size: 11px; opacity: 0.7; }

.chat-input { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-top: 1px solid #f1f5f9; }
.chat-input input { flex: 1; height: 44px; padding: 0 16px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; color: #1e293b; background: #f8fafc; transition: all 0.2s; }
.chat-input input:focus { outline: none; border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

.send-btn { width: 44px; height: 44px; border-radius: 12px; border: none; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.send-btn:hover { box-shadow: 0 4px 14px rgba(59,130,246,0.3); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.send-btn svg { width: 20px; height: 20px; }

.chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
.chat-empty svg { width: 56px; height: 56px; margin-bottom: 16px; }
.chat-empty h3 { margin: 0 0 4px; color: #475569; font-size: 18px; }
.chat-empty p { margin: 0; font-size: 14px; }

/* Loading Spinner */
.loading-spinner { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.7s linear infinite; }
.loading-spinner--sm { width: 18px; height: 18px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Mobile */
@media (max-width: 768px) {
  .conversations-panel { width: 100%; }
  .conversations-panel--hidden { display: none; }
  .chat-panel { display: none; }
  .chat-panel--visible { display: flex; }
}
</style>
