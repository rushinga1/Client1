<template>
  <div class="portal-user">
    <div class="user-dashboard">
      <!-- Loading State -->
      <div v-if="isLoading" class="dashboard__loading">
        <div class="dashboard__bento-grid">
          <div class="bento-item bento-item--half" v-for="i in 4" :key="i">
            <BaseSkeleton variant="card" :lines="5" :show-header="true" />
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <template v-else>
        <!-- Crisis Header - Debt Banner -->
        <div v-if="hasDebt" class="dashboard__crisis-header">
          <DebtBanner
            :total-debt="debtInfo.totalDebt"
            :weeks-owed="debtInfo.weeksOwed"
            :months-behind="debtInfo.monthsBehind"
            @pay-now="openPaymentModal"
          />
        </div>

        <!-- 2x2 Bento Grid matching requested design -->
        <div class="dashboard__bento-grid">
          
          <!-- 1. Recent Payments -->
          <div class="bento-item bento-item--half">
            <BaseCard variant="elevated" padding="md" class="card-full-height">
              <div class="card-header">
                <div class="card-title">
                  <Icon icon="ph:receipt" />
                  <h3>Recent Payments</h3>
                </div>
                <router-link to="/history" class="card-link">
                  View all <Icon icon="ph:arrow-right" />
                </router-link>
              </div>

              <div class="payments-list">
                <div v-if="recentTransactions.length === 0" class="empty-state">
                  <p>No recent payments found.</p>
                </div>
                <div v-else class="payment-item" v-for="tx in recentTransactions.slice(0,4)" :key="tx.id">
                  <div class="payment-icon" :class="getPaymentIconClass(tx.method)">
                    <Icon :icon="getPaymentIcon(tx.method)" />
                  </div>
                  <div class="payment-info">
                    <div class="payment-method">{{ tx.method === 'momo' ? 'MoMo' : 'Bank Transfer' }}</div>
                    <div class="payment-date">{{ formatDateTime(tx.date || tx.createdAt) }}</div>
                  </div>
                  <div class="payment-amount">
                    <span class="amount-val">{{ (tx.amount).toLocaleString() }}</span>
                    <span class="amount-cur">RWF</span>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- 2. Quick Actions -->
          <div class="bento-item bento-item--half">
            <BaseCard variant="elevated" padding="md" class="card-full-height">
              <div class="card-header">
                <div class="card-title">
                  <Icon icon="ph:lightning" />
                  <h3>Quick Actions</h3>
                </div>
              </div>

              <div class="quick-actions-list">
                <div class="action-card" @click="openPaymentModal">
                  <div class="action-card-icon action-icon-pay">
                    <Icon icon="ph:money" />
                  </div>
                  <div class="action-card-text">
                    <div class="action-card-title">Pay Now</div>
                    <div class="action-card-desc">Make a new payment</div>
                  </div>
                </div>

                <div class="action-card" @click="$router.push('/reminders')">
                  <div class="action-card-icon action-icon-remind">
                    <Icon icon="ph:bell" />
                  </div>
                  <div class="action-card-text">
                    <div class="action-card-title">Reminders</div>
                    <div class="action-card-desc">View your reminders</div>
                  </div>
                </div>

                <div class="action-card" @click="$router.push('/account')">
                  <div class="action-card-icon action-icon-account">
                    <Icon icon="ph:user-circle" />
                  </div>
                  <div class="action-card-text">
                    <div class="action-card-title">Account</div>
                    <div class="action-card-desc">Manage your profile</div>
                  </div>
                </div>

                <div class="action-card" @click="showLatestAnnouncement">
                  <div class="action-card-icon action-icon-notify">
                    <Icon icon="ph:speaker-high" />
                  </div>
                  <div class="action-card-text">
                    <div class="action-card-title">Notification</div>
                    <div class="action-card-desc">View latest announcements</div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- 3. Announcements -->
          <div class="bento-item bento-item--half">
            <BaseCard variant="elevated" padding="md" class="card-full-height">
              <div class="card-header">
                <div class="card-title">
                  <Icon icon="ph:megaphone" />
                  <h3>Announcements</h3>
                </div>
              </div>

              <div class="announcements-list">
                <div v-if="!authStore.user?.systemUpdates?.length" class="empty-state">
                  <p>No announcements at this time.</p>
                </div>
                
                <div class="announcement-item" v-for="update in authStore.user?.systemUpdates" :key="update.id">
                  <div class="announcement-accent"></div>
                  <div class="announcement-content">
                    <h4 class="announcement-title">{{ update.title }}</h4>
                    <p class="announcement-desc">{{ update.content }}</p>
                    <div class="announcement-meta">Posted by {{ update.author || 'System Admin' }}</div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- 4. Profile Description -->
          <div class="bento-item bento-item--half">
            <BaseCard variant="elevated" padding="md" class="card-full-height">
              <div class="card-header">
                <div class="card-title">
                  <Icon icon="ph:user-focus" />
                  <h3>Profile Description</h3>
                </div>
              </div>

              <div class="profile-desc">
                <div class="profile-header">
                  <div class="profile-avatar">{{ getInitials(authStore.user?.name || '') }}</div>
                  <div class="profile-info">
                    <div class="profile-name">{{ authStore.user?.name || 'User' }}</div>
                    <div class="profile-location">
                      <Icon icon="ph:map-pin" />
                      {{ authStore.user?.district || 'N/A' }}, {{ authStore.user?.sector || 'N/A' }}
                    </div>
                    <div class="profile-phone">
                      <Icon icon="ph:phone" />
                      {{ formatPhone(authStore.user?.phone) }}
                    </div>
                  </div>
                </div>

                <div class="profile-status">
                  <span class="status-badge">ACTIVE</span>
                  <span class="status-text">Member since {{ formatMemberSince(authStore.user?.createdAt || authStore.user?.joinedDate) }}</span>
                </div>

                <div class="profile-details-grid">
                  <div class="detail-pill detail-pill--district">
                    <label>DISTRICT</label>
                    <div class="detail-val">{{ authStore.user?.district || 'N/A' }}</div>
                  </div>
                  <div class="detail-pill detail-pill--sector">
                    <label>SECTOR</label>
                    <div class="detail-val">{{ authStore.user?.sector || 'N/A' }}</div>
                  </div>
                  <div class="detail-pill detail-pill--cell">
                    <label>CELL</label>
                    <div class="detail-val">{{ authStore.user?.cell || 'N/A' }}</div>
                  </div>
                  <div class="detail-pill detail-pill--village">
                    <label>VILLAGE</label>
                    <div class="detail-val">{{ authStore.user?.village || 'N/A' }}</div>
                  </div>
                  <div class="detail-pill detail-pill--agent">
                    <label>AGENT</label>
                    <div class="detail-val">{{ authStore.user?.assignedWorker?.name || 'Unassigned' }}</div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

        </div>
      </template>

      <!-- Modals and Bottom Sheets -->
      <PaymentConfirmModal
        v-model="showPaymentModal"
        :weeks="selectedWeeks"
        @confirm="handlePaymentConfirm"
      />

      <BaseBottomSheet
        v-if="isMobile"
        v-model="showMobilePaymentSheet"
        :title="$t('payment.confirmPayment')"
        size="lg"
      >
        <div class="mobile-payment-sheet">
          <div class="mobile-payment-summary">
            <h4>{{ $t('payment.paymentSummary') }}</h4>
            <div class="summary-item">
              <span>{{ $t('payment.weeksSelected') }}</span>
              <span class="amount">{{ selectedWeeks.length }}</span>
            </div>
            <div class="summary-item">
              <span>{{ $t('payment.totalAmount') }}</span>
              <span class="amount">{{ formattedTotal }}</span>
            </div>
          </div>
          
          <div class="mobile-payment-pin">
            <h4>{{ $t('payment.enterPin') }}</h4>
            <BasePinInput
              v-model="mobilePinCode"
              :length="6"
              :mask="true"
              @complete="handleMobilePayment"
            />
          </div>
          
          <div class="mobile-payment-actions">
            <BaseButton
              variant="ghost"
              @click="showMobilePaymentSheet = false"
            >
              {{ $t('common.cancel') }}
            </BaseButton>
            <BaseButton
              variant="primary"
              :disabled="mobilePinCode.length !== 6"
              @click="() => handleMobilePayment(mobilePinCode)"
            >
              {{ $t('payment.confirmPay') }}
            </BaseButton>
          </div>
        </div>
      </BaseBottomSheet>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import BaseCard from '../../components/base/BaseCard.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseSkeleton from '../../components/base/BaseSkeleton.vue'
