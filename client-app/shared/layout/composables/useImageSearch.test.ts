import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryParamName } from "@/core/enums";
import { ROUTES } from "@/router/routes/constants";
import { getImageSearchRoute } from "./useImageSearch";

const { searchProducts } = vi.hoisted(() => ({
  searchProducts: vi.fn(),
}));

vi.mock("@/core/api/graphql", () => ({
  getChildCategories: vi.fn(() => Promise.resolve([])),
  searchProducts,
}));

vi.mock("@/core/composables", () => ({
  useThemeContext: () => ({ themeContext: { value: undefined } }),
}));

vi.mock("@/shared/layout/utils/image-search/clip-model", () => ({
  embedImage: vi.fn(),
  embedTexts: vi.fn(),
}));

vi.mock("@/shared/layout/utils/image-search/text-recognizer", () => ({
  readTextTerms: vi.fn(),
}));

const CATEGORY = { id: "power-banks", slug: "power-charging/power-banks" };

beforeEach(() => {
  searchProducts.mockReset();
});

describe("getImageSearchRoute", () => {
  it("searches the keyword inside the category when the category has matches", async () => {
    searchProducts.mockResolvedValue({ totalCount: 3, items: [] });

    await expect(getImageSearchRoute({ keyword: "UGREEN", category: CATEGORY })).resolves.toEqual({
      path: "/power-charging/power-banks",
      query: { [QueryParamName.SearchPhrase]: "UGREEN" },
    });
    expect(searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "UGREEN", categoryId: "power-banks" }),
      expect.anything(),
    );
  });

  it("searches the whole catalog instead of showing the category unfiltered when the category has no matches", async () => {
    searchProducts.mockResolvedValue({ totalCount: 0, items: [] });

    await expect(getImageSearchRoute({ keyword: "UGREEN", category: CATEGORY })).resolves.toEqual({
      name: ROUTES.SEARCH.NAME,
      query: { [QueryParamName.SearchPhrase]: "UGREEN" },
    });
  });

  it("searches the whole catalog when the match check fails", async () => {
    searchProducts.mockRejectedValue(new Error("network"));

    await expect(getImageSearchRoute({ keyword: "UGREEN", category: CATEGORY })).resolves.toMatchObject({
      name: ROUTES.SEARCH.NAME,
    });
  });

  it("opens the category as is when there is no keyword", async () => {
    await expect(getImageSearchRoute({ keyword: "", category: CATEGORY })).resolves.toEqual({
      path: "/power-charging/power-banks",
    });
    expect(searchProducts).not.toHaveBeenCalled();
  });

  it("searches the whole catalog when there is no category", async () => {
    await expect(getImageSearchRoute({ keyword: "Jabra" })).resolves.toEqual({
      name: ROUTES.SEARCH.NAME,
      query: { [QueryParamName.SearchPhrase]: "Jabra" },
    });
    expect(searchProducts).not.toHaveBeenCalled();
  });
});
