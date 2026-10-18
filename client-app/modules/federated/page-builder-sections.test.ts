import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageBuilderSectionRegistrationType } from "./page-builder-sections";

const { loggerErrorMock } = vi.hoisted(() => ({ loggerErrorMock: vi.fn() }));

vi.mock("@/core/utilities", () => ({
  Logger: { error: loggerErrorMock, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// the registry is module state: every test gets a fresh one
async function loadRegistry() {
  vi.resetModules();
  return await import("./page-builder-sections");
}

const Hero = { name: "AcmeHero", render: () => null };

function hero(overrides: Partial<PageBuilderSectionRegistrationType> = {}): PageBuilderSectionRegistrationType {
  return {
    type: "acme-hero",
    component: Hero,
    schema: { name: "Acme hero", icon: "image", settings: [{ id: "title", label: "Title", type: "string" }] },
    ...overrides,
  };
}

describe("registerPageBuilderSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a section with its schema, stamped with the type", async () => {
    const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();

    expect(registerPageBuilderSection(hero())).toBe(true);

    expect(getRegisteredPageBuilderSections()).toEqual([
      {
        type: "acme-hero",
        kind: "section",
        component: Hero,
        schema: {
          type: "acme-hero",
          name: "Acme hero",
          icon: "image",
          settings: [{ id: "title", label: "Title", type: "string" }],
        },
      },
    ]);
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it("keeps the kind of a block", async () => {
    const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();

    registerPageBuilderSection(hero({ type: "acme-badge", kind: "block" }));

    expect(getRegisteredPageBuilderSections()[0].kind).toBe("block");
  });

  it("keeps a copy of the schema, so a later change by the plugin is not announced", async () => {
    const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();
    const registration = hero();

    registerPageBuilderSection(registration);
    registration.schema.name = "Changed";

    expect(getRegisteredPageBuilderSections()[0].schema.name).toBe("Acme hero");
  });

  it.each(["hero", "Acme-hero", "acme_hero", "acme-", "-hero", "acme--hero", "", undefined])(
    "refuses the type %j: not <plugin>-<name> in lowercase kebab case",
    async (type) => {
      const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();

      expect(registerPageBuilderSection(hero({ type: type as string }))).toBe(false);

      expect(getRegisteredPageBuilderSections()).toEqual([]);
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining("<plugin>-<name>"));
    },
  );

  it("refuses a type the host renders itself", async () => {
    const { registerPageBuilderSection, setCorePageBuilderTypes, getRegisteredPageBuilderSections } =
      await loadRegistry();
    setCorePageBuilderTypes(["call-to-action", "product-info"]);

    expect(registerPageBuilderSection(hero({ type: "call-to-action" }))).toBe(false);

    expect(getRegisteredPageBuilderSections()).toEqual([]);
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining("the host has a section or block"));
  });

  it("refuses a second registration of a type: the first one wins", async () => {
    const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();
    const Other = { name: "Other", render: () => null };

    registerPageBuilderSection(hero());
    expect(registerPageBuilderSection(hero({ component: Other }))).toBe(false);

    expect(getRegisteredPageBuilderSections().map((section) => section.component)).toEqual([Hero]);
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining("registered already"));
  });

  it("requires the initing plugin's namespace while its init() runs", async () => {
    const { registerPageBuilderSection, setRegisteringPlugin, getRegisteredPageBuilderSections } = await loadRegistry();

    setRegisteringPlugin("acme");
    const own = registerPageBuilderSection(hero({ type: "acme-hero" }));
    const foreign = registerPageBuilderSection(hero({ type: "contoso-hero" }));
    setRegisteringPlugin(undefined);

    expect([own, foreign]).toEqual([true, false]);
    expect(getRegisteredPageBuilderSections().map((section) => section.type)).toEqual(["acme-hero"]);
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringMatching(/"contoso-hero" by "acme".*"acme-"/));
  });

  it("derives the namespace from a remote name that is not kebab case", async () => {
    const { registerPageBuilderSection, setRegisteringPlugin } = await loadRegistry();

    setRegisteringPlugin("VirtoCommerce.Acme_Theme");
    const registered = registerPageBuilderSection(hero({ type: "virtocommerce-acme-theme-hero" }));
    setRegisteringPlugin(undefined);

    expect(registered).toBe(true);
  });

  it("only requires a namespaced type when the call cannot be attributed to a plugin", async () => {
    const { registerPageBuilderSection } = await loadRegistry();

    expect(registerPageBuilderSection(hero({ type: "contoso-hero" }))).toBe(true);
  });

  it.each([
    ["no component", { component: undefined }],
    ["no schema", { schema: undefined }],
    ["settings that are not an array", { schema: { settings: { id: "title" } } }],
    ["an unknown kind", { kind: "page" }],
  ])("refuses a registration with %s", async (_, overrides) => {
    const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();

    expect(registerPageBuilderSection(hero(overrides as Partial<PageBuilderSectionRegistrationType>))).toBe(false);

    expect(getRegisteredPageBuilderSections()).toEqual([]);
  });

  it("refuses a schema postMessage cannot clone, which would break the designer's whole schema list", async () => {
    const { registerPageBuilderSection, getRegisteredPageBuilderSections } = await loadRegistry();

    expect(registerPageBuilderSection(hero({ schema: { name: "Acme hero", format: () => "" } }))).toBe(false);

    expect(getRegisteredPageBuilderSections()).toEqual([]);
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining("not plain data"));
  });
});

describe("onPageBuilderSectionRegistered", () => {
  it("replays the sections registered so far, then reports each later one", async () => {
    const { registerPageBuilderSection, onPageBuilderSectionRegistered } = await loadRegistry();
    const listener = vi.fn();

    registerPageBuilderSection(hero());
    onPageBuilderSectionRegistered(listener);
    registerPageBuilderSection(hero({ type: "acme-banner" }));
    registerPageBuilderSection(hero({ type: "acme-banner" }));

    expect(listener.mock.calls.map(([section]) => (section as { type: string }).type)).toEqual([
      "acme-hero",
      "acme-banner",
    ]);
  });
});
