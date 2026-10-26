import { describe, expect, it } from "vitest";
import {
  assessMatch,
  boostTextMatches,
  cosineSimilarity,
  getCategoryPrompt,
  getLeafCategories,
  getLeafCategoryId,
  isNamedByTerms,
  MATCH_SIMILARITY,
  NO_MATCH_SIMILARITY,
  getZeroShotScores,
  rankCategories,
  rankGallery,
  softmax,
} from "./visual-ranking";
import type { CategoryNodeType, ScoredItemType } from "./visual-ranking";

const CATEGORIES: CategoryNodeType[] = [
  {
    id: "power",
    name: "Power & Charging",
    slug: "power",
    childCategories: [
      { id: "power-banks", name: "Power banks", slug: "power-banks" },
      { id: "chargers", name: "GaN USB-C chargers", slug: "chargers" },
    ],
  },
  { id: "services", name: "Services", slug: "services", childCategories: [] },
];

const LEAVES = getLeafCategories(CATEGORIES);

function neighbour(categoryId: string, similarity: number): ScoredItemType<string> {
  return { item: `${categoryId}-${similarity}`, categoryId, similarity };
}

describe("getLeafCategories", () => {
  it("returns subcategories and departments without children, with their paths", () => {
    expect(LEAVES.map((leaf) => leaf.category.id)).toEqual(["power-banks", "chargers", "services"]);
    expect(LEAVES[0].path).toEqual(["Power & Charging", "Power banks"]);
    expect(LEAVES[2].path).toEqual(["Services"]);
  });
});

describe("getCategoryPrompt", () => {
  it("describes the category as a photo caption", () => {
    expect(getCategoryPrompt(LEAVES[1])).toBe("a photo of gan usb-c chargers");
  });
});

