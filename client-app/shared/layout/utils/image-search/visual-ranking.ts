import type { Category } from "@/core/api/graphql/types";

export type CategoryNodeType = Pick<Category, "id" | "name" | "slug"> & {
  childCategories?: CategoryNodeType[] | null;
};

export type LeafCategoryType = {
  category: CategoryNodeType;
  /** Names from the root down to the category, for display. */
  path: string[];
};

export type RankedCategoryType = LeafCategoryType & {
  /** Share of the evidence, 0..1; the ranked list sums to 1. */
  score: number;
};

/** How sure the search is that the catalog has what the photo shows. */
export type MatchLevelType = "match" | "weak" | "none";

export type GalleryItemType<T> = {
  item: T;
  categoryId: string;
  embedding: ArrayLike<number>;
};

export type ScoredItemType<T> = {
  item: T;
  categoryId: string;
  similarity: number;
};

/**
 * CLIP similarities are cosines packed into a narrow band (~0.1..0.35); the model's own logit scale of 100
 * turns their differences into a usable distribution.
 */
const ZERO_SHOT_TEMPERATURE = 100;

/** How many of the most similar catalog photos vote for a category. */
const NEIGHBOUR_COUNT = 5;

/**
 * The photo-to-text guess and the photo-to-catalog-photo vote count equally. Measured on the demo catalog,
 * one photo per subcategory: text alone 15/32 right, neighbours alone 20/32, both 20/32 with 29/32 in the top 3.
 */
const ZERO_SHOT_WEIGHT = 0.5;

/** Share of the vote that goes to the categories of the products the printed or typed text finds. */
const TEXT_WEIGHT = 0.3;

/** Added to a text-matched product's photo similarity (cosines of related products differ by ~0.05..0.2). */
const TEXT_MATCH_BOOST = 0.15;

/**
 * Photo-to-product similarity of the closest catalog item. Measured on the demo catalog: products it sells score
 * 0.54..1.0 against other products of their kind (28 of 32 above 0.6), while 19 photos of things it does not sell
 * (pets, food, people, cars, landscapes, a toy) score 0.07..0.40. The thresholds sit in that gap, so they hold for
 * any catalog: they compare a photo with the store's own products, not with a fixed list of concepts.
 */
export const MATCH_SIMILARITY = 0.55;
export const NO_MATCH_SIMILARITY = 0.45;

/** Both vectors are L2-normalised, so the dot product is the cosine similarity. */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

export function softmax(values: number[], temperature = 1): number[] {
  const max = Math.max(...values);
  const exponents = values.map((value) => Math.exp((value - max) * temperature));
  const sum = exponents.reduce((total, value) => total + value, 0);

  return exponents.map((value) => value / sum);
}

/** The categories a product actually sits in: departments without subcategories count as leaves too. */
export function getLeafCategories(categories: CategoryNodeType[], parentPath: string[] = []): LeafCategoryType[] {
  return categories.flatMap((category) => {
    const path = [...parentPath, category.name];
    const children = category.childCategories ?? [];

    return children.length ? getLeafCategories(children, path) : [{ category, path }];
  });
}

export function getCategoryPrompt(leaf: LeafCategoryType): string {
  return `a photo of ${leaf.category.name.toLowerCase()}`;
}

/** Probability of each leaf from the photo-to-text similarities, in the order of `leaves`. */
export function getZeroShotScores(imageEmbedding: ArrayLike<number>, textEmbeddings: ArrayLike<number>[]): number[] {
  return softmax(
    textEmbeddings.map((textEmbedding) => cosineSimilarity(imageEmbedding, textEmbedding)),
    ZERO_SHOT_TEMPERATURE,
  );
}

