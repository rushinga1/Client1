<template>
  <div class="payments-view">
    <div class="payments-view__header">
      <h1>Payments</h1>
      <p>Manage your waste collection payments</p>
    </div>
    
    <div class="payments-view__content">
      <!-- Debt Status Banner -->
      <div v-if="debtInfo.totalDebt > 0" :class="['status-banner', statusClass]">
        <Icon :icon="statusIcon" class="status-icon" />
        <div class="status-text">
          <h3>{{ statusTitle }}</h3>
          <p>{{ getDebtMessage() }}</p>
        </div>
        <BaseButton v-if="!isBanned" variant="outline" size="sm" @click="selectAllWeeks">
          Select All to Clear
        </BaseButton>
      </div>

      <div class="debt-summary-grid">
        <div class="summary-card">
          <span class="label">Total Owed</span>
          <span class="value">{{ formattedDebt }}</span>
        </div>
        <div class="summary-card">
          <span class="label">Weeks Behind</span>
          <span class="value">{{ debtInfo.weeksOwed }}</span>
        </div>
        <div class="summary-card">
          <span class="label">Service Status</span>
          <span :class="['value', statusClass]">{{ isBanned ? 'Suspended' : 'Active' }}</span>
        </div>
      </div>

      <BaseCard variant="elevated" padding="lg">
        <div class="section-title">
          <h2>Select Weeks to Pay</h2>
          <p>Choose the periods you want to clear from your balance</p>
        </div>
        
        <WeekSelector
          v-model="selectedWeekIds"
          :weeks="eligibleWeeks"
          :max-weeks="12"
        />
        
        <div class="payment-actions">
          <div class="selection-summary">
            <span>Selected: {{ selectedWeeks.length }} week(s)</span>
            <span class="total">{{ formattedTotal }}</span>
          </div>
          <BaseButton
            variant="primary"
            size="lg"
            :disabled="selectedWeeks.length === 0"
            @click="openPaymentModal"
          >
            Process Payment
          </BaseButton>
        </div>
      </BaseCard>
    </div>
    
    <PaymentConfirmModal
      v-model="showPaymentModal"
      :weeks="selectedWeeks"
      @confirm="handlePaymentConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import BaseCard from '../../components/base/BaseCard.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import WeekSelector from '../../components/domain/payment/WeekSelector.vue'
import PaymentConfirmModal from '../../components/domain/payment/PaymentConfirmModal.vue'
import { usePayment } from '../../composables/usePayment'
import { useDebt } from '../../composables/useDebt'
import { useToast } from '../../composables/useToast'
import { usePaymentStore } from '../../stores/payment.store'
import { useAuthStore } from '../../stores/auth.store'

const paymentStore = usePaymentStore()
const authStore = useAuthStore()
const paymentComposable = usePayment()
const debtComposable = useDebt()
const toast = useToast()

const isLoading = ref(false)
const { debtInfo, formattedDebt, getDebtMessage } = debtComposable
const isBanned = computed(() => debtInfo.value.isBanned)

const statusClass = computed(() => {
  if (isBanned.value) return 'status-danger'
  if (debtInfo.value.weeksOwed > 0) return 'status-warning'
  return 'status-success'
})

const statusIcon = computed(() => {
  if (isBanned.value) return 'ph:warning-octagon'
  if (debtInfo.value.weeksOwed > 0) return 'ph:warning-circle'
  return 'ph:check-circle'
})

const statusTitle = computed(() => {
  if (isBanned.value) return 'Service Suspended'
  if (debtInfo.value.weeksOwed > 0) return 'Payment Required'
  return 'Account in Good Standing'
})

const selectedWeekIds = computed({
  get: () => paymentComposable.selectedWeekIds.value,
  set: (value: any[]) => {
    paymentComposable.selectedWeekIds.value = value.map(id => Number(id))
  }
})

const selectAllWeeks = () => {
  paymentComposable.selectAllWeeks()
}

const selectedWeeks = computed(() => paymentComposable.selectedWeeks.value)
const eligibleWeeks = computed(() => paymentComposable.getEligibleWeeks())
const formattedTotal = computed(() => paymentComposable.formattedTotal.value)

const showPaymentModal = ref(false)

const openPaymentModal = () => {
  showPaymentModal.value = true
}

const handlePaymentConfirm = async (pinCode: string) => {
  const success = await paymentComposable.processPayment(pinCode)
  if (success) {
    toast.success('Payment processed successfully!')
    showPaymentModal.value = false
    // Refresh stats after payment
    await authStore.fetchStats()
  }
}

onMounted(async () => {
  try {
    isLoading.value = true
    await paymentStore.initializePayments()
    await authStore.fetchStats()
  } catch (error) {
    console.error('Failed to load payment data:', error)
    toast.error('Failed to load payment data')
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
@import '../../assets/styles/tokens.css';

.payments-view {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

.payments-view__header {
  margin-bottom: var(--space-6);
}

.payments-view__header h1 {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
  margin: 0 0 var(--space-2) 0;
}

.payments-view__header p {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
  margin: 0;
}

.payments-view__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.status-banner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2);
}

.status-danger { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
.status-warning { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.status-success { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }

.status-icon {
  font-size: 2rem;
}

.status-text h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.status-text p {
  margin: 0;
  font-size: var(--text-sm);
  opacity: 0.9;
}

.debt-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.summary-card {
  background: white;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-default);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary-card .label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card .value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
}

.summary-card .value.status-danger { color: #dc2626; border: none; background: transparent; padding: 0; }
.summary-card .value.status-warning { color: #d97706; border: none; background: transparent; padding: 0; }

.section-title {
  margin-bottom: var(--space-6);
}

.section-title h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
}

.section-title p {
  margin: var(--space-1) 0 0 0;
  color: var(--color-text-secondary);
}

.payment-actions {
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border-default);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-summary {
  display: flex;
  flex-direction: column;
}

.selection-summary .total {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary-600);
}
</style>
