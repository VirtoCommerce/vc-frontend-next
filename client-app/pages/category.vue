<template>
  <VcContainer v-if="categoryTemplate">
    <!-- the template's sections above the product listing -->
    <TemplateSection
      v-for="entry in templateParts.before"
      :key="entry.item.id"
      :entry="entry"
      :settings="categoryTemplate.settings"
      :context="{ category: currentCategory }"
      class="mb-5 xl:mb-6"
    />

    <component
      :is="getBlockType(templateParts.main.anchor.type)"
      v-if="templateParts.main?.anchor"
      v-bind="templateParts.main.anchor"
      :model="templateParts.main.anchor"
    />

    <Category
      v-if="listing && !listing.hidden"
      v-bind="listingSettings"
      :category-id="categoryId"
      :currency-code-override="loyaltyCurrencyOverride"
      allow-set-meta
    >
      <template v-if="currentCategory?.breadcrumbs && !listing.hideBreadcrumbs" #breadcrumbs>
        <VcBreadcrumbs :items="breadcrumbs" />
      </template>
    </Category>

    <!-- the template's sections below the product listing -->
    <TemplateSection
      v-for="entry in templateParts.after"
      :key="entry.item.id"
      :entry="entry"
      :settings="categoryTemplate.settings"
      :context="{ category: currentCategory }"
      class="mt-5 xl:mt-6"
    />

    <!-- the designer preview's marker after the last section -->
    <component
      :is="getBlockType(templateParts.end.type)"
      v-if="templateParts.end"
      v-bind="templateParts.end"
      :model="templateParts.end"
    />
  </VcContainer>
</template>

<script setup lang="ts">
import { computed, shallowRef, toRefs, watch } from "vue";
import { useBreadcrumbs } from "@/core/composables";
import { buildBreadcrumbs } from "@/core/utilities";
import { getBlockType } from "@/plugins/builder-preview/block-mapping";
import { useCategory } from "@/shared/catalog/composables/useCategory";
import { useLoyaltyCatalogCurrency } from "@/shared/catalog/composables/useLoyaltyCatalogCurrency";
import { BUILT_IN_TEMPLATES, splitTemplate, useThemeTemplates } from "@/shared/static-content";
import type { IPageTemplate } from "@/shared/static-content";
import Category from "@/shared/catalog/components/category.vue";
import TemplateSection from "@/shared/static-content/components/template-section.vue";

interface IProps {
  categoryId?: string;
}

const props = defineProps<IProps>();

const { categoryId } = toRefs(props);

const { category: currentCategory, fetchCategory } = useCategory();
const loyaltyCurrencyOverride = useLoyaltyCatalogCurrency();

const breadcrumbs = useBreadcrumbs(() => buildBreadcrumbs(currentCategory.value?.breadcrumbs));

const { templateFor, previewFor, loadTemplateRules } = useThemeTemplates();
// the rules load alongside the category
void loadTemplateRules();
/** The template the store's rules picked for this category (once it has loaded) */
const ruledTemplate = shallowRef<IPageTemplate>();
/** The page designer's category template while it edits one, else the one the rules picked */
const categoryTemplate = computed(() => previewFor("category") ?? ruledTemplate.value);

/** The template's sections around the category's product listing (its `category-listing` section) */
const templateParts = computed(() => splitTemplate(categoryTemplate.value?.content ?? [], "category-listing"));
const listing = computed(() => templateParts.value.main?.item);

/** The product listing's settings that it takes (the same ones as the `category` page section) */
const LISTING_SETTINGS = [
  "hideSidebar",
  "hideControls",
  "hideSorting",
  "hideTotal",
  "viewMode",
  "filtersOrientation",
  "filtersDisplayOrder",
  "cardType",
  "columnsAmountTablet",
  "columnsAmountDesktop",
  "showButtonToDefaultView",
] as const;

/** A setting left empty, or at the schema's "<unset>" choice, keeps the listing's own default */
const isSet = (value: unknown) => value !== undefined && value !== null && value !== "" && value !== "<unset>";

const listingSettings = computed(() =>
  Object.fromEntries(
    LISTING_SETTINGS.filter((key) => isSet(listing.value?.[key])).map((key) => [key, listing.value?.[key]]),
  ),
);

watch(
  categoryId,
  async (newCategoryId) => {
    if (newCategoryId) {
      await fetchCategory({
        categoryId: newCategoryId,
        maxLevel: 0,
        currencyCode: loyaltyCurrencyOverride.value,
      });
    }
    const category = currentCategory.value;
    ruledTemplate.value = await templateFor(
      "category",
      { id: category?.id, outlines: category?.outline ? [category.outline] : [] },
      BUILT_IN_TEMPLATES,
    );
  },
  { immediate: true },
);
</script>
