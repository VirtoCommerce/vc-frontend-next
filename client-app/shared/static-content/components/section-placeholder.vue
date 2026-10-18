<template>
  <!-- the designer's stand-in for a section with nothing to show on this page: it can be seen, outlined and selected -->
  <VcWidget :title="title" :prepend-icon="icon" icon-shape size="lg" class="section-placeholder">
    <div v-if="layout === 'grid'" class="section-placeholder__grid" aria-hidden="true">
      <div v-for="card in 6" :key="card" class="section-placeholder__card">
        <span class="section-placeholder__image" />

        <span class="section-placeholder__line" />

        <span class="section-placeholder__line section-placeholder__line--short" />
      </div>
    </div>

    <div v-else class="section-placeholder__list" aria-hidden="true">
      <div v-for="row in 2" :key="row" class="section-placeholder__row">
        <span class="section-placeholder__line section-placeholder__line--short" />

        <span class="section-placeholder__line" />

        <span class="section-placeholder__line section-placeholder__line--long" />
      </div>
    </div>

    <p v-if="note" class="section-placeholder__note">{{ note }}</p>
  </VcWidget>
</template>

<script setup lang="ts">
interface IProps {
  title?: string;
  icon?: string;
  /** product cards (related, recommended) or text rows (reviews) */
  layout?: "grid" | "list";
  /** why it is empty, e.g. "no reviews" */
  note?: string;
}

withDefaults(defineProps<IProps>(), {
  layout: "list",
});
</script>

<style lang="scss">
.section-placeholder {
  // the text colour, faint: a bar that shows on any theme's widget, light or dark
  --bar: color-mix(in srgb, currentColor 12%, transparent);

  &__grid {
    @apply flex gap-4 overflow-hidden;
  }

  &__card {
    @apply flex w-36 shrink-0 flex-col gap-2;
  }

  &__image {
    @apply h-28 rounded bg-[--bar];
  }

  &__list {
    @apply flex flex-col gap-6;
  }

  &__row {
    @apply flex flex-col gap-2;
  }

  &__line {
    @apply h-3 w-3/5 rounded bg-[--bar];

    &--short {
      @apply w-1/4;
    }

    &--long {
      @apply w-11/12;
    }
  }

  &__note {
    @apply mt-5 text-sm text-neutral-500 first-letter:uppercase;
  }
}
</style>
