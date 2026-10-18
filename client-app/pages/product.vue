<template>
  <template v-if="product && productTemplate">
    <VcContainer
      ref="productComponentAnchor"
      class="print:min-w-[1024px] print:bg-transparent print:px-0 print:[zoom:0.7]"
    >
      <FiltersPopupSidebar
        :is-exist-selected-facets="hasSelectedFacets"
        :popup-sidebar-filters="productsFilters"
        :facets-loading="fetchingFacets"
        :is-mobile="isMobile"
        :is-visible="isFiltersSidebarVisible"
        :loading="fetchingVariations"
        :hide-controls="false"
        @hide-popup-sidebar="hideFiltersSidebar"
        @reset-facet-filters="resetFacetFilters"
        @apply-filters="applyFilters"
      />

      <!-- the template's sections above the product -->
      <ProductTemplateSection
        v-for="entry in templateParts.before"
        :key="entry.item.id"
        :entry="entry"
        :product="product"
        :related-products="relatedProducts"
        :recommended-products="recommendedProducts"
        :settings="productTemplate.settings"
      />

      <!-- Breadcrumbs -->
      <VcBreadcrumbs class="mb-3" :items="breadcrumbs" />

      <VcTypography tag="h1">
        {{ selectedVariationName || product.name }}
      </VcTypography>

      <div
        class="mt-3 flex flex-wrap items-center gap-1 rounded-[--vc-radius] border border-neutral-100 bg-[--glass-row] px-3.5 py-3 empty:hidden max-sm:justify-between sm:gap-6"
      >
        <VcCopyText
          v-if="!product.hasVariations"
          :text="product.code"
          :notification="$t('pages.product.sku_copied_message')"
        >
          <span class="text-sm text-secondary-900">
            {{ $t("pages.product.sku_label") }}
            <span class="font-black">#{{ product.code }}</span>
          </span>
        </VcCopyText>

        <ProductRating v-if="productReviewsEnabled && product.rating" :rating="product.rating" with-review-count />
      </div>

      <VcLayout sidebar-position="right" sticky class="mt-5">
        <div class="space-y-5 xl:space-y-6">
          <component
            :is="getBlockType(templateParts.main.anchor.type)"
            v-if="templateParts.main?.anchor"
            v-bind="templateParts.main.anchor"
            :model="templateParts.main.anchor"
          />

          <component
            :is="productInfoSection?.type"
            v-if="productInfoSection && !productInfoSection.hidden"
            :product="product"
            :variations="variations"
            :model="productInfoSection"
            :fetching-variations="fetchingVariations"
          />

          <ProductConfiguration
            v-if="showConfiguration && !productDescriptionSection"
            :product-id="productId"
            :configuration="configuration ?? []"
            :initial-configuration="initialConfiguration"
          />

          <!-- the main column's own sections (description, reviews), in the template's order -->
          <template v-for="entry in templateParts.column" :key="entry.item.id">
            <component
              :is="getBlockType(entry.anchor.type)"
              v-if="entry.anchor"
              v-bind="entry.anchor"
              :model="entry.anchor"
            />

            <template v-if="entry.item.type === 'product-description'">
              <component
                :is="entry.item.type"
                v-if="!entry.item.hidden"
                :product="product"
                :model="entry.item"
                :is-collapsible="false"
              />

              <ProductConfiguration
                v-if="showConfiguration"
                :product-id="productId"
                :configuration="configuration ?? []"
                :initial-configuration="initialConfiguration"
              />
            </template>

            <template v-else>
              <KeepAlive>
                <ProductReviews
                  v-if="productReviewsEnabled && !entry.item.hidden"
                  :product-id="productId"
                  :product-rating="product.rating"
                />
              </KeepAlive>

              <!-- in the designer, the section shows even while the customer reviews module is off -->
              <SectionPlaceholder
                v-if="!productReviewsEnabled && !entry.item.hidden && inDesigner"
                :title="$t('common.labels.product_reviews')"
                icon="chat"
              />
            </template>
          </template>

          <!-- reviews show unless a template hides them -->
          <KeepAlive>
            <ProductReviews
              v-if="productReviewsEnabled && !productReviewsSection"
              :product-id="productId"
              :product-rating="product.rating"
            />
          </KeepAlive>

          <component
            :is="productVariationsBlock?.type"
            v-if="productVariationsBlock && !productVariationsBlock.hidden && product.hasVariations"
            :variations="variations"
            :sort="variationSortInfo"
            :model="productVariationsBlock"
            :fetching-variations="fetchingVariations"
            :page-number="variationsPageNumber"
            :pages-count="variationsPagesCount"
            :products-filters="productsFilters"
            :has-selected-filters="hasSelectedFacets"
            :product-id="productId"
            :product-name="product.name"
            @apply-sorting="sortVariations"
            @change-page="changeVariationsPage"
            @show-filters="showFiltersSidebar"
            @reset-filters="resetFacetFilters"
            @apply-filters="applyFilters"
          />
        </div>

        <template #sidebar>
          <ProductPriceBlock
            :product="product"
            :class="['max-md:mt-5', { 'print:hidden': product.hasVariations }]"
            :is-mobile="isMobile"
            :template-layout="templateLayout"
            :variations="variations"
          />

          <ProductVendor :class="['mt-5', { 'print:hidden': product.hasVariations }]" :product="product" />

          <ProductPickupLocations
            v-if="xPickupEnabled && pickupLocations?.length > 0 && product.availabilityData.isAvailable"
            :loading="pickupLocationsLoading"
            :product-id="productId"
            class="mt-5"
          />
        </template>
      </VcLayout>

      <!-- the template's sections below the product (related and recommended products, and any other) -->
      <ProductTemplateSection
        v-for="entry in templateParts.after"
        :key="entry.item.id"
        :entry="entry"
        :product="product"
        :related-products="relatedProducts"
        :recommended-products="recommendedProducts"
        :settings="productTemplate.settings"
      />

      <!-- the designer preview's marker after the last section -->
      <component
        :is="getBlockType(templateParts.end.type)"
        v-if="templateParts.end"
        v-bind="templateParts.end"
        :model="templateParts.end"
      />
    </VcContainer>

    <FloatingBar v-if="isMobile">
      <ProductPrice :product="product" :variations="variations" :template-layout="templateLayout" />
    </FloatingBar>
  </template>

  <Error404 v-else-if="!fetchingProduct && productTemplate" />