import BaseBottomSheet from '../../components/base/BaseBottomSheet.vue'
import BasePinInput from '../../components/base/BasePinInput.vue'
import DebtBanner from '../../components/domain/debt/DebtBanner.vue'
import PaymentConfirmModal from '../../components/domain/payment/PaymentConfirmModal.vue'
import { useAuthStore } from '../../stores/auth.store'
import { usePaymentStore } from '../../stores/payment.store'
import { useUIStore } from '../../stores/ui.store'
import { useDebt } from '../../composables/useDebt'
import { usePayment } from '../../composables/usePayment'
import { useToast } from '../../composables/useToast'
import { useRouter } from 'vue-router'

// Composables
const { debtInfo, hasDebt } = useDebt()
const paymentComposable = usePayment()
const paymentStore = usePaymentStore()
const authStore = useAuthStore()
const toast = useToast()
const uiStore = useUIStore()
const router = useRouter()

// State
const isLoading = ref(true)
const showMobilePaymentSheet = ref(false)
const mobilePinCode = ref('')

// Payment state & computed properties
const selectedWeeks = computed(() => paymentComposable.selectedWeeks.value)
const formattedTotal = computed(() => paymentComposable.formattedTotal.value)
const recentTransactions = computed(() => paymentStore.recentTransactions)

