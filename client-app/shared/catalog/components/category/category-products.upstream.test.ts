import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import CategoryProducts from "./category-products.vue";
import type { Product } from "@/core/api/graphql/types";

vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vueuse/core")>()),
  useBreakpoints: () => ({
    smaller: () => ref(true),
    isSmaller: () => true,
    isInBetween: () => false,
    isGreaterOrEqual: () => false,
  }),
  useWindowScroll: () => ({ y: ref(500) }),
}));

vi.mock("@/shared/catalog/composables/useCatalogGridMotion", () => ({
  useCatalogGridMotion: () => ({
    displayedViewMode: ref("grid"),
    enter: () => Promise.resolve(),
    flip: () => Promise.resolve(true),
  }),
}));

vi.mock("@/core/composables", () => ({ useBrowserTarget: () => ({ browserTarget: ref("_self") }) }));

vi.mock("@/shared/catalog/components", () => {
  const stub = (name: string) => defineComponent({ name, setup: () => () => h("div", { class: name }) });

  return {
    ProductCard: stub("product-card"),
    ProductSkeletonGrid: stub("product-skeleton"),
    ProductSkeletonList: stub("product-skeleton"),
  };
});

const VcButtonStub = { name: "VcButton", props: ["icon"], template: "<button type='button'><slot /></button>" };

describe("CategoryProducts scroll to top", () => {
  it("names the phone's scroll-to-top button with the ui-kit's label", () => {
    const wrapper = mount(CategoryProducts, {
      props: {
        fetchingMoreProducts: false,
        fetchingProducts: false,
        hasActiveFilters: false,
        pagesCount: 1,
        pageHistory: [1],
        pageNumber: 1,
        products: [{ id: "p-1" } as Product],
        savedViewMode: "grid" as const,
        sortToken: 0,
      },
      global: {
        stubs: { VcButton: VcButtonStub, VcInfinityScrollLoader: true },
        mocks: { $t: (key: string) => key },
      },
    });

    expect(wrapper.get(".category-products__scroll-top").attributes("aria-label")).toBe("ui_kit.buttons.scroll_to_top");
  });
});
