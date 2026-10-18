import categoryTemplateDefault from "@/config/category-default.json";
import productTemplateDefault from "@/config/product-default.json";
import productTemplateB2c from "@/config/product_b2c.json";
import type { IPageTemplate } from "../types";

/**
 * The templates built into the storefront, by key: what a page shows while the theme has none of its own. The page
 * designer starts a template the theme doesn't have yet from these (the preview announces them).
 */
export const BUILT_IN_TEMPLATES: Readonly<Record<string, IPageTemplate>> = {
  product: productTemplateDefault as IPageTemplate,
  "product.b2c": productTemplateB2c as IPageTemplate,
  category: categoryTemplateDefault as IPageTemplate,
  // just the page
  page: { settings: {}, content: [{ id: "page-content", type: "page-content" }] } as unknown as IPageTemplate,
};