</template>

<script setup lang="ts">
import { useSeoMeta } from "@unhead/vue";
import { useBreakpoints, useElementVisibility, useLocalStorage } from "@vueuse/core";
import { computed, defineAsyncComponent, ref, shallowRef, toRef, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useBreadcrumbs, useAnalytics, usePageTitle, useSeoKeywords } from "@/core/composables";
import { useHistoricalEvents } from "@/core/composables/useHistoricalEvents";
import { useLanguages } from "@/core/composables/useLanguages";
import { useModuleSettings } from "@/core/composables/useModuleSettings";
import {
  LOCAL_PRODUCT_CONFIGURATIONS_LOCAL_STORAGE,
  CONFIGURATION_URL_SEARCH_PARAM,
  LINE_ITEM_ID_URL_SEARCH_PARAM,
} from "@/core/constants";
import { SortDirection } from "@/core/enums";
import { globals } from "@/core/globals";
import {
  buildBreadcrumbs,
  generateFilterExpressionFromFilters,
  getFilterExpression,
  getFilterExpressionForAvailableIn,
  getFilterExpressionForInStock,
  getFilterExpressionForPurchasedBefore,
  getSortingExpression,
  getUrlSearchParam,
} from "@/core/utilities";
import {
  MODULE_ID as CUSTOMER_REVIEWS_MODULE_ID,
  ENABLED_KEY as CUSTOMER_REVIEWS_ENABLED_KEY,
} from "@/modules/customer-reviews/constants";
import { getBlockType } from "@/plugins/builder-preview/block-mapping";
import { isDesignerPreview } from "@/plugins/builder-preview/utils";
import { useShortCart } from "@/shared/cart";
import {
  useProduct,
  useRelatedProducts,
  ProductVendor,
  ProductPrice,
  ProductConfiguration,
  useProducts,
  useRecommendedProducts,
  useConfigurableProduct,
  useProductPickupLocations,
  useProductVariations,
  useLoyaltyCatalogCurrency,
} from "@/shared/catalog";
import { useProductVariationProperties } from "@/shared/catalog/composables/useProductVariationProperties";
import {
  PRODUCT_VARIATIONS_LAYOUT_PROPERTY_NAME,
  PRODUCT_VARIATIONS_LAYOUT_PROPERTY_VALUES,
} from "@/shared/catalog/constants/product";
import { FloatingBar } from "@/shared/common";
import { BUILT_IN_TEMPLATES, splitTemplate, useAnchorScroll, useThemeTemplates } from "@/shared/static-content";
import { useXPickup } from "@/shared/x-pickup/composables/useXPickup";
import { BREAKPOINTS } from "@/ui-kit/constants";
import type { ISortInfo } from "@/core/types";
import type { FiltersDisplayOrderType, LocalConfigurationType, ProductsFiltersType } from "@/shared/catalog";
import type { IPageTemplate } from "@/shared/static-content";
import ProductRating from "@/modules/customer-reviews/components/product-rating.vue";
import FiltersPopupSidebar from "@/shared/catalog/components/category/filters-popup-sidebar.vue";
import ProductTemplateSection from "@/shared/catalog/components/product/product-template-section.vue";
import ProductPickupLocations from "@/shared/catalog/components/product-pickup-locations.vue";
import ProductPriceBlock from "@/shared/catalog/components/product-price-block.vue";
import SectionPlaceholder from "@/shared/static-content/components/section-placeholder.vue";

