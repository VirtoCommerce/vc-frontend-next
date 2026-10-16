import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { getItem, vTrackItem } from "@/core/plugins/dom-analytics/registry";
import RecommendedProducts from "./recommended-products.vue";
import type { Product } from "@/core/api/graphql/types";

const PRODUCTS = [{ id: "R1", name: "Cap" }] as Product[];

function mountRecommended() {
  return mount(RecommendedProducts, {
    props: {
      recommendedProducts: PRODUCTS,
      title: "Customers bought together",
      model: "bought-together",
      productId: "P1",
      productName: "Flannel shirt",
    },
    global: {
      directives: { trackItem: vTrackItem },
      stubs: {
        VcWidget: { template: `<section><slot /></section>` },
        ProductCardRecommended: true,
      },
    },
  });
}

describe("RecommendedProducts analytics list", () => {
  it("marks the widget as a product list named after the block and the product", () => {
    const root = mountRecommended().find("section");

    expect(root.attributes()).toMatchObject({
      "data-vc-track": "product-list",
      "data-list-id": "recommended_products_bought-together",
      "data-list-name": "Customers bought together Flannel shirt",
      "data-related-id": "P1",
      "data-related-type": "product",
    });
  });

  it("registers the recommended products as the list's items", () => {
    expect(getItem(mountRecommended().find("section").element)).toEqual(PRODUCTS);
  });
});
