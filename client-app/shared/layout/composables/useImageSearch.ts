import { uniqBy } from "lodash-es";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { getChildCategories, searchProducts } from "@/core/api/graphql";
import { useThemeContext } from "@/core/composables";
import { QueryParamName } from "@/core/enums";
import { appendSuffixToFilename, getCategoryRoute, Logger } from "@/core/utilities";
import { ROUTES } from "@/router/routes/constants";
import { embedImage, embedTexts } from "@/shared/layout/utils/image-search/clip-model";
import { readTextTerms } from "@/shared/layout/utils/image-search/text-recognizer";
import { splitTypedText } from "@/shared/layout/utils/image-search/text-terms";
import {
  assessMatch,
  boostTextMatches,
  getCategoryPrompt,
  getLeafCategories,
  getLeafCategoryId,
  getZeroShotScores,
  isNamedByTerms,
  NO_MATCH_SIMILARITY,
  rankCategories,
  rankGallery,
} from "@/shared/layout/utils/image-search/visual-ranking";
import type { Product } from "@/core/api/graphql/types";
import type {
  CategoryNodeType,
  GalleryItemType,
  LeafCategoryType,
  MatchLevelType,
  RankedCategoryType,
  ScoredItemType,
} from "@/shared/layout/utils/image-search/visual-ranking";
import type { RouteLocationRaw } from "vue-router";

export type ImageSearchProductType = Pick<Product, "id" | "name" | "slug" | "imgSrc" | "outline" | "vendor">;

export type ImageSearchResultType = {
  matchLevel: MatchLevelType;
  /** Empty when nothing in the catalog looks like the photo. */
  categories: RankedCategoryType[];
  similarProducts: ScoredItemType<ImageSearchProductType>[];
  /** Words read on the photo, best first. */
  photoTerms: string[];
  /** The terms the catalog found products for, as one query; empty when the text matched nothing. */
  matchedQuery: string;
};

type TextMatchType = {
  query: string;
  products: ImageSearchProductType[];
};

/** Two levels cover department and subcategory; deeper levels rarely name what a photo shows. */
const CATEGORY_TREE_DEPTH = 2;

/** Subcategories whose products the photo is compared with: the top 3 hold the right one 9 times in 10. */
const CANDIDATE_CATEGORY_COUNT = 3;
const PRODUCTS_PER_CATEGORY = 6;
const IMAGE_FETCH_CONCURRENCY = 6;

const RESULT_CATEGORY_COUNT = 3;
const RESULT_PRODUCT_COUNT = 6;

/** A term found in more products than this ("black", "wireless") says too little about the item to count. */
const MAX_PRODUCTS_PER_TERM = 30;
const TEXT_MATCH_PRODUCT_COUNT = 6;
const MAX_TEXT_TERMS = 6;

let categoriesPromise: Promise<CategoryNodeType[]> | undefined;
let promptsPromise: Promise<{ leaves: LeafCategoryType[]; embeddings: Float32Array[] }> | undefined;

// A product photo is embedded once per page, however many photos and crops the shopper tries.
const productEmbeddings = new Map<string, Promise<GalleryItemType<ImageSearchProductType> | null>>();

// One crop is embedded and read once, however often the shopper edits the text next to it.
const photoEmbeddings = new WeakMap<HTMLCanvasElement, Promise<Float32Array>>();
const photoTerms = new WeakMap<HTMLCanvasElement, Promise<string[]>>();

/** The store's category tree; fetched once per page. */
export function loadImageSearchCategories(): Promise<CategoryNodeType[]> {
  categoriesPromise ??= getChildCategories({ maxLevel: CATEGORY_TREE_DEPTH, onlyActive: true }).catch(
    (error: unknown) => {
      categoriesPromise = undefined;
      Logger.error(`${loadImageSearchCategories.name}`, error);
      return [];
    },
  );

  return categoriesPromise;
}