// Modal state
const showPaymentModal = computed({
  get: () => paymentComposable.showPaymentModal.value,
  set: (value) => {
    paymentComposable.showPaymentModal.value = value
  }
})

// Computed properties
const isMobile = computed(() => uiStore.isMobile)

// Helpers
const openPaymentModal = () => {
  if (isMobile.value) {
    showMobilePaymentSheet.value = true
  } else {
    paymentComposable.openPaymentModal()
  }
}

const handlePaymentConfirm = async (pinCode: string) => {
  const success = await paymentComposable.processPayment(pinCode)
  if (success) {
    toast.success('Payment processed successfully!')
  }
}

const handleMobilePayment = async (pinCode: string) => {
  const success = await paymentComposable.processPayment(pinCode)
  if (success) {
    showMobilePaymentSheet.value = false
    mobilePinCode.value = ''
    toast.success('Payment processed successfully!')
  }
}

const getPaymentIcon = (method: string) => {
  if (method === 'momo') return 'ph:device-mobile'
  return 'ph:bank'
}

const getPaymentIconClass = (method: string) => {
  return method === 'momo' ? 'icon-momo' : 'icon-bank'
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

const showLatestAnnouncement = () => {
  router.push('/dashboard') 
  toast.info('Viewing latest announcements')
}

const getAuthorName = (type: string) => {
  if (type === 'alert') return 'System Admin'
  if (type === 'feature') return 'Agruni Operations'
  return 'Agruni Comm'
}

const getInitials = (name?: string) => {
  if (!name || name === 'User') return 'U'
  return name.split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

const formatPhone = (phone?: string) => {
  if (!phone) return 'Not Provided'
  const clean = phone.replace(/^(\+?250)?0?/, '')
  return `+250 ${clean}`
}

const formatMemberSince = (dateStr?: string) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

// Initialize
onMounted(async () => {
  try {
    isLoading.value = true
    await paymentStore.initializePayments()
    await authStore.fetchStats()
  } catch (error) {
    console.error('Failed to initialize dashboard:', error)
    toast.error('Failed to load data')
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
@import '../../assets/styles/tokens.css';

.portal-user {
  min-height: 100vh;
  background-color: #f8fafc;
}

.user-dashboard {
  padding: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard__crisis-header {
  margin-bottom: var(--space-6);
}

.dashboard__bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.bento-item--half {
  width: 100%;
}

.card-full-height {
  height: 100%;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

/* Card Header Shared */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e3a8a;
  font-weight: 700;
}

.card-title svg {
  font-size: 20px;
}

.card-title h3 {
  margin: 0;
  font-size: 16px;
  font-family: var(--font-display);
}

.card-link {
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 14px;
}

/* Payments List */
.payments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.payment-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
}

.icon-momo {
  background: #3b82f6;
}

.icon-bank {
  background: #2563eb;
}

.payment-info {
  flex: 1;
}

.payment-method {
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
  margin-bottom: 4px;
}

.payment-date {
  font-size: 12px;
  color: #64748b;
}

.payment-amount {
  text-align: right;
  display: flex;
  align-items: center;
  gap: 4px;
}

.amount-val {
  font-weight: 700;
  font-size: 16px;
  color: #22c55e;
}

.amount-cur {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}

/* Quick Actions */
.quick-actions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.action-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.action-icon-pay { background: #dcfce7; color: #16a34a; }
.action-icon-remind { background: #e0e7ff; color: #4f46e5; }
.action-icon-account { background: #fef3c7; color: #d97706; }
.action-icon-notify { background: #ccfbf1; color: #0d9488; }

.action-card-text {
  flex: 1;
}

.action-card-title {
  font-weight: 700;
  font-size: 15px;
  color: #0f172a;
  margin-bottom: 2px;
}

.action-card-desc {
  font-size: 13px;
  color: #64748b;
}

/* Announcements */
.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-item {
  display: flex;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid #eef2f6;
  transition: all 0.2s ease;
}

.announcement-item:hover {
  transform: translateX(4px);
  border-color: #cbd5e1;
}

.announcement-accent {
  width: 4px;
  background: #3b82f6;
  flex-shrink: 0;
}

.announcement-content {
  padding: 16px;
  flex: 1;
}

.announcement-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.announcement-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 8px 0;
}

.announcement-meta {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  font-style: italic;
}

/* Profile Description */
.profile-desc {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 700;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.profile-location,
.profile-phone {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.profile-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  background: #dcfce7;
  color: #16a34a;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}

.status-text {
  font-size: 13px;
  color: #64748b;
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.detail-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-pill--district,
.detail-pill--sector,
.detail-pill--cell {
  border-left: 3px solid #3b82f6;
}

.detail-pill--village,
.detail-pill--agent {
  grid-column: span 1.5;
}

.detail-pill label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
}

.detail-val {
  font-size: 14px;
  color: #0f172a;
  font-weight: 600;
}

/* Mobile Adjustments */
@media (max-width: 1024px) {
  .dashboard__bento-grid {
    grid-template-columns: 1fr;
  }
}

/* Mobile Payment Styles */
.mobile-payment-sheet {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mobile-payment-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}

.mobile-payment-summary h4 {
  margin: 0 0 16px 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 600;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  color: #475569;
  font-size: 14px;
}

.summary-item .amount {
  font-weight: 700;
  color: #0f172a;
}

.mobile-payment-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.mobile-payment-pin h4 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 600;
}

.mobile-payment-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-payment-actions .base-button {
  width: 100%;
}
</style>
