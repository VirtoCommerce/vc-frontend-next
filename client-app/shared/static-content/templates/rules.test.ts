import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATE_RULES, parseTemplateRules, resolveTemplate, ruleMatches } from "./rules";
import type { ITemplateRules } from "./rules";

const rules: ITemplateRules = {
  version: 1,
  product: [
    { template: "product.off", when: { inCategory: ["printers"] }, disabled: true },
    { template: "product.printer", when: { inCategory: ["printers"] } },
    { template: "product.configurable", when: { productType: "Configurable" } },
    { template: "product.bundle", when: { property: { name: "Bundle", equals: true } } },
    { template: "product.future", when: { unknownCondition: 1 } },
  ],
  category: [{ template: "category.brands", when: { inCategory: ["brands"] } }],
  page: [
    { template: "page.landing", when: { path: "/landing/*" } },
    { template: "page.article", when: { source: "blog" } },
    { template: "page.german", when: { language: "de" } },
    { template: "page.campaign", when: { setting: { name: "campaign", equals: true } } },
  ],
};

describe("resolveTemplate", () => {
  it("takes the first enabled rule that matches, in order", () => {
    const printer = { outlines: ["catalog/printers/inkjet"], productType: "Configurable" };
    expect(resolveTemplate("product", printer, rules)).toEqual({
      pageType: "product",
      template: "product.printer",
      rule: 1,
    });
  });

  it("matches a category anywhere up the outline", () => {
    expect(resolveTemplate("product", { outlines: ["catalog/printers/inkjet/color"] }, rules).template).toBe(
      "product.printer",
    );
    expect(resolveTemplate("category", { id: "brands", outlines: ["catalog"] }, rules).template).toBe(
      "category.brands",
    );
    expect(resolveTemplate("category", { id: "acme", outlines: ["catalog/brands/acme"] }, rules).template).toBe(
      "category.brands",
    );
  });

  it("checks product type and properties (lists too, strings case-insensitive)", () => {
    expect(resolveTemplate("product", { productType: "configurable" }, rules).template).toBe("product.configurable");
    expect(resolveTemplate("product", { properties: [{ name: "bundle", value: true }] }, rules).template).toBe(
      "product.bundle",
    );
    expect(resolveTemplate("product", { properties: [{ name: "Bundle", value: [false, true] }] }, rules).template).toBe(
      "product.bundle",
    );
  });

  it("falls back to the type's default; an unknown condition never matches", () => {
    expect(resolveTemplate("product", { outlines: ["catalog/ink"] }, rules)).toEqual({
      pageType: "product",
      template: "product",
      rule: null,
    });
    expect(ruleMatches({ template: "x", when: { unknownCondition: 1 } }, {})).toBe(false);
    expect(resolveTemplate("product", {}, undefined).template).toBe("product");
  });

  it("matches pages by path glob, source, language and setting", () => {
    expect(resolveTemplate("page", { path: "/landing/spring/" }, rules).template).toBe("page.landing");
    expect(resolveTemplate("page", { path: "landing/spring/sale" }, rules).template).toBe("page.landing");
    expect(resolveTemplate("page", { path: "/landing" }, rules).template).toBe("page");
    expect(resolveTemplate("page", { source: "blog" }, rules).template).toBe("page.article");
    expect(resolveTemplate("page", { language: "de-DE" }, rules).template).toBe("page.german");
    expect(resolveTemplate("page", { settings: { campaign: true } }, rules).template).toBe("page.campaign");
  });

  it("keeps today's B2C choice without a rules file", () => {
    const b2c = { properties: [{ name: "VirtoFrontend_UI_Layout", value: "B2C" }] };
    expect(resolveTemplate("product", b2c, DEFAULT_TEMPLATE_RULES).template).toBe("product.b2c");
    expect(resolveTemplate("product", {}, DEFAULT_TEMPLATE_RULES).template).toBe("product");
  });
});

describe("parseTemplateRules", () => {
  it("reads the lists and drops what isn't a rule", () => {
    expect(parseTemplateRules({ version: 1, product: [null, { template: "a" }, 3], page: "x" })).toEqual({
      version: 1,
      product: [{ template: "a" }],
      category: undefined,
      page: undefined,
    });
    expect(parseTemplateRules([])).toBeUndefined();
    expect(parseTemplateRules("x")).toBeUndefined();
  });
});
