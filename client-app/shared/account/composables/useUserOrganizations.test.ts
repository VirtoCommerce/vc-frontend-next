import { describe, expect, it, vi } from "vitest";
import { useUserOrganizations } from "./useUserOrganizations";

vi.mock("@/core/api/graphql/account", () => ({ getOrganizations: vi.fn() }));

const { getOrganizations } = await import("@/core/api/graphql/account");

function page(from: number, hasNextPage: boolean) {
  return {
    items: Array.from({ length: 30 }, (_, i) => ({ id: `org-${from + i}`, name: `org-${from + i}` })),
    pageInfo: { hasNextPage, endCursor: String(from + 29) },
    totalCount: 60,
  };
}

describe("useUserOrganizations", () => {
  it("drops a page that lands after a newer search", async () => {
    let resolveStale: (value: ReturnType<typeof page>) => void = () => {};
    vi.mocked(getOrganizations)
      .mockResolvedValueOnce(page(1, true))
      .mockReturnValueOnce(new Promise((resolve) => (resolveStale = resolve)))
      .mockResolvedValueOnce(page(1, true));

    const { organizations, loading, search, loadOrganizations } = useUserOrganizations();

    await search();
    const stalePage = loadOrganizations();
    await search();
    resolveStale(page(31, false));
    await stalePage;

    expect(organizations.value.map((item) => item.id)).toEqual(page(1, true).items.map((item) => item.id));
    expect(loading.value).toBe(false);
  });
});
