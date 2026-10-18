<template>
  <VcWidget v-if="recommendedProducts?.length" :title="title" prepend-icon="cube" icon-shape size="lg">
    <VcProductsGrid short :columns="{ md: 5, lg: 6, '2xl': 7 }">
      <ProductCardRecommended
        v-for="(item, index) in recommendedProducts"
        :key="index"
        :product="item"
        @link-click="selectItemEvent(item)"
      />
    </VcProductsGrid>
  </VcWidget>

  <!-- in the designer, an empty recommendation list still shows where it goes -->
  <SectionPlaceholder v-else-if="inDesigner" :title="title" icon="cube" layout="grid" />
</template>

<script setup lang="ts">
import { toRef, watch, computed } from "vue";
import { useAnalytics } from "@/core/composables/useAnalytics";
import { isDesignerPreview } from "@/plugins/builder-preview/utils";
import { ProductCardRecommended } from "@/shared/catalog";
import SectionPlaceholder from "./section-placeholder.vue";
import type { Product } from "@/core/api/graphql/types";

const props = defineProps<IProps>();

interface IProps {
  recommendedProducts?: Product[];
  title: string;
  model: string;
  productId: string;
  productName: string;
}
const recommendedProducts = toRef(props, "recommendedProducts");

const inDesigner = isDesignerPreview();

const { analytics } = useAnalytics();

const recommendedProductsListProperties = computed(() => ({
  item_list_id: `recommended_products_${props.model}`,
  item_list_name: `${props.title} ${props.productName}`,
  related_id: props.productId,
  related_type: "product",
}));

function selectItemEvent(item: Product) {
  analytics("selectItem", item, recommendedProductsListProperties.value);
}

watch(
  recommendedProducts,
  (recommendedProductsValue) => {
    if (!recommendedProductsValue?.length) {
      return;
    }

    analytics("viewItemList", recommendedProductsValue, recommendedProductsListProperties.value);
  },
  {
    immediate: true,
  },
);
</script>