const props = withDefaults(defineProps<IProps>(), {
  productId: "",
});

const B2C_VARIATIONS_ITEMS_PER_PAGE = 150;

const ProductReviews = defineAsyncComponent(() => import("@/modules/customer-reviews/components/product-reviews.vue"));
const Error404 = defineAsyncComponent(() => import("@/pages/404.vue"));

interface IProps {
  productId?: string;
  allowSetMeta?: boolean;
  filtersDisplayOrder?: FiltersDisplayOrderType;
}

const configurationId = getUrlSearchParam(CONFIGURATION_URL_SEARCH_PARAM);
const lineItemId = getUrlSearchParam(LINE_ITEM_ID_URL_SEARCH_PARAM);

const breakpoints = useBreakpoints(BREAKPOINTS);
const isMobile = breakpoints.smaller("md");

const productId = toRef(props, "productId");
const filtersDisplayOrder = toRef(props, "filtersDisplayOrder");

const loyaltyCurrencyOverride = useLoyaltyCatalogCurrency();

const {
  product,
  fetching: fetchingProduct,
  fetchProduct,
} = useProduct({
  currencyCodeOverride: loyaltyCurrencyOverride,
});
const { fetchProductConfiguration, configuration } = useConfigurableProduct(productId);
const {
  fetchingProducts: fetchingVariations,
  products: variations,
  pagesCount: variationsPagesCount,
  fetchingFacets,
  fetchProducts,
  hasSelectedFacets,
  isFiltersSidebarVisible,
  productsFilters,
  applyFilters: _applyFilters,
  hideFiltersSidebar: _hideFiltersSidebar,
  resetFacetFilters: _resetFacetFilters,
  showFiltersSidebar,
} = useProducts({
  withFacets: true,
  filtersDisplayOrder,
  currencyCodeOverride: loyaltyCurrencyOverride,
});
const { relatedProducts, fetchRelatedProducts } = useRelatedProducts();
const { recommendedProducts, fetchRecommendedProducts } = useRecommendedProducts();
const { applicableVariations } = useProductVariationProperties(variations);

