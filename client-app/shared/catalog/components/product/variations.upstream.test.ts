import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { getItem, vTrackItem } from "@/core/plugins/dom-analytics/registry";
import Variations from "./variations.vue";
import type { Product } from "@/core/api/graphql/types";

const VARIATIONS = [{ id: "V1", name: "Blue, L" }] as Product[];

function mountVariations() {
  return mount(Variations, {
    props: {
      variations: VARIATIONS,
      fetchingVariations: false,
      sort: { column: "name", direction: "asc" },
      model: {},
      pageNumber: 1,
      pagesCount: 1,
      hasSelectedFilters: false,
      productId: "P1",
      productName: "Flannel shirt",
    },
    global: {
      directives: { trackItem: vTrackItem },
      mocks: { $t: (key: string) => (key === "shared.catalog.product_details.variations.title" ? "Variations" : key) },
      stubs: {
        VcWidget: { template: `<section><slot /></section>` },
        VariationsDefault: true,
        VariationsTable: true,
        ActiveFilterChips: true,
        VcButton: true,
      },
    },
  });
}

describe("Variations analytics list", () => {
  it("marks the widget as a product list related to the product", () => {
    const root = mountVariations().find("section");

    expect(root.attributes()).toMatchObject({
      "data-vc-track": "product-list",
      "data-list-id": "variations",
      "data-list-name": "Variations Flannel shirt",
      "data-related-id": "P1",
      "data-related-type": "product",
    });
  });

  it("registers the variations as the list's items", () => {
    expect(getItem(mountVariations().find("section").element)).toEqual(VARIATIONS);
  });
});
