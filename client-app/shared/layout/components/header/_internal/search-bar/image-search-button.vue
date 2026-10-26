<template>
  <VcButton
    class="image-search-button"
    color="neutral"
    variant="ghost"
    size="xs"
    type="button"
    icon="camera"
    :aria-label="$t('shared.layout.search_bar.image_search.open_button')"
    :title="$t('shared.layout.search_bar.image_search.open_button')"
    data-test-id="image-search-open-button"
    @click.stop="openImageSearch"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useModal } from "@/shared/modal";

// Loaded on first click, so the on-device recognition runtime stays out of the header bundle of every page.
const ImageSearchModal = defineAsyncComponent(() => import("./image-search-modal.vue"));

const { openModal, closeModal } = useModal();

function openImageSearch(): void {
  openModal({
    component: ImageSearchModal,
    props: {
      onClose: closeModal,
    },
  });
}
</script>

<style lang="scss">
.image-search-button {
  @apply my-1.5 ms-1.5;
}
</style>
