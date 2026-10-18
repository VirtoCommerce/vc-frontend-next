<template>
  <!-- A page template's "Minimal" layout (landing pages): the store's logo, no menu, search or footer -->
  <div class="flex min-h-screen flex-col">
    <div class="flex h-14 items-center bg-additional-50 px-6 shadow-md lg:h-auto lg:px-12 lg:py-5 print:shadow-none">
      <router-link to="/">
        <VcImage :src="themeLogoUrl" :alt="$context.storeName" class="h-9 lg:h-12" lazy />
      </router-link>
    </div>

    <main class="relative flex grow flex-col">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useWhiteLabeling } from "@/core/composables";

const { themeLogoUrl } = useWhiteLabeling();
</script>
