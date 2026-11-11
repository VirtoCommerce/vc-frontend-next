import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

vi.mock("@/core/api/graphql/account", () => ({ getOrganizations: vi.fn() }));

function page(from: number, hasNextPage: boolean) {
  return {
    items: Array.from({ length: 30 }, (_, i) => ({ id: `org-${from + i}`, name: `org-${from + i}` })),
    pageInfo: { hasNextPage, endCursor: String(from + 29) },
    totalCount: 60,
  };
}

// createGlobalState keeps one instance per module, so every test imports a fresh copy.
async function setup() {
  vi.resetModules();
  const { getOrganizations } = await import("@/core/api/graphql/account");
  const { useUserOrganizations } = await import("./useUserOrganizations");
  return { getOrganizations: vi.mocked(getOrganizations), ...useUserOrganizations() };
}

describe("useUserOrganizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not load on mount: callers call search() themselves", async () => {
    vi.resetModules();
    const { getOrganizations } = await import("@/core/api/graphql/account");
    const { useUserOrganizations } = await import("./useUserOrganizations");

    mount(defineComponent({ setup: () => useUserOrganizations(), render: () => null }));
    await flushPromises();

    expect(getOrganizations).not.toHaveBeenCalled();
  });

  it("drops a page that lands after a newer search", async () => {
    const { getOrganizations, organizations, loading, search, loadOrganizations } = await setup();
    let resolveStale: (value: ReturnType<typeof page>) => void = () => {};
    getOrganizations
      .mockResolvedValueOnce(page(1, true))
      .mockReturnValueOnce(new Promise((resolve) => (resolveStale = resolve)))
      .mockResolvedValueOnce(page(1, true));

    await search();
    const stalePage = loadOrganizations();
    await search();
    resolveStale(page(31, false));
    await stalePage;

    expect(organizations.value.map((item) => item.id)).toEqual(page(1, true).items.map((item) => item.id));
    expect(loading.value).toBe(false);
  });

  it("keeps loading while a newer search is pending after a stale page resolves", async () => {
    const { getOrganizations, organizations, loading, search, loadOrganizations } = await setup();
    let resolveStale: (value: ReturnType<typeof page>) => void = () => {};
    getOrganizations
      .mockResolvedValueOnce(page(1, true))
      .mockReturnValueOnce(new Promise((resolve) => (resolveStale = resolve)))
      .mockReturnValueOnce(new Promise(() => {}));

    await search();
    const stalePage = loadOrganizations();
    void search();
    resolveStale(page(31, false));
    await stalePage;

    expect(loading.value).toBe(true);
    expect(organizations.value).toEqual([]);
  });

  it("swallows a stale page's error while a newer search is pending", async () => {
    const { getOrganizations, loading, search, loadOrganizations } = await setup();
    let rejectStale: (error: Error) => void = () => {};
    getOrganizations
      .mockResolvedValueOnce(page(1, true))
      .mockReturnValueOnce(new Promise((_, reject) => (rejectStale = reject)))
      .mockReturnValueOnce(new Promise(() => {}));

    await search();
    const stalePage = loadOrganizations();
    void search();
    rejectStale(new Error("stale"));

    await expect(stalePage).resolves.toBeUndefined();
    expect(loading.value).toBe(true);
  });
});
