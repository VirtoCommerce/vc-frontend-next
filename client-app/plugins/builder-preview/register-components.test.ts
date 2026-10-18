import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { federated, loggerErrorMock } = vi.hoisted(() => ({
  federated: { settle: () => {}, settled: Promise.resolve() },
  loggerErrorMock: vi.fn(),
}));

vi.mock("@/core/utilities", () => ({
  Logger: { error: loggerErrorMock, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// the federated loader is still running until the test settles it
vi.mock("@/modules/federated/bootstrap", () => ({ whenFederatedModulesSettled: () => federated.settled }));

// the inline descriptors import storefront components; the schema files are what this is about
vi.mock("./page-builder-components", () => ({ PageBuilderComponents: [] }));

const Hero = { name: "DemoHero", render: () => null };

async function load() {
  vi.resetModules();
  const registry = await import("@/modules/federated/page-builder-sections");
  const { getRegisteredComponents } = await import("./register-components");
  return { ...registry, getRegisteredComponents };
}

describe("getRegisteredComponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    federated.settled = new Promise<void>((resolve) => {
      federated.settle = resolve;
    });
  });

  it("does not announce the schemas until federated plugins have settled", async () => {
    const { getRegisteredComponents } = await load();
    const announced = vi.fn();

    void getRegisteredComponents().then(announced);
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(announced).not.toHaveBeenCalled();

    federated.settle();
    await vi.waitFor(() => expect(announced).toHaveBeenCalled());
  });

  it("includes a section a plugin registered while it loaded, after the core sections", async () => {
    const { getRegisteredComponents, registerPageBuilderSection } = await load();

    const pending = getRegisteredComponents();
    // a plugin's init() runs while the preview is already reading its schema files
    registerPageBuilderSection({ type: "demo-hero", component: Hero, schema: { name: "Demo hero" } });
    registerPageBuilderSection({ type: "demo-banner", component: Hero, schema: { name: "Demo banner" } });
    federated.settle();
    const { sections } = await pending;

    const types = Object.keys(sections);
    expect(types).toContain("call-to-action");
    expect(types.slice(-2)).toEqual(["demo-hero", "demo-banner"]);
    expect(sections["demo-hero"]).toEqual({ type: "demo-hero", name: "Demo hero" });
  });

  it("adds a block to the blocks, not to the Add section list", async () => {
    const { getRegisteredComponents, registerPageBuilderSection } = await load();

    registerPageBuilderSection({ type: "demo-badge", kind: "block", component: Hero, schema: { name: "Badge" } });
    federated.settle();
    const { sections, blocks } = await getRegisteredComponents();

    expect(blocks["demo-badge"]).toEqual({ type: "demo-badge", name: "Badge" });
    expect(sections["demo-badge"]).toBeUndefined();
  });

  it("keeps the core schema when a plugin type has the same name", async () => {
    const { getRegisteredComponents, registerPageBuilderSection } = await load();

    // the host's core types are not set here, so only the schema check can catch it
    registerPageBuilderSection({ type: "call-to-action", component: Hero, schema: { name: "Fake" } });
    federated.settle();
    const { sections } = await getRegisteredComponents();

    expect(sections["call-to-action"].name).toBe("Call to Action");
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('"call-to-action" left out of the designer'));
  });
});
