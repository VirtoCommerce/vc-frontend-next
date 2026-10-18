<template>
  <template v-if="entry.item.type === 'related-products' || entry.item.type === 'recommended-products'">
    <!-- the designer preview's marker where the section starts (its outlines and scrolling) -->
    <component :is="getBlockType(entry.anchor.type)" v-if="entry.anchor" v-bind="entry.anchor" :model="entry.anchor" />

    <template v-if="!entry.item.hidden">
      <component
        :is="entry.item.type"
        v-if="entry.item.type === 'related-products'"
        :related-products="relatedProducts"
        :product-id="product.id"
        :product-name="product.name"
        class="mt-5 xl:mt-6"
      />

      <component
        :is="entry.item.type"
        v-for="{ model, id } in entry.item.blocks ?? []"
        v-else
        :key="id"
        :recommended-products="recommendedProducts[model as string]"
        :title="$t(`pages.product.recommended_products.${model}_section_title`)"
        :model="model"
        :product-id="product.id"
        :product-name="product.name"
        class="mt-5 xl:mt-6"
      />
    </template>
  </template>

  <!-- any other section a product template holds (text, image, banners…), given the product -->
  <TemplateSection v-else :entry="entry" :settings="settings" :context="{ product }" class="mt-5 xl:mt-6" />
</template>

<script setup lang="ts">
import { getBlockType } from "@/plugins/builder-preview/block-mapping";
import type { Product } from "@/core/api/graphql/types";
import type { TemplateEntryType } from "@/shared/static-content";
import TemplateSection from "@/shared/static-content/components/template-section.vue";

interface IProps {
  /** a section of the product template */
  entry: TemplateEntryType;
  product: Product;
  relatedProducts: readonly Product[];
  /** the recommendation lists by model, for the recommended-products sections */
  recommendedProducts: Readonly<Record<string, unknown>>;
  settings?: Record<string, unknown>;
}

defineProps<IProps>();
</script>
