<script setup lang="ts">
defineProps<{
  items: Array<{
    label: string
    to?: string
  }>
}>()
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`">
        <NuxtLink v-if="item.to" :to="item.to">
          {{ item.label }}
        </NuxtLink>
        <span v-else aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
