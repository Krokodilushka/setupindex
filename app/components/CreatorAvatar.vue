<script setup lang="ts">
defineProps<{
  initials: string
  accent: string
  size?: 'small' | 'medium' | 'large'
}>()
</script>

<template>
  <div
    class="creator-avatar"
    :class="`avatar-${size || 'medium'}`"
    :style="{ '--avatar-accent': accent }"
    aria-hidden="true"
  >
    <span>{{ initials }}</span>
  </div>
</template>
