<script setup lang="ts">
import type { EquipmentStatus, VerificationStatus } from '../types/content'

const props = defineProps<{
  status: EquipmentStatus | VerificationStatus
}>()

const { t } = useI18n()
const label = computed(() => t(`status.${props.status}`))
</script>

<template>
  <span class="status-badge" :class="`status-${status}`">
    <span class="status-dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>
