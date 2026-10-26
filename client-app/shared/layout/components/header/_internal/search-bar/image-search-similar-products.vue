<template>
  <section class="image-search-similar-products" data-test-id="image-search-similar-products-section">
    <h3 class="image-search-similar-products__title">{{ title }}</h3>

    <ul class="image-search-similar-products__list">
      <li v-for="product in products" :key="product.id" class="image-search-similar-products__item">
        <router-link
          class="image-search-similar-products__link"
          :to="getProductRoute(product.id, product.slug)"
          :data-test-id="`image-search-similar-product-${product.id}-link`"
          @click="$emit('select')"
        >
          <VcImage
            class="image-search-similar-products__image"
            :src="product.imgSrc"
            :alt="product.name"
            size-suffix="sm"
            lazy
          />

          <span class="image-search-similar-products__name">{{ product.name }}</span>
        </router-link>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { getProductRoute } from "@/core/utilities";
import type { ImageSearchProductType } from "@/shared/layout/composables/useImageSearch";

interface IEmits {
  (event: "select"): void;
}

interface IProps {
  title: string;
  products: ImageSearchProductType[];
}

defineEmits<IEmits>();

defineProps<IProps>();
</script>

<style lang="scss">
.image-search-similar-products {
  @apply flex flex-col gap-2;

  &__title {
    @apply text-sm font-bold text-neutral-950;
  }

  &__list {
    @apply grid grid-cols-3 gap-2;
  }

  &__link {
    @apply flex h-full flex-col gap-1 rounded-[--vc-radius] border border-neutral-200 p-1.5 text-xs text-neutral-900;

    &:hover {
      @apply border-primary;
    }
  }

  &__image {
    @apply aspect-square w-full object-contain;
  }

  &__name {
    @apply line-clamp-2;
  }
}
</style>
