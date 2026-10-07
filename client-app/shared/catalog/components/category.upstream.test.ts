import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Category from "./category.vue";
import type { Product } from "@/core/api/graphql/types";
import type { VueWrapper } from "@vue/test-utils";
import type { Router } from "vue-router";

// The barcode lookup's behaviour that lives in the theme's own markup of this page: the heading
// and the props handed to the product list. Upstream's category.test.ts covers the rest of it.

const mocks = vi.hoisted(() => ({
  requests: 0,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/core/globals", () => ({
  globals: { catalogId: "catalog-1", currencyCode: "USD" },
}));

vi.mock("@/core/composables", async () => {
  const { ref } = await import("vue");
  const { useRouteQueryParam } = await import("@/core/composables/useRouteQueryParam");

  return {
    useAnalytics: () => ({ analytics: vi.fn() }),
    useRouteQueryParam,
    useThemeContext: () => ({ themeContext: ref({ settings: { catalog_pagination_mode: "infinite_scroll" } }) }),
  };
});

vi.mock("@/core/composables/useLanguages", () => ({
  useLanguages: () => ({ updateLocalizedUrl: vi.fn() }),
}));

vi.mock("@/core/composables/useModuleSettings", () => ({
  useModuleSettings: () => ({
    getSettingValue: (name: string) => (name === "Catalog.Search.BarcodeSearchFields" ? '["gtin"]' : undefined),
  }),
}));

vi.mock("@/shared/layout/composables/useSearchBar", () => ({
  useSearchBar: () => ({ clearSearchResults: vi.fn() }),
}));

vi.mock("@/shared/layout/composables/useSearchScore", async () => {
  const { ref } = await import("vue");

  return {
    useSearchScore: () => ({
      isCategoryScope: ref(false),
      preparingScope: ref(false),
      addScopeItem: vi.fn(),
      removeScopeItemByType: vi.fn(),
      setQueryScope: vi.fn(),
    }),
  };
});

vi.mock("@/shared/ship-to-location/composables", async () => {
  const { ref } = await import("vue");

  return {
    LOCAL_ID_PREFIX: "local-",
    useShipToLocation: () => ({ selectedAddress: ref(undefined) }),
  };
});

vi.mock("@/shared/catalog/composables/useCategorySeo", () => ({
  useCategorySeo: vi.fn(),
}));

vi.mock("@/shared/catalog/composables/useProductSortings", async () => {
  const { ref } = await import("vue");

  return {
    useProductSortings: () => ({ sortList: ref([]), selectedSort: ref("") }),
  };
});

// In-stock, purchased-before and a branch are all on, so a normal search has active filters to reset.
vi.mock("@/shared/catalog/composables", async () => {
  const { computed, ref } = await import("vue");
  const { useRouteQueryParam } = await import("@/core/composables/useRouteQueryParam");
  const { toFirstString } = await import("@/core/utilities/common");

  return {
    useCategory: () => ({ loading: ref(false), category: ref(undefined), fetchCategory: vi.fn() }),
    useProducts: () => {
      const products = ref<Product[]>([]);
      const productsFilters = ref({ facets: [], filters: [], inStock: true, branches: ["branch-1"] });
      const rawBarcodeQueryParam = useRouteQueryParam<string>("barcode", { defaultValue: "" });
      const barcodeQueryParam = computed(() => toFirstString(rawBarcodeQueryParam.value));

      return {
        facetsQueryParam: useRouteQueryParam<string>("facets", { defaultValue: "" }),
        searchQueryParam: useRouteQueryParam<string>("q", { defaultValue: "" }),
        sortQueryParam: useRouteQueryParam<string>("sort", { defaultValue: "" }),
        preserveUserQueryQueryParam: useRouteQueryParam<string>("preserveUserQuery", { defaultValue: "" }),
        barcodeQueryParam,
        isBarcodeLookup: computed(() => !!barcodeQueryParam.value),
        fetchingMoreProducts: ref(false),
        fetchingProducts: ref(false),
        fetchingFacets: ref(false),
        hasSelectedFacets: ref(false),
        hasSelectedFilters: computed(() => productsFilters.value.filters.length > 0),
        isFiltersSidebarVisible: ref(false),
        localStorageBranches: ref(["branch-1"]),
        localStorageInStock: ref(true),
        localStoragePurchasedBefore: ref(true),
        pagesCount: ref(1),
        pageHistory: ref<number[]>([]),
        products,
        productsFilters,
        sortings: ref([]),
        totalProductsCount: ref(2),
        currentPage: ref(1),

        fetchProducts: vi.fn(() => {
          mocks.requests += 1;
          products.value = [PRODUCT, OTHER_PRODUCT];

          return Promise.resolve({ items: products.value, totalCount: 2 });
        }),
        fetchMoreProducts: vi.fn(),
        applyFilters: vi.fn(),
        applyFiltersOnly: vi.fn(),
        hideFiltersSidebar: vi.fn(),
        openBranchesModal: vi.fn(),
        resetFacetFilters: vi.fn(),
        resetFacetAndControlsFilters: vi.fn(() => Promise.resolve()),
        resetSearchKeyword: vi.fn(),
        showFiltersSidebar: vi.fn(),
        updateCurrentPage: vi.fn(),
        resetCurrentPage: vi.fn(() => Promise.resolve()),
      };
    },
  };
});

