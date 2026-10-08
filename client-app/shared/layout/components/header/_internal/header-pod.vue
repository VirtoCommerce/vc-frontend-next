<template>
  <button type="button" class="header-pod" :class="{ 'header-pod--opened': opened }">
    <slot />
  </button>
</template>

<script setup lang="ts">
interface IProps {
  opened?: boolean;
}

defineProps<IProps>();
</script>

<style lang="scss">
// The round trigger the header's identity menus share (account, organizations), so the pair cannot
// drift apart. 34, not 42: it is the quietest control in the row.
.header-pod {
  @apply grid size-[2.125rem] flex-none cursor-pointer place-items-center rounded-full border-0 bg-neutral-200 text-neutral-800;

  transition:
    background var(--transition-duration, 0.2s) ease,
    color var(--transition-duration, 0.2s) ease;

  &:hover {
    @apply bg-neutral-300;
  }

  // The open pod stays inverted under the pointer too; plain `--opened` loses to `:hover`.
  &--opened,
  &--opened:hover {
    @apply bg-neutral-950 text-additional-50;
  }
}
</style>