function loadCategoryPrompts(): Promise<{ leaves: LeafCategoryType[]; embeddings: Float32Array[] }> {
  promptsPromise ??= (async () => {
    const leaves = getLeafCategories(await loadImageSearchCategories());

    return { leaves, embeddings: leaves.length ? await embedTexts(leaves.map(getCategoryPrompt)) : [] };
  })().catch((error: unknown) => {
    promptsPromise = undefined;
    throw error;
  });

  return promptsPromise;
}

// Hosts that refused a CORS request: their images go straight to the same-origin path.
const corsBlockedOrigins = new Set<string>();

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image request failed with ${response.status}`);
  }

  return response.blob();
}

/**
 * Catalog images may live on another host (a CDN or blob storage) that does not allow CORS; the platform also
 * serves them under the same path on the storefront's own origin.
 */
async function fetchImage(url: string): Promise<Blob> {
  const { origin, pathname } = new URL(url, window.location.href);

  if (origin !== window.location.origin && !corsBlockedOrigins.has(origin)) {
    try {
      return await fetchBlob(url);
    } catch {
      corsBlockedOrigins.add(origin);
    }
  }

  return fetchBlob(pathname);
}

/** A thumbnail is a few KB against the original's hundreds, and the model looks at 256 px anyway. */
async function fetchProductImage(url: string, thumbnailSuffix?: string): Promise<Blob> {
  if (thumbnailSuffix) {
    try {
      return await fetchImage(appendSuffixToFilename(url, `_${thumbnailSuffix}`));
    } catch {
      // Thumbnails are generated by a background job and may not exist yet.
    }
  }

  return fetchImage(url);
}

function embedProduct(
  product: ImageSearchProductType,
  categoryId: string,
  thumbnailSuffix?: string,
): Promise<GalleryItemType<ImageSearchProductType> | null> {
  let result = productEmbeddings.get(product.id);

  if (!result) {
    result = (async () => {
      try {
        const embedding = await embedImage(await fetchProductImage(product.imgSrc ?? "", thumbnailSuffix));

        return { item: product, categoryId, embedding };
      } catch (error) {
        Logger.warn(`${useImageSearch.name}.${embedProduct.name}`, error);
        return null;
      }
    })();

    productEmbeddings.set(product.id, result);
  }

  return result;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));

  return results;
}

async function loadGallery(
  categoryIds: string[],
  extraProducts: { product: ImageSearchProductType; categoryId: string }[],
  thumbnailSuffix?: string,
): Promise<GalleryItemType<ImageSearchProductType>[]> {
  const productLists = await Promise.all(
    categoryIds.map(async (categoryId) => {
      try {
        const { items } = await searchProducts({ categoryId, itemsPerPage: PRODUCTS_PER_CATEGORY });

        return (items ?? []).map((product) => ({ product, categoryId }));
      } catch (error) {
        Logger.error(`${useImageSearch.name}.${loadGallery.name}`, error);
        return [];
      }
    }),
  );

  const candidates = [...extraProducts, ...productLists.flat()].filter(
    ({ product }, index, list) =>
      !!product.imgSrc &&
      !product.imgSrc.endsWith(".svg") &&
      list.findIndex((other) => other.product.id === product.id) === index,
  );

  const gallery = await mapWithConcurrency(candidates, IMAGE_FETCH_CONCURRENCY, ({ product, categoryId }) =>
    embedProduct(product, categoryId, thumbnailSuffix),
  );

  return gallery.filter((item): item is GalleryItemType<ImageSearchProductType> => !!item);
}

async function countProducts(keyword: string): Promise<{ term: string; total: number }> {
  try {
    const { totalCount } = await searchProducts({ keyword, itemsPerPage: 1 }, { withImages: false });

    return { term: keyword, total: totalCount ?? 0 };
  } catch (error) {
    Logger.error(`${useImageSearch.name}.${countProducts.name}`, error);
    return { term: keyword, total: 0 };
  }
}

/**
 * Finds the products the text names. Each term must find something on its own (OCR misreads find nothing) and
 * must not be too common; then the terms are searched together, rarest first, and the most common one is dropped
 * until the catalog has a product that holds them all.
 */
async function matchText(terms: string[]): Promise<TextMatchType> {
  const counted = await Promise.all(terms.map(countProducts));
  const specific = counted
    .filter(({ total }) => total > 0 && total <= MAX_PRODUCTS_PER_TERM)
    .sort((a, b) => a.total - b.total)
    .map(({ term }) => term);

  for (let length = specific.length; length > 0; length--) {
    const queryTerms = specific.slice(0, length);
    const query = queryTerms.join(" ");

    try {
      const { items } = await searchProducts({ keyword: query, itemsPerPage: TEXT_MATCH_PRODUCT_COUNT });

      const namedProducts = (items ?? []).filter((product) =>
        isNamedByTerms([product.name, product.vendor?.name], queryTerms),
      );

      if (namedProducts.length) {
        return { query, products: namedProducts };
      }
    } catch (error) {
      Logger.error(`${useImageSearch.name}.${matchText.name}`, error);
      break;
    }
  }

  return { query: "", products: [] };
}

function getPhotoEmbedding(image: HTMLCanvasElement): Promise<Float32Array> {
  let result = photoEmbeddings.get(image);

  if (!result) {
    result = embedImage(image);
    photoEmbeddings.set(image, result);
  }

  return result;
}

/** Text is a bonus: a photo without readable text, or an OCR failure, still searches by the picture. */
function getPhotoTerms(image: HTMLCanvasElement): Promise<string[]> {
  let result = photoTerms.get(image);

  if (!result) {
    result = readTextTerms(image).catch((error: unknown) => {
      Logger.warn(`${useImageSearch.name}.${getPhotoTerms.name}`, error);
      return [];
    });
    photoTerms.set(image, result);
  }

  return result;
}

/**
 * Recognises what the photo shows in two passes: the category names first (fast, a single image), then the
 * products of the likeliest categories, which sharpen the category and give the visually closest items. Text
 * printed on the photo and text the shopper typed name products directly; those products join both passes.
 */
export async function recognizeImage(
  image: HTMLCanvasElement,
  options: {
    /** Brand, model, product or seller name the shopper typed next to the photo. */
    typedText?: string;
    /** The theme's thumbnail suffix for catalog images (`image_thumbnails_suffixes.md`), when thumbnails are on. */
    thumbnailSuffix?: string;
    /** Gets the first pass, so the shopper sees a guess while the catalog images are compared. */
    onCategories?: (categories: RankedCategoryType[]) => void;
  } = {},
): Promise<ImageSearchResultType> {
  const termsPromise = getPhotoTerms(image);
  const [imageEmbedding, prompts] = await Promise.all([getPhotoEmbedding(image), loadCategoryPrompts()]);

  if (!prompts.leaves.length) {
    return {
      matchLevel: "none",
      categories: [],
      similarProducts: [],
      photoTerms: await termsPromise,
      matchedQuery: "",
    };
  }

  const zeroShotScores = getZeroShotScores(imageEmbedding, prompts.embeddings);
  const firstPass = rankCategories(prompts.leaves, zeroShotScores, []);

  options.onCategories?.(firstPass.slice(0, RESULT_CATEGORY_COUNT));

  const readTerms = await termsPromise;
  // Typed words go first: the shopper knows the product better than the OCR does.
  const terms = uniqBy([...splitTypedText(options.typedText ?? ""), ...readTerms], (term) => term.toLowerCase());
  const textMatch = await matchText(terms.slice(0, MAX_TEXT_TERMS));

  const leafIds = new Set(prompts.leaves.map((leaf) => leaf.category.id));
  const textProducts = textMatch.products
    .map((product) => ({ product, categoryId: getLeafCategoryId(product.outline, leafIds) }))
    .filter((entry): entry is { product: ImageSearchProductType; categoryId: string } => !!entry.categoryId);
  const textProductIds = new Set(textProducts.map(({ product }) => product.id));

  const candidateIds = firstPass.slice(0, CANDIDATE_CATEGORY_COUNT).map((leaf) => leaf.category.id);
  const gallery = await loadGallery(candidateIds, textProducts, options.thumbnailSuffix);
  const neighbours = rankGallery(imageEmbedding, gallery);
  const textCategoryIds = textProducts.map(({ categoryId }) => categoryId);

  const textMatchSimilarity = textProducts.length
    ? Math.max(...neighbours.filter(({ item }) => textProductIds.has(item.id)).map(({ similarity }) => similarity), 0)
    : undefined;
  const matchLevel = assessMatch(neighbours[0]?.similarity, textMatchSimilarity);

  if (matchLevel === "none") {
    return { matchLevel, categories: [], similarProducts: [], photoTerms: readTerms, matchedQuery: "" };
  }

  // Lookalikes below the "nothing similar" line would only mislead; products the text names always stay.
  const similarProducts = boostTextMatches(neighbours, (product) => textProductIds.has(product.id)).filter(
    ({ item, similarity }) => similarity >= NO_MATCH_SIMILARITY || textProductIds.has(item.id),
  );

  return {
    matchLevel,
    categories: rankCategories(prompts.leaves, zeroShotScores, neighbours, textCategoryIds).slice(
      0,
      RESULT_CATEGORY_COUNT,
    ),
    similarProducts: similarProducts.slice(0, RESULT_PRODUCT_COUNT),
    photoTerms: readTerms,
    matchedQuery: textMatch.query,
  };
}

async function hasProducts(keyword: string, categoryId?: string): Promise<boolean> {
  try {
    const { totalCount } = await searchProducts({ keyword, categoryId, itemsPerPage: 1 }, { withImages: false });

    return !!totalCount;
  } catch (error) {
    Logger.error(`${useImageSearch.name}.${hasProducts.name}`, error);
    return false;
  }
}

function getSearchRoute(keyword: string): RouteLocationRaw {
  return { name: ROUTES.SEARCH.NAME, query: { [QueryParamName.SearchPhrase]: keyword } };
}

/**
 * Where a confirmed image search lands. Results are never padded with unrelated products: a keyword the category
 * has nothing for searches the whole catalog (the text may name a product filed elsewhere), and a search that
 * finds nothing lands on the standard empty results page. A category alone is the shopper's or a confident
 * recognition's choice, so it opens as is.
 */
export async function getImageSearchRoute(params: {
  keyword: string;
  category?: Pick<CategoryNodeType, "id" | "slug">;
}): Promise<RouteLocationRaw> {
  const { keyword, category } = params;

  if (!category) {
    return getSearchRoute(keyword);
  }

  if (!keyword) {
    return getCategoryRoute(category);
  }

  return (await hasProducts(keyword, category.id))
    ? getCategoryRoute(category, { [QueryParamName.SearchPhrase]: keyword })
    : getSearchRoute(keyword);
}

export function useImageSearch() {
  const router = useRouter();
  const { themeContext } = useThemeContext();

  const thumbnailSuffix = computed(() => {
    const settings = themeContext.value?.settings;

    return settings?.image_thumbnails_enabled ? settings.image_thumbnails_suffixes?.md : undefined;
  });

  async function searchByImage(params: Parameters<typeof getImageSearchRoute>[0]): Promise<void> {
    await router.push(await getImageSearchRoute(params));
  }

  function recognize(
    image: HTMLCanvasElement,
    options: { typedText?: string; onCategories?: (categories: RankedCategoryType[]) => void } = {},
  ): Promise<ImageSearchResultType> {
    return recognizeImage(image, { ...options, thumbnailSuffix: thumbnailSuffix.value });
  }

  return {
    recognize,
    searchByImage,
  };
}