const { pickupLocations, fetchPickupLocations, pickupLocationsLoading } = useProductPickupLocations();

const { isEnabled } = useModuleSettings(CUSTOMER_REVIEWS_MODULE_ID);
const productReviewsEnabled = isEnabled(CUSTOMER_REVIEWS_ENABLED_KEY);
const inDesigner = isDesignerPreview();
const { xPickupEnabled } = useXPickup();

const { analytics } = useAnalytics();
const { pushHistoricalEvent } = useHistoricalEvents();

const router = useRouter();
const route = useRoute();

useAnchorScroll(() => product.value);

const { cart, loading: loadingCart } = useShortCart();
const { updateLocalizedUrl } = useLanguages();

const localProductConfigurations = useLocalStorage<LocalConfigurationType[]>(
  LOCAL_PRODUCT_CONFIGURATIONS_LOCAL_STORAGE,
  [],
);

const initialConfiguration = computed(() => {
  const configurationLocal = localProductConfigurations.value.find((config) => config.localId === configurationId);
  return configurationLocal?.configuration;
});

const selectedVariationName = computed(() => {
  return applicableVariations.value.length === 1 ? applicableVariations.value[0].name : undefined;
});

const { templateFor, previewFor, loadTemplateRules } = useThemeTemplates();
// the rules load alongside the product
void loadTemplateRules();
/** The template the store's rules picked for this product (once it has loaded) */
const ruledTemplate = shallowRef<IPageTemplate>();
/** The page designer's product template while it edits one, else the one the rules picked */
const productTemplate = computed(() => previewFor("product") ?? ruledTemplate.value);

async function resolveProductTemplate(): Promise<void> {
  const current = product.value;
  ruledTemplate.value = await templateFor(
    "product",
    {
      // its outline, and the breadcrumb's path too (a virtual catalog's own categories)
      outlines: [current?.outline, current?.breadcrumbs?.map((crumb) => crumb.itemId).join("/")].filter(
        (outline): outline is string => !!outline,
      ),
      productType: current?.productType ?? undefined,
      properties: current?.properties ?? [],
    },
    BUILT_IN_TEMPLATES,
  );
}

const productInfoSection = computed(() =>
  productTemplate.value?.content?.find((item) => item?.type === "product-info"),
);

const productDescriptionSection = computed(() =>
  productTemplate.value?.content?.find((item) => item?.type === "product-description"),
);

const productReviewsSection = computed(() =>
  productTemplate.value?.content?.find((item) => item?.type === "product-reviews"),
);

const productVariationsBlock = computed(() =>
  productInfoSection.value?.blocks?.find((block) => block?.type === "product-variations"),
);

const relatedProductsSection = computed(() =>
  productTemplate.value?.content?.find((item) => item?.type === "related-products"),
);

const recommendedProductsSection = computed(() =>
  productTemplate.value?.content?.find((item) => item?.type === "recommended-products"),
);

/** Sections shown in the product's main column, beside the price, rather than across the page */
const MAIN_COLUMN_SECTIONS = new Set(["product-description", "product-reviews"]);

/** The template's sections around the product (its `product-info` section): above it, its column's, below it */
const templateParts = computed(() =>
  splitTemplate(productTemplate.value?.content ?? [], "product-info", MAIN_COLUMN_SECTIONS),
);

/** The product's VirtoFrontend_UI_Layout property: B2B or B2C */
const layoutProperty = computed(() => {
  const value = product.value?.properties?.find(
    (property) => property.name === PRODUCT_VARIATIONS_LAYOUT_PROPERTY_NAME,
  )?.value;
  return typeof value === "string" ? value : undefined;
});

/** B2C variations (more per page, unsorted, in stock only): the template's product info says so, else the product */
const isB2cLayout = computed(() => {
  const variationsLayout = productInfoSection.value?.variationsLayout;
  return typeof variationsLayout === "string"
    ? variationsLayout === "b2c"
    : layoutProperty.value === PRODUCT_VARIATIONS_LAYOUT_PROPERTY_VALUES.b2c;
});

