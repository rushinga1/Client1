<template>
  <BaseCard variant="elevated" padding="md" class="system-update-card" hoverable>
    <div class="system-update">
      <div class="system-update__header">
        <div class="title-group">
          <Icon :icon="currentUpdateIcon" class="update-icon" :class="`update-icon--${currentUpdate.type}`" />
          <h4>{{ $t('dashboard.systemUpdates') }}</h4>
        </div>
        <div class="update-badge" :class="`update-badge--${currentUpdate.type}`">
          {{ currentUpdate.type.toUpperCase() }}
        </div>
      </div>

      <div class="system-update__content">
        <transition name="fade-slide" mode="out-in">
          <div :key="currentIndex" class="update-item">
            <h5>{{ currentUpdate.title }}</h5>
            <p>{{ currentUpdate.content }}</p>
            <span class="update-date">{{ formatDate(currentUpdate.date) }}</span>
          </div>
        </transition>
      </div>

      <div class="system-update__footer">
        <div class="pagination">
          <span 
            v-for="(_, index) in updates" 
            :key="index"
            class="pagination-dot"
            :class="{ active: index === currentIndex }"
            @click="currentIndex = index"
          ></span>
        </div>
        <div class="actions">
          <BaseButton variant="ghost" size="sm" @click="prevUpdate" :disabled="updates.length <= 1">
            <Icon icon="ph:caret-left" />
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="nextUpdate" :disabled="updates.length <= 1">
            <Icon icon="ph:caret-right" />
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import BaseCard from '../../base/BaseCard.vue'
import BaseButton from '../../base/BaseButton.vue'

interface SystemUpdate {
  id: string
  title: string
  content: string
  date: string
  type: 'feature' | 'update' | 'alert' | string
}

const props = defineProps<{
  updates: SystemUpdate[]
}>()

const currentIndex = ref(0)

const currentUpdate = computed(() => props.updates[currentIndex.value] || {
  title: 'No Updates',
  content: 'Stay tuned for future system improvements.',
  date: new Date().toISOString(),
  type: 'update'
})

const currentUpdateIcon = computed(() => {
  switch (currentUpdate.value.type) {
    case 'feature': return 'ph:sparkle'
    case 'alert': return 'ph:warning-circle'
    default: return 'ph:info'
  }
})

const nextUpdate = () => {
  currentIndex.value = (currentIndex.value + 1) % props.updates.length
}

const prevUpdate = () => {
  currentIndex.value = (currentIndex.value - 1 + props.updates.length) % props.updates.length
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style scoped>
@import '../../../assets/styles/tokens.css';

.system-update-card {
  height: 100%;
  border-left: 4px solid var(--color-primary);
  background: linear-gradient(135deg, var(--color-bg-base) 0%, var(--color-neutral-50) 100%);
}

.system-update {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
}

.system-update__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title-group h4 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.update-icon {
  font-size: 20px;
}

.update-icon--feature { color: var(--color-warning); }
.update-icon--alert { color: var(--color-danger); }
.update-icon--update { color: var(--color-primary); }

.update-badge {
  font-size: 10px;
  font-weight: var(--font-bold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-neutral-100);
  color: var(--color-text-secondary);
}

.update-badge--feature { background-color: var(--color-warning-100); color: var(--color-warning-700); }
.update-badge--alert { background-color: var(--color-danger-100); color: var(--color-danger-700); }
.update-badge--update { background-color: var(--color-primary-100); color: var(--color-primary-700); }

.system-update__content {
  flex: 1;
  min-height: 80px;
}

.update-item h5 {
  margin: 0 0 var(--space-1);
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.update-item p {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.update-date {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.system-update__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-2);
}

.pagination {
  display: flex;
  gap: 6px;
}

.pagination-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-neutral-300);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.pagination-dot.active {
  width: 16px;
  border-radius: 3px;
  background-color: var(--color-primary);
}

.actions {
  display: flex;
  gap: var(--space-1);
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
