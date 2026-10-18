import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IPageTemplate } from "../types";

vi.mock("@/core/globals", () => ({ globals: { storeId: "B2B-store" } }));

const template = (name: string): IPageTemplate => ({ settings: { name }, content: [] }) as unknown as IPageTemplate;

/** The theme's files by path under Themes/B2B-store/default/ */
function serve(files: Record<string, unknown>) {
  const fetchMock = vi.fn((url: string) => {
    const path = decodeURIComponent(url).replace("/cms-content/Themes/B2B-store/default/", "");
    return Promise.resolve(
      path in files
        ? ({ ok: true, json: () => Promise.resolve(files[path]) } as Response)
        : ({ ok: false, json: () => Promise.reject(new Error("404")) } as Response),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function freshTemplates() {
  vi.resetModules();
  const { useThemeTemplates } = await import("./useThemeTemplates");
  return useThemeTemplates();
}

describe("useThemeTemplates", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("takes the template the rules pick, from the theme", async () => {
    serve({
      "config/template_rules.json": { product: [{ template: "product.printer", when: { inCategory: ["printers"] } }] },
      "templates/product.printer.json": template("printer"),
    });
    const templates = await freshTemplates();
    const result = await templates.templateFor(
      "product",
      { outlines: ["c/printers"] },
      { product: template("built-in") },
    );
    expect(result?.settings).toEqual({ name: "printer" });
    expect(templates.resolved.value).toEqual({ pageType: "product", template: "product.printer", rule: 0 });
  });

  it("falls back: the theme's key, the built-in key, the theme's default, the built-in default", async () => {
    serve({
      "config/template_rules.json": { product: [{ template: "product.missing", when: {} }] },
      "templates/product.json": template("theme default"),
    });
    const templates = await freshTemplates();
    expect(
      (await templates.templateFor("product", {}, { "product.missing": template("built-in key") }))?.settings,
    ).toEqual({
      name: "built-in key",
    });
    expect((await templates.templateFor("product", {}, {}))?.settings).toEqual({ name: "theme default" });
  });

  it("keeps today's B2C choice when the theme has no rules file", async () => {
    serve({});
    const templates = await freshTemplates();
    const b2c = { properties: [{ name: "VirtoFrontend_UI_Layout", value: "B2C" }] };
    const builtIn = { product: template("default"), "product.b2c": template("b2c") };
    expect((await templates.templateFor("product", b2c, builtIn))?.settings).toEqual({ name: "b2c" });
    expect((await templates.templateFor("product", {}, builtIn))?.settings).toEqual({ name: "default" });
  });

  it("uses a page's explicit choice over the rules, and loads the rules once", async () => {
    const fetchMock = serve({
      "config/template_rules.json": { page: [{ template: "page.landing", when: { path: "/landing/*" } }] },
      "templates/page.article.json": template("article"),
    });
    const templates = await freshTemplates();
    expect((await templates.templateFor("page", { path: "/landing/a" }, {}, "page.article"))?.settings).toEqual({
      name: "article",
    });
    expect(templates.resolved.value).toEqual({ pageType: "page", template: "page.article", rule: null });
    await templates.templateFor("page", { path: "/x" }, {});
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("template_rules.json"))).toHaveLength(1);
  });

  it("shows the designer's template on pages of its type only", async () => {
    serve({});
    const templates = await freshTemplates();
    templates.setPreview("product.printer", template("editing"));
    expect(templates.previewFor("product")?.settings).toEqual({ name: "editing" });
    expect(templates.previewFor("category")).toBeUndefined();
    templates.setPreview(undefined);
    expect(templates.previewFor("product")).toBeUndefined();
  });
});