/** The layout the price shows variations for */
const templateLayout = computed(() =>
  isB2cLayout.value ? PRODUCT_VARIATIONS_LAYOUT_PROPERTY_VALUES.b2c : layoutProperty.value,
);

const showConfiguration = computed(() => !!product.value?.isConfigurable && !!configuration.value?.length);

const variationSortInfo = ref<ISortInfo>({
  column: "name",
  direction: SortDirection.Ascending,
});

const variationsItemsPerPage = computed(() => (isB2cLayout.value ? B2C_VARIATIONS_ITEMS_PER_PAGE : 50));

const variationsSort = computed(() => (isB2cLayout.value ? undefined : getSortingExpression(variationSortInfo.value)));

const variationsFilterExpression = computed(() => `productfamilyid:${productId.value} is:product,variation`);

const variationsFilterBuilder = () => {
  const baseFilters = [variationsFilterExpression.value];

  const facetFilters = generateFilterExpressionFromFilters(productsFilters.value.filters);
  if (facetFilters) {
    baseFilters.push(facetFilters);
  }

  if (isB2cLayout.value) {
    return getFilterExpression([
      ...baseFilters,
      getFilterExpressionForAvailableIn([]),
      getFilterExpressionForInStock(true),
    ]);
  }

  return getFilterExpression([
    ...baseFilters,
    getFilterExpressionForAvailableIn(productsFilters.value.branches),
    getFilterExpressionForInStock(productsFilters.value.inStock),
    getFilterExpressionForPurchasedBefore(productsFilters.value.purchasedBefore),
  ]);
};

const { variationsSearchParams, updateSearchParams } = useProductVariations({
  productsFilters,
  itemsPerPage: variationsItemsPerPage,
  sort: variationsSort,
  variationsFilterExpression,
  customFilterBuilder: variationsFilterBuilder,
  customFilterBuilderDeps: [isB2cLayout, productsFilters],
});

const variationsPageNumber = computed(() => variationsSearchParams.value.page ?? 1);

const seoTitle = computed(() => product.value?.seoInfo?.pageTitle || product.value?.name);
const { title: pageTitle } = usePageTitle(seoTitle);
const seoDescription = computed(() => product.value?.seoInfo?.metaDescription);
const seoKeywords = computed(() => product.value?.seoInfo?.metaKeywords);
const seoImageUrl = computed(() => product.value?.imgSrc);
const seoUrl = computed(() =>
  product.value?.seoInfo?.semanticUrl
    ? `${window.location.host}\${product.value?.seoInfo?.semanticUrl}`
    : window.location.toString(),
);
const canSetMeta = computed(() => props.allowSetMeta && productComponentAnchorIsVisible.value);

const breadcrumbs = useBreadcrumbs(() => buildBreadcrumbs(product.value?.breadcrumbs));

const productComponentAnchor = shallowRef<HTMLElement | null>(null);
const productComponentAnchorIsVisible = useElementVisibility(productComponentAnchor);

async function sortVariations(sortInfo: ISortInfo): Promise<void> {
  variationSortInfo.value = sortInfo;

  updateSearchParams({ page: 1 });

  await fetchProducts(variationsSearchParams.value, isB2cLayout.value);
}

async function changeVariationsPage(pageNumber: number): Promise<void> {
  updateSearchParams({ page: pageNumber });

  await fetchProducts(variationsSearchParams.value, isB2cLayout.value);
}

async function applyFilters(newFilters: ProductsFiltersType): Promise<void> {
  await _applyFilters(newFilters);

  updateSearchParams({
    page: 1,
    filter: getFilterExpression([
      variationsFilterExpression.value,
      generateFilterExpressionFromFilters(newFilters.filters),
      getFilterExpressionForInStock(newFilters.inStock),
      getFilterExpressionForAvailableIn(newFilters.branches),
      getFilterExpressionForPurchasedBefore(newFilters.purchasedBefore),
    ]),
  });

  await fetchProducts(variationsSearchParams.value, isB2cLayout.value);
}

