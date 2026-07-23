<script setup lang="ts">
const props = defineProps<{
  initials: string
  accent: string
  image?: string
  size?: 'small' | 'medium' | 'large'
}>()

const imageFailed = ref(false)

watch(() => props.image, () => {
  imageFailed.value = false
})
</script>

<template>
  <div
    class="creator-avatar"
    :class="[`avatar-${size || 'medium'}`, { 'has-image': image && !imageFailed }]"
    :style="{ '--avatar-accent': accent }"
    aria-hidden="true"
  >
    <img
      v-if="image && !imageFailed"
      :src="image"
      alt=""
      @error="imageFailed = true"
    >
    <span v-else>{{ initials }}</span>
  </div>
</template>
