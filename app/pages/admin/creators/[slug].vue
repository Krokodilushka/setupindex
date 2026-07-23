<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()
const creatorSlug = computed(() => String(route.params.slug))
</script>

<template>
  <AdminPanel :creator-slug="creatorSlug" />
</template>
