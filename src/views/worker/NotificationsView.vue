<template>
  <div class="notif-page">
    <div class="page-top">
      <div><h2>Notifications</h2><span class="count-badge">{{ unread }} unread</span></div>
      <div class="top-actions">
        <button class="mark-btn" @click="markAllRead" v-if="unread > 0"><Icon icon="ph:checks" /> Mark all read</button>
        <select v-model="filter" class="sel"><option value="all">All</option><option value="payment">Payments</option><option value="warning">Warnings</option><option value="system">System</option></select>
      </div>
    </div>
    <div class="list">
      <div v-for="n in filtered" :key="n.id" class="item" @click="() => {}">
        <div class="ico" :class="n.type"><Icon :icon="icons[n.type] || 'ph:info'" /></div>
        <div class="body"><div class="ttl">{{ n.title }}</div><div class="msg">{{ n.content }}</div><div class="tm"><Icon icon="ph:clock" />{{ new Date(n.date).toLocaleDateString() }}</div></div>
        <button class="x" @click.stop="dismiss(n.id)"><Icon icon="ph:x" /></button>
      </div>
      <div v-if="filtered.length===0" class="empty"><Icon icon="ph:bell-slash" /><h3>No notifications</h3><p>You're all caught up!</p></div>
    </div>
  </div>
</template>
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '../../stores/auth.store'

const authStore = useAuthStore()
const filter = ref('all')
const icons: Record<string,string> = { payment:'ph:money', warning:'ph:warning-circle-fill', system:'ph:gear-six', info:'ph:info-fill' }

const notifications = computed(() => authStore.user?.systemUpdates || [])
const unread = computed(() => notifications.value.length)
const filtered = computed(() => {
  if (filter.value === 'all') return notifications.value
  return notifications.value.filter(n => n.type === filter.value)
})

const markAllRead = () => {
  // Logic to clear badges globally
}

const dismiss = (id: string | number) => {
  if (authStore.user) {
    authStore.user.systemUpdates = authStore.user.systemUpdates?.filter(n => n.id !== id)
  }
}

onMounted(() => {
  authStore.fetchStats()
})
</script>
<style scoped>
.notif-page { display:flex; flex-direction:column; gap:20px; }
.page-top { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.page-top h2 { font-size:22px; font-weight:700; color:#0f172a; margin:0; display:inline; }
.count-badge { margin-left:12px; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600; background:#dbeafe; color:#2563eb; }
.top-actions { display:flex; gap:10px; align-items:center; }
.mark-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border:1px solid #e5e7eb; border-radius:10px; background:white; color:#475569; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; }
.mark-btn:hover { border-color:#3b82f6; color:#3b82f6; }
.mark-btn svg { width:16px; height:16px; }
.sel { height:38px; padding:0 12px; border:1px solid #e2e8f0; border-radius:10px; background:white; font-size:13px; color:#334155; cursor:pointer; }
.list { display:flex; flex-direction:column; gap:6px; }
.item { display:flex; align-items:flex-start; gap:14px; padding:18px 20px; background:white; border-radius:14px; border:1px solid #e5e7eb; transition:all 0.2s; cursor:pointer; }
.item:hover { border-color:#cbd5e1; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
.item.unread { background:#f8faff; border-left:3px solid #3b82f6; }
.ico { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ico svg { width:20px; height:20px; }
.ico.payment { background:#dbeafe; color:#1e3a8a; }
.ico.warning { background:#fef3c7; color:#d97706; }
.ico.system { background:#f1f5f9; color:#475569; }
.ico.info { background:#dbeafe; color:#2563eb; }
.body { flex:1; min-width:0; }
.ttl { font-size:14px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.msg { font-size:13px; color:#64748b; line-height:1.5; margin-bottom:6px; }
.tm { display:flex; align-items:center; gap:4px; font-size:12px; color:#94a3b8; }
.tm svg { width:14px; height:14px; }
.x { width:28px; height:28px; border-radius:8px; border:none; background:transparent; color:#cbd5e1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0; }
.x:hover { background:#fee2e2; color:#ef4444; }
.x svg { width:14px; height:14px; }
.empty { display:flex; flex-direction:column; align-items:center; padding:60px 20px; color:#94a3b8; }
.empty svg { width:48px; height:48px; margin-bottom:16px; }
.empty h3 { margin:0 0 4px; color:#475569; font-size:18px; }
.empty p { margin:0; font-size:14px; }
</style>

