<template>
  <div v-if="text" class="page-heading mx-auto mt-7 w-full max-w-screen-2xl px-5 pb-5 md:px-12 lg:pb-10">
    <VcTypography tag="h1">{{ text }}</VcTypography>
  </div>
</template>

<script setup lang="ts">
// The page's H1, as the page settings' "Page Header / H1" used to draw it above the sections
defineProps<{ text?: string }>();
</script>
