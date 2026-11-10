<template>
  <component
    :is="forId ? 'label' : 'div'"
    :for="forId"
    :class="[
      'vc-label',
      `vc-label--size--${size}`,
      {
        'vc-label--error': error,
      },
    ]"
  >
    <slot />

    <span v-if="required" class="vc-label__asterisk">*</span>
  </component>
</template>

<script setup lang="ts">
interface IProps {
  required?: boolean;
  error?: boolean;
  forId?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

// One caption size for every field, whatever the size of the control under it.
withDefaults(defineProps<IProps>(), {
  size: "xs",
});
</script>

<style lang="scss">
.vc-label {
  // Muted, so the caption gives way to the value under it.
  --color: var(--vc-label-color, theme("colors.neutral.700"));

  @apply mb-0.5 font-bold text-[--color];

  &--size {
    &--xs {
      @apply text-xs;
    }

    &--sm {
      @apply text-sm;
    }

    &--md {
      @apply text-base;
    }

    &--lg {
      @apply text-lg;
    }
  }

  &__asterisk {
    @apply ms-px text-danger;
  }
}
</style>