export function rankGallery<T>(imageEmbedding: ArrayLike<number>, gallery: GalleryItemType<T>[]): ScoredItemType<T>[] {
  return gallery
    .map(({ item, categoryId, embedding }) => ({
      item,
      categoryId,
      similarity: cosineSimilarity(imageEmbedding, embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Blends what the photo looks like in words (zero-shot over the category names) with which catalog photos it
 * looks like (the nearest products) and, when the photo or the shopper names the product, with the categories
 * of the products that text finds. The picture signals confuse lookalike departments — a charger and a power
 * bank, two kinds of monitor — and they rarely fail on the same photo; printed text, when present, settles it.
 */
export function rankCategories<T>(
  leaves: LeafCategoryType[],
  zeroShotScores: number[],
  neighbours: ScoredItemType<T>[],
  textMatchCategoryIds: string[] = [],
): RankedCategoryType[] {
  const neighbourVotes = new Map<string, number>();

  neighbours.slice(0, NEIGHBOUR_COUNT).forEach(({ categoryId, similarity }) => {
    neighbourVotes.set(categoryId, (neighbourVotes.get(categoryId) ?? 0) + Math.max(0, similarity));
  });

  const textVotes = new Map<string, number>();

  textMatchCategoryIds.forEach((categoryId) => textVotes.set(categoryId, (textVotes.get(categoryId) ?? 0) + 1));

  const totalNeighbourVotes = [...neighbourVotes.values()].reduce((sum, value) => sum + value, 0);
  const pictureWeight = textMatchCategoryIds.length ? 1 - TEXT_WEIGHT : 1;
  const zeroShotWeight = pictureWeight * (totalNeighbourVotes ? ZERO_SHOT_WEIGHT : 1);
  const neighbourWeight = pictureWeight - zeroShotWeight;
  const textWeight = 1 - pictureWeight;

  return leaves
    .map((leaf, index) => {
      const categoryId = leaf.category.id;
      const neighbourShare = totalNeighbourVotes ? (neighbourVotes.get(categoryId) ?? 0) / totalNeighbourVotes : 0;
      const textShare = textMatchCategoryIds.length
        ? (textVotes.get(categoryId) ?? 0) / textMatchCategoryIds.length
        : 0;

      return {
        ...leaf,
        score:
          zeroShotWeight * (zeroShotScores[index] ?? 0) + neighbourWeight * neighbourShare + textWeight * textShare,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Lifts the products the text found above lookalikes: the exact item named on its box should lead the list even
 * when another product photo happens to be a closer match.
 */
export function boostTextMatches<T>(
  ranked: ScoredItemType<T>[],
  isTextMatch: (item: T) => boolean,
): ScoredItemType<T>[] {
  return ranked
    .map((entry) => (isTextMatch(entry.item) ? { ...entry, similarity: entry.similarity + TEXT_MATCH_BOOST } : entry))
    .sort((a, b) => b.similarity - a.similarity);
}

/** The leaf a product sits in, from its outline (`catalogId/departmentId/subcategoryId`). */
export function getLeafCategoryId(
  outline: string | null | undefined,
  leafIds: ReadonlySet<string>,
): string | undefined {
  return (outline ?? "")
    .split("/")
    .reverse()
    .find((segment) => leafIds.has(segment));
}

/**
 * The closest catalog photo decides. A product the printed or typed text names settles it only when it also looks
 * somewhat like the photo: words alone also match receipts, posters and book covers. Text that finds products
 * which look nothing like the photo still offers them as a possibility. Nothing to compare with (no product
 * images) is not proof of absence, so it stays "weak".
 */
export function assessMatch(bestSimilarity: number | undefined, textMatchSimilarity?: number): MatchLevelType {
  const hasTextMatch = textMatchSimilarity !== undefined;

  if (hasTextMatch && textMatchSimilarity >= NO_MATCH_SIMILARITY) {
    return "match";
  }

  if (bestSimilarity === undefined) {
    return "weak";
  }

  if (bestSimilarity >= MATCH_SIMILARITY) {
    return "match";
  }

  return bestSimilarity >= NO_MATCH_SIMILARITY || hasTextMatch ? "weak" : "none";
}

function toComparableText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Whether a term really names the product: it appears in the name or the seller's name. Catalog search also
 * matches descriptions, where everyday words ("about", "total", "high-performance") find almost anything.
 * Punctuation is ignored, so "20000mAh" names "20,000mAh".
 */
export function isNamedByTerms(names: (string | null | undefined)[], terms: string[]): boolean {
  const haystack = names.map((name) => toComparableText(name ?? "")).join(" ");

  return terms.some((term) => {
    const needle = toComparableText(term);

    return needle.length > 0 && haystack.includes(needle);
  });
}