function stubComponent(name: string) {
  return { default: defineComponent({ name, setup: () => () => h("div") }) };
}

vi.mock("@/shared/catalog/components/category-selector.vue", () => stubComponent("CategorySelector"));
vi.mock("@/shared/catalog/components/products-filters.vue", () => stubComponent("ProductsFilters"));
vi.mock("@/shared/catalog/components/view-mode.vue", () => stubComponent("ViewMode"));
vi.mock("@/shared/catalog/components/category/category-controls.vue", () => stubComponent("CategoryControls"));
vi.mock("@/shared/catalog/components/category/category-horizontal-filters.vue", () =>
  stubComponent("CategoryHorizontalFilters"),
);
vi.mock("@/shared/catalog/components/category/filters-popup-sidebar.vue", () => stubComponent("FiltersPopupSidebar"));
vi.mock("@/shared/catalog/components/active-filter-chips.vue", () => stubComponent("ActiveFilterChips"));

vi.mock("@/shared/catalog/components/category/category-products.vue", () => ({
  default: defineComponent({
    name: "CategoryProducts",
    props: ["keyword", "hasActiveFilters"],

    setup(props) {
      return () =>
        h("div", {
          "data-testid": "category-products",
          "data-keyword": props.keyword,
          "data-has-active-filters": String(props.hasActiveFilters),
        });
    },
  }),
}));

const SlotStub = defineComponent({
  setup(_props, { slots }) {
    return () => h("div", slots.default?.());
  },
});

const VcLayoutStub = defineComponent({
  name: "VcLayout",

  setup(_props, { slots }) {
    return () => h("div", [slots.sidebar?.(), slots.default?.()]);
  },
});

const I18nTStub = defineComponent({
  name: "I18nT",
  props: ["keypath"],

  setup(props, { slots }) {
    return () =>
      h("span", { "data-testid": "heading", "data-keypath": props.keypath }, [slots.barcode?.(), slots.keyword?.()]);
  },
});

const PRODUCT = { id: "product-1", code: "150701", slug: "hat-150701", name: "Hat" } as Product;
const OTHER_PRODUCT = { id: "product-2", code: "150701-B", slug: "cap-150701", name: "Cap" } as Product;

let router: Router;
let wrapper: VueWrapper | undefined;

async function mountAt(url: string) {
  const page = defineComponent({ setup: () => () => null });

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/search", name: "Search", component: page },
      { path: "/catalog", name: "Catalog", component: page },
      { path: "/:slug(.*)", name: "Product", component: page },
    ],
  });

  await router.push(url);
  await router.isReady();

  wrapper = mount(Category, {
    global: {
      plugins: [router],
      mocks: { $t: (key: string) => key, $n: String },
      components: { "i18n-t": I18nTStub },
      stubs: {
        VcLayout: VcLayoutStub,
        VcTypography: SlotStub,
        VcButton: SlotStub,
        VcChip: SlotStub,
        VcSelect: true,
        VcLabel: true,
        VcIcon: true,
      },
    },
  });

  await vi.waitFor(() => expect(mocks.requests).toBeGreaterThan(0));
  await flushPromises();
}

function productList() {
  return wrapper!.get('[data-testid="category-products"]');
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  mocks.requests = 0;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe("category page heading in a barcode lookup", () => {
  it("names the scanned code in the heading", async () => {
    await mountAt("/search?barcode=150701");

    const heading = wrapper!.get('[data-testid="heading"]');

    expect(heading.attributes("data-keypath")).toBe("pages.search.header_barcode");
    expect(heading.text()).toContain("150701");
  });

  it("names the keyword in a normal search", async () => {
    await mountAt("/search?q=hat");

    expect(wrapper!.get('[data-testid="heading"]').attributes("data-keypath")).toBe("pages.search.header");
  });
});

describe("category page product list in a barcode lookup", () => {
  it("is given the scanned code as its keyword", async () => {
    await mountAt("/search?barcode=150701");

    expect(productList().attributes("data-keyword")).toBe("150701");
  });

  it("is told no filters are active, though the stored preferences are on", async () => {
    await mountAt("/search?barcode=150701");

    expect(productList().attributes("data-has-active-filters")).toBe("false");
  });

  it("is told the stored preferences are active filters in a normal search", async () => {
    await mountAt("/search?q=hat");

    expect(productList().attributes("data-has-active-filters")).toBe("true");
  });
});