describe("softmax", () => {
  it("sums to 1 and keeps the order", () => {
    const result = softmax([0.2, 0.3, 0.1], 100);

    expect(result.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(result[1]).toBeGreaterThan(result[0]);
    expect(result[0]).toBeGreaterThan(result[2]);
  });
});

describe("getZeroShotScores", () => {
  it("favours the text closest to the image", () => {
    const scores = getZeroShotScores(
      [1, 0],
      [
        [0.6, 0.8],
        [0.8, 0.6],
      ],
    );

    expect(scores[1]).toBeGreaterThan(scores[0]);
    expect(cosineSimilarity([1, 0], [0.8, 0.6])).toBeCloseTo(0.8);
  });
});

describe("rankGallery", () => {
  it("orders catalog photos by similarity to the query", () => {
    const ranked = rankGallery(
      [1, 0],
      [
        { item: "far", categoryId: "a", embedding: [0, 1] },
        { item: "near", categoryId: "b", embedding: [1, 0] },
      ],
    );

    expect(ranked.map(({ item }) => item)).toEqual(["near", "far"]);
  });
});

describe("rankCategories", () => {
  it("uses the zero-shot scores alone when there are no neighbours", () => {
    const ranked = rankCategories(LEAVES, [0.2, 0.7, 0.1], []);

    expect(ranked[0].category.id).toBe("chargers");
    expect(ranked[0].score).toBeCloseTo(0.7);
  });

  it("lets the nearest catalog photos overturn a close zero-shot call", () => {
    const ranked = rankCategories(
      LEAVES,
      [0.45, 0.55, 0],
      [neighbour("power-banks", 0.9), neighbour("power-banks", 0.85), neighbour("chargers", 0.6)],
    );

    expect(ranked[0].category.id).toBe("power-banks");
  });

  it("counts only the closest five neighbours", () => {
    const ranked = rankCategories(
      LEAVES,
      [0.5, 0.5, 0],
      [
        neighbour("chargers", 0.9),
        neighbour("chargers", 0.9),
        neighbour("chargers", 0.9),
        neighbour("power-banks", 0.8),
        neighbour("power-banks", 0.8),
        neighbour("power-banks", 0.7),
        neighbour("power-banks", 0.7),
      ],
    );

    expect(ranked[0].category.id).toBe("chargers");
  });

  it("returns scores that sum to 1", () => {
    const ranked = rankCategories(LEAVES, [0.3, 0.3, 0.4], [neighbour("services", 0.5)]);

    expect(ranked.reduce((sum, item) => sum + item.score, 0)).toBeCloseTo(1);
  });
});

describe("rankCategories with text matches", () => {
  it("lets the products named in the text settle a close picture call", () => {
    const ranked = rankCategories(
      LEAVES,
      [0.55, 0.45, 0],
      [neighbour("power-banks", 0.8), neighbour("chargers", 0.8)],
      ["chargers", "chargers"],
    );

    expect(ranked[0].category.id).toBe("chargers");
  });

  it("keeps the scores summing to 1", () => {
    const ranked = rankCategories(LEAVES, [0.2, 0.3, 0.5], [neighbour("services", 0.5)], ["power-banks"]);

    expect(ranked.reduce((sum, item) => sum + item.score, 0)).toBeCloseTo(1);
  });

  it("does not let text outvote a clear picture", () => {
    const ranked = rankCategories(
      LEAVES,
      [0.95, 0.05, 0],
      [neighbour("power-banks", 0.9), neighbour("power-banks", 0.9)],
      ["services"],
    );

    expect(ranked[0].category.id).toBe("power-banks");
  });
});

describe("boostTextMatches", () => {
  it("moves a text-matched product above a slightly closer photo", () => {
    const boosted = boostTextMatches(
      [
        { item: "lookalike", categoryId: "a", similarity: 0.82 },
        { item: "named", categoryId: "a", similarity: 0.75 },
      ],
      (item) => item === "named",
    );

    expect(boosted.map(({ item }) => item)).toEqual(["named", "lookalike"]);
  });
});

describe("getLeafCategoryId", () => {
  it("finds the deepest known category in the outline", () => {
    expect(getLeafCategoryId("catalog/power/power-banks", new Set(["power-banks", "chargers"]))).toBe("power-banks");
  });

  it("returns nothing for a product outside the known leaves", () => {
    expect(getLeafCategoryId("catalog/other", new Set(["power-banks"]))).toBeUndefined();
    expect(getLeafCategoryId(undefined, new Set(["power-banks"]))).toBeUndefined();
  });
});

describe("assessMatch", () => {
  it("is a match when the closest catalog photo is close enough", () => {
    expect(assessMatch(MATCH_SIMILARITY)).toBe("match");
    expect(assessMatch(0.9)).toBe("match");
  });

  it("is weak between the two thresholds", () => {
    expect(assessMatch(NO_MATCH_SIMILARITY)).toBe("weak");
    expect(assessMatch(MATCH_SIMILARITY - 0.01)).toBe("weak");
  });

  it("finds nothing when no catalog photo is close", () => {
    expect(assessMatch(NO_MATCH_SIMILARITY - 0.01)).toBe("none");
    expect(assessMatch(0.1)).toBe("none");
  });

  it("is a match when a product the text names also looks like the photo", () => {
    expect(assessMatch(0.3, NO_MATCH_SIMILARITY)).toBe("match");
  });

  it("only offers products the text names when they look nothing like the photo", () => {
    expect(assessMatch(0.2, 0.2)).toBe("weak");
  });

  it("does not claim absence without catalog photos to compare with", () => {
    expect(assessMatch(undefined)).toBe("weak");
  });
});

describe("isNamedByTerms", () => {
  it("finds a term in the product or seller name, ignoring case and punctuation", () => {
    expect(isNamedByTerms(["UGREEN Nexode Power Bank 20,000mAh"], ["20000mAh"])).toBe(true);
    expect(isNamedByTerms(["Speakerphone", "Jabra"], ["jabra"])).toBe(true);
  });

  it("rejects everyday words that only a description would hold", () => {
    expect(isNamedByTerms(["Apple Mac mini M5 Pro"], ["about", "TOTAL"])).toBe(false);
    expect(isNamedByTerms([null, undefined], ["about"])).toBe(false);
  });
});