async function resetFacetFilters(): Promise<void> {
  await _resetFacetFilters();
  void applyFilters(productsFilters.value);
}

function hideFiltersSidebar(): void {
  _hideFiltersSidebar();
  const variationsFiltersButton = document.getElementById(`${productId.value}-variations-filters-button`);
  if (variationsFiltersButton) {
    variationsFiltersButton.focus();
  }
}

function checkLineItemId() {
  const cartItems = cart.value?.items;
  return cartItems?.some((item) => item.id === lineItemId);
}

useSeoMeta({
  title: () => (canSetMeta.value ? pageTitle.value : undefined),
  description: () => (canSetMeta.value ? seoDescription.value : undefined),
  ogUrl: () => (canSetMeta.value ? seoUrl.value : undefined),
  ogTitle: () => (canSetMeta.value ? pageTitle.value : undefined),
  ogDescription: () => (canSetMeta.value ? seoDescription.value : undefined),
  ogImage: () => (canSetMeta.value ? seoImageUrl.value : undefined),
  ogType: () => (canSetMeta.value ? "website" : undefined),
});

useSeoKeywords(() => (canSetMeta.value ? seoKeywords.value : undefined));

const MAX_PICKUP_LOCATIONS_COUNT = 1;

watch(
  productId,
  async () => {
    await fetchProduct(productId.value);
    // the template decides which sections show, so which data is fetched below
    await resolveProductTemplate();
    if (product.value?.isConfigurable) {
      await fetchProductConfiguration();
    }

    if (product.value?.associations?.totalCount && !relatedProductsSection.value?.hidden) {
      await fetchRelatedProducts({
        productId: productId.value,
        itemsPerPage: 30,
        currencyCodeOverride: loyaltyCurrencyOverride.value,
      });
    }

    const recommendedProductsBlocks = recommendedProductsSection.value?.blocks?.filter((block) => !!block.model) ?? [];
    if (!recommendedProductsSection.value?.hidden && recommendedProductsSection.value?.blocks?.length) {
      const paramsToFetch = recommendedProductsBlocks.map(({ model }) => ({
        productId: productId.value,
        model: model as string,
        currencyCodeOverride: loyaltyCurrencyOverride.value,
      }));
      await fetchRecommendedProducts(paramsToFetch);
    }

    const showVariations = productVariationsBlock.value && !productVariationsBlock.value?.hidden;
    const optionsBlock = productInfoSection.value?.blocks?.find((block) => block?.type === "product-options");
    const showOptions = optionsBlock && !optionsBlock?.hidden;

    if (product.value?.hasVariations && (showVariations || showOptions)) {
      await fetchProducts(variationsSearchParams.value, isB2cLayout.value);
    }

    if (xPickupEnabled.value && product.value) {
      await fetchPickupLocations({ productId: productId.value, first: MAX_PICKUP_LOCATIONS_COUNT });
    }

    updateLocalizedUrl(product.value?.slug);
  },
  { immediate: true },
);

/**
 * Send Google Analytics event and historical event for product.
 */

const fetchedProductId = computed(() => product.value?.id);

watch(
  fetchedProductId,
  () => {
    if (fetchedProductId.value && product.value) {
      analytics("viewItem", product.value);

      void pushHistoricalEvent({
        eventType: "click",
        productId: product.value.id,
        storeId: globals.storeId,
      });
    }
  },
  { immediate: true },
);

watch(
  [() => lineItemId, cart, loadingCart],
  () => {
    if (loadingCart.value && !(cart.value && lineItemId)) {
      return;
    }

    const isExist = checkLineItemId();
    if (!isExist) {
      void router.replace({ ...route, query: { ...route.query, [LINE_ITEM_ID_URL_SEARCH_PARAM]: undefined } });
    }
  },
  { immediate: true },
);
</script>
