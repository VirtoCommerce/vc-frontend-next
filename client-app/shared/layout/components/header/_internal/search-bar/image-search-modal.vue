<template>
  <VcModal
    :title="$t('shared.layout.search_bar.image_search.title')"
    class="image-search-modal"
    max-width="40rem"
    is-mobile-fullscreen
  >
    <div class="image-search-modal__body">
      <template v-if="!image">
        <p class="image-search-modal__description">
          {{ $t("shared.layout.search_bar.image_search.description") }}
        </p>

        <!-- Decoding a phone photo takes a second or two; without this the dialog looks frozen. -->
        <div
          v-if="isLoadingFile"
          class="image-search-modal__file-loader"
          aria-live="polite"
          data-test-id="image-search-file-loader-section"
        >
          <VcLoaderWithText :text="$t('shared.layout.search_bar.image_search.loading_photo')" />
        </div>

        <button
          v-else
          type="button"
          class="image-search-modal__dropzone"
          :class="{ 'image-search-modal__dropzone--active': isDragOver }"
          data-test-id="image-search-dropzone-button"
          @click="openFilePicker"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
        >
          <VcIcon name="photograph" size="lg" />

          <span class="image-search-modal__dropzone-text">
            {{
              isMobile
                ? $t("shared.layout.search_bar.image_search.dropzone_mobile")
                : $t("shared.layout.search_bar.image_search.dropzone")
            }}
          </span>
        </button>
      </template>

      <template v-else>
        <p class="image-search-modal__description">
          {{ $t("shared.layout.search_bar.image_search.crop_hint") }}
        </p>

        <ImageCropper
          v-model="cropArea"
          class="image-search-modal__cropper"
          :image="image"
          :alt="$t('shared.layout.search_bar.image_search.preview_alt')"
          @change="recognize"
        />

        <VcInput
          v-model.trim="keyword"
          class="image-search-modal__keyword"
          :label="$t('shared.layout.search_bar.image_search.keyword_label')"
          :placeholder="$t('shared.layout.search_bar.image_search.keyword_placeholder')"
          test-id-input="image-search-keyword-input"
          @input="onKeywordInput"
          @keydown.enter="confirm"
        />

        <div class="image-search-modal__recognition" aria-live="polite">
          <VcLoaderWithText v-if="isRecognizing" :text="recognitionStatus" />

          <template v-else>
            <VcAlert v-if="recognitionFailed" color="warning" size="sm" variant="soft" icon>
              {{ $t("shared.layout.search_bar.image_search.errors.not_recognized") }}
            </VcAlert>

            <VcAlert
              v-else-if="matchLevel === 'none'"
              class="image-search-modal__no-match"
              color="info"
              variant="soft"
              icon
              :title="$t('shared.layout.search_bar.image_search.no_match.title')"
            >
              {{ $t("shared.layout.search_bar.image_search.no_match.text") }}
            </VcAlert>

            <VcAlert v-else-if="matchLevel === 'weak'" color="info" size="sm" variant="soft" icon>
              {{ $t("shared.layout.search_bar.image_search.weak_match") }}
            </VcAlert>

            <p
              v-if="photoTerms.length"
              class="image-search-modal__photo-text"
              data-test-id="image-search-photo-text-label"
            >
              {{ $t("shared.layout.search_bar.image_search.photo_text", { text: photoTerms.join(", ") }) }}
            </p>

            <span class="image-search-modal__label">{{ categoriesLabel }}</span>

            <div class="image-search-modal__categories">
              <VcChip
                v-for="item in categoryOptions"
                :key="item.category.id"
                class="image-search-modal__category"
                :variant="item.category.id === selectedCategoryId ? 'solid' : 'outline'"
                color="primary"
                clickable
                :title="item.path.join(' / ')"
                :data-test-id="`image-search-category-${item.category.id}-option`"
                @click="selectCategory(item.category.id)"
              >
                {{ item.category.name }}
              </VcChip>

              <!-- Without a match there is nothing to widen: typed text already searches the whole catalog. -->
              <VcChip
                v-if="!showsDepartments"
                class="image-search-modal__category"
                :variant="selectedCategoryId ? 'outline' : 'solid'"
                color="secondary"
                clickable
                data-test-id="image-search-all-categories-option"
                @click="selectCategory(undefined)"
              >
                {{ $t("shared.layout.search_bar.image_search.all_categories") }}
              </VcChip>
            </div>

            <VcLoaderWithText v-if="isRefining" :text="$t('shared.layout.search_bar.image_search.refining')" />

            <ImageSearchSimilarProducts
              v-else-if="similarProducts.length"
              class="image-search-modal__similar"
              :title="
                matchLevel === 'match'
                  ? $t('shared.layout.search_bar.image_search.similar_products')
                  : $t('shared.layout.search_bar.image_search.closest_products')
              "
              :products="similarProducts"
              @select="closeModal()"
            />
          </template>
        </div>
      </template>

      <input ref="fileInput" type="file" class="image-search-modal__input" accept="image/*" @change="onFileSelected" />

      <input
        ref="cameraInput"
        type="file"
        class="image-search-modal__input"
        accept="image/*"
        capture="environment"
        @change="onFileSelected"
      />
    </div>

    <template #actions="{ close }">
      <!-- On a phone the dropzone above opens the gallery and the header cross closes the dialog,
           so the one action left is the camera, which a desktop rarely has. -->
      <VcButton
        v-if="!image && isMobile"
        class="image-search-modal__action"
        prepend-icon="camera"
        :loading="isLoadingFile"
        data-test-id="image-search-take-photo-button"
        @click="openCamera"
      >
        {{ $t("shared.layout.search_bar.image_search.take_photo") }}
      </VcButton>

      <template v-else-if="!image">
        <VcButton class="image-search-modal__action" color="secondary" variant="outline" @click="close">
          {{ $t("common.buttons.cancel") }}
        </VcButton>

        <VcButton
          class="image-search-modal__action"
          prepend-icon="upload"
          :loading="isLoadingFile"
          data-test-id="image-search-upload-button"
          @click="openFilePicker"
        >
          {{ $t("shared.layout.search_bar.image_search.upload_photo") }}
        </VcButton>
      </template>

      <template v-else>
        <VcButton
          class="image-search-modal__action"
          color="secondary"
          variant="outline"
          data-test-id="image-search-change-photo-button"
          @click="reset"
        >
          {{ $t("shared.layout.search_bar.image_search.change_photo") }}
        </VcButton>

        <VcButton
          class="image-search-modal__action"
          prepend-icon="search"
          :disabled="!canSearch"
          :loading="isSearching"
          data-test-id="image-search-confirm-button"
          @click="confirm"
        >
          {{ $t("shared.layout.search_bar.image_search.search") }}
        </VcButton>
      </template>
    </template>
  </VcModal>
</template>

<script setup lang="ts">
import { useBreakpoints, useDebounceFn, useEventListener } from "@vueuse/core";
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Logger } from "@/core/utilities";
import { loadImageSearchCategories, useImageSearch } from "@/shared/layout/composables/useImageSearch";
import { loadClipModel, removeModelProgressHandler } from "@/shared/layout/utils/image-search/clip-model";
import { cropImage, FULL_CROP_AREA, loadImageBitmap } from "@/shared/layout/utils/image-search/image-crop";
import { loadTextRecognizer } from "@/shared/layout/utils/image-search/text-recognizer";
import { useModal } from "@/shared/modal";
import { useNotifications } from "@/shared/notification";
import { BREAKPOINTS } from "@/ui-kit/constants";
import ImageCropper from "./image-cropper.vue";
import ImageSearchSimilarProducts from "./image-search-similar-products.vue";
import type { ImageSearchProductType } from "@/shared/layout/composables/useImageSearch";
import type { CropAreaType } from "@/shared/layout/utils/image-search/image-crop";
import type {
  CategoryNodeType,
  MatchLevelType,
  RankedCategoryType,
} from "@/shared/layout/utils/image-search/visual-ranking";

const { t } = useI18n();
const notifications = useNotifications();
const { recognize: recognizeWithCatalog, searchByImage } = useImageSearch();
const { closeModal } = useModal();

const breakpoints = useBreakpoints(BREAKPOINTS);
const isMobile = breakpoints.smaller("md");

const fileInput = useTemplateRef("fileInput");
const cameraInput = useTemplateRef("cameraInput");

const image = shallowRef<ImageBitmap | null>(null);
const cropArea = ref<CropAreaType>({ ...FULL_CROP_AREA });
const isDragOver = ref(false);
const isLoadingFile = ref(false);

/** Set while the model files download (first use only), 0..100. */
const modelProgress = ref<number | null>(null);
const isRecognizing = ref(false);
const isRefining = ref(false);
const recognitionFailed = ref(false);
/** Unknown (null) until the photo has been compared with the catalog. */
const matchLevel = ref<MatchLevelType | null>(null);
const rankedCategories = ref<RankedCategoryType[]>([]);
const rootCategories = ref<CategoryNodeType[]>([]);
const similarProducts = ref<ImageSearchProductType[]>([]);
const selectedCategoryId = ref<string>();
const isCategoryPickedByShopper = ref(false);
const keyword = ref("");
/** Once the shopper types, the field is theirs: recognition reads it and stops filling it in. */
const isKeywordTypedByShopper = ref(false);
const photoTerms = ref<string[]>([]);

const isSearching = ref(false);

const TYPED_TEXT_DEBOUNCE_MS = 700;

// Each photo, crop or typed text starts a new recognition; only the latest one may write its result.
let recognitionId = 0;
// Likewise for decoding: only the photo picked last is shown.
let fileLoadId = 0;
// The current crop; kept so typed text re-runs the catalog matching without reading the photo again.
let croppedImage: HTMLCanvasElement | null = null;

const showsDepartments = computed(() => recognitionFailed.value || matchLevel.value === "none");

// Nothing recognised: the departments are offered instead, so the shopper can still narrow the search by hand.
const categoryOptions = computed<Pick<RankedCategoryType, "category" | "path">[]>(() =>
  showsDepartments.value
    ? rootCategories.value.map((category) => ({ category, path: [category.name] }))
    : rankedCategories.value,
);

const categoriesLabel = computed(() => {
  if (showsDepartments.value) {
    return t("shared.layout.search_bar.image_search.browse_departments");
  }

  return matchLevel.value === "match"
    ? t("shared.layout.search_bar.image_search.detected_category")
    : t("shared.layout.search_bar.image_search.possible_categories");
});

const selectedCategory = computed(
  () => categoryOptions.value.find((item) => item.category.id === selectedCategoryId.value)?.category,
);

const recognitionStatus = computed(() =>
  modelProgress.value === null
    ? t("shared.layout.search_bar.image_search.recognizing")
    : t("shared.layout.search_bar.image_search.loading_model", { percent: modelProgress.value }),
);

const canSearch = computed(() => !isRecognizing.value && (!!keyword.value || !!selectedCategory.value));

function openFilePicker(): void {
  fileInput.value?.click();
}

function openCamera(): void {
  cameraInput.value?.click();
}

function showInfo(text: string): void {
  notifications.info({ text, duration: 5000, single: true });
}

function onModelProgress(percent: number): void {
  modelProgress.value = percent < 100 ? percent : null;
}

async function handleFile(file: File | undefined): Promise<void> {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showInfo(t("shared.layout.search_bar.image_search.errors.wrong_format"));
    return;
  }

  const currentLoadId = ++fileLoadId;
  let bitmap: ImageBitmap;

  isLoadingFile.value = true;

  try {
    bitmap = await loadImageBitmap(file);
  } catch (error) {
    Logger.error(`[image-search] ${handleFile.name}`, error);
    showInfo(t("shared.layout.search_bar.image_search.errors.unreadable"));
    return;
  } finally {
    if (currentLoadId === fileLoadId) {
      isLoadingFile.value = false;
    }
  }

  // A photo picked while an earlier one was still decoding wins.
  if (currentLoadId !== fileLoadId) {
    bitmap.close();
    return;
  }

  image.value?.close();
  image.value = bitmap;
  cropArea.value = { ...FULL_CROP_AREA };

  await recognize();
}

function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  void handleFile(input.files?.[0]);
  // The same photo picked again after "Change photo" must still fire `change`.
  input.value = "";
}

function onDrop(event: DragEvent): void {
  isDragOver.value = false;
  void handleFile(event.dataTransfer?.files[0]);
}

function onPaste(event: ClipboardEvent): void {
  const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));

  if (file) {
    void handleFile(file);
  }
}

function selectCategory(categoryId: string | undefined): void {
  selectedCategoryId.value = categoryId;
  isCategoryPickedByShopper.value = true;
}

/**
 * The refined ranking may reorder the first guess; a category the shopper picked by hand stays picked. Only a
 * confident match is picked for the shopper: a guess they did not choose would send them to the wrong department.
 */
function applyCategories(categories: RankedCategoryType[], shouldPreselect: boolean): void {
  const keepsSelection =
    isCategoryPickedByShopper.value &&
    (!selectedCategoryId.value || categories.some((item) => item.category.id === selectedCategoryId.value));

  rankedCategories.value = categories;

  if (!keepsSelection) {
    selectedCategoryId.value = shouldPreselect ? categories[0]?.category.id : undefined;
    isCategoryPickedByShopper.value = false;
  }
}

/** A new photo or crop: everything is recognised from scratch. */
async function recognize(): Promise<void> {
  if (!image.value) {
    return;
  }

  croppedImage = cropImage(image.value, cropArea.value);

  isRecognizing.value = true;
  isRefining.value = false;
  recognitionFailed.value = false;
  similarProducts.value = [];
  photoTerms.value = [];
  matchLevel.value = null;
  selectedCategoryId.value = undefined;
  isCategoryPickedByShopper.value = false;

  await runRecognition();
}

async function runRecognition(): Promise<void> {
  if (!croppedImage) {
    return;
  }

  const currentId = ++recognitionId;
  const isCurrent = () => currentId === recognitionId;

  try {
    const result = await recognizeWithCatalog(croppedImage, {
      typedText: isKeywordTypedByShopper.value ? keyword.value : "",
      onCategories: (categories) => {
        if (isCurrent() && isRecognizing.value) {
          applyCategories(categories, false);
          isRecognizing.value = false;
          isRefining.value = true;
        }
      },
    });

    if (!isCurrent()) {
      return;
    }

    if (result.matchLevel === "none") {
      rootCategories.value = await loadImageSearchCategories();

      if (!isCurrent()) {
        return;
      }
    }

    matchLevel.value = result.matchLevel;
    applyCategories(result.categories, result.matchLevel === "match");
    similarProducts.value = result.similarProducts.map(({ item }) => item);
    photoTerms.value = result.photoTerms;

    if (!isKeywordTypedByShopper.value) {
      keyword.value = result.matchedQuery;
    }
  } catch (error) {
    Logger.error(`[image-search] ${runRecognition.name}`, error);

    if (!isCurrent()) {
      return;
    }

    rootCategories.value = await loadImageSearchCategories();
    rankedCategories.value = [];
    matchLevel.value = null;
    recognitionFailed.value = true;
  } finally {
    if (isCurrent()) {
      isRecognizing.value = false;
      isRefining.value = false;
      modelProgress.value = null;
    }
  }
}

// A run already in flight is superseded, so the latest text always wins.
const refineWithTypedText = useDebounceFn(() => {
  if (croppedImage) {
    isRefining.value = !isRecognizing.value;
    void runRecognition();
  }
}, TYPED_TEXT_DEBOUNCE_MS);

function onKeywordInput(): void {
  isKeywordTypedByShopper.value = true;
  void refineWithTypedText();
}

function reset(): void {
  recognitionId++;
  fileLoadId++;
  isLoadingFile.value = false;
  croppedImage = null;
  image.value?.close();
  image.value = null;
  rankedCategories.value = [];
  similarProducts.value = [];
  photoTerms.value = [];
  matchLevel.value = null;
  selectedCategoryId.value = undefined;
  keyword.value = "";
  isKeywordTypedByShopper.value = false;
  recognitionFailed.value = false;
  isRecognizing.value = false;
  isRefining.value = false;
}

async function confirm(): Promise<void> {
  if (!canSearch.value || isSearching.value) {
    return;
  }

  isSearching.value = true;

  try {
    await searchByImage({ keyword: keyword.value, category: selectedCategory.value });
    closeModal();
  } catch (error) {
    Logger.error(`[image-search] ${confirm.name}`, error);
  } finally {
    isSearching.value = false;
  }
}

useEventListener(window, "paste", onPaste);

// Warm up while the shopper is still choosing a photo: the model downloads are the slow part.
void loadClipModel(onModelProgress).catch((error: unknown) =>
  Logger.warn("[image-search] model preload failed", error),
);
void loadTextRecognizer().catch((error: unknown) => Logger.warn("[image-search] OCR preload failed", error));
void loadImageSearchCategories();

onBeforeUnmount(() => {
  recognitionId++;
  fileLoadId++;
  removeModelProgressHandler(onModelProgress);
  image.value?.close();
});
</script>

<style lang="scss">
.image-search-modal {
  &__body {
    @apply flex flex-col gap-3;
  }

  &__dropzone {
    @apply flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-[--vc-radius] border-2 border-dashed border-neutral-300 p-6 text-center text-neutral-600;

    --vc-icon-color: theme("colors.primary.500");

    &:hover,
    &--active {
      @apply border-primary bg-primary-50;
    }
  }

  &__file-loader {
    @apply flex min-h-48 w-full items-center justify-center rounded-[--vc-radius] border-2 border-dashed border-neutral-300 p-6;
  }

  &__dropzone-text {
    @apply text-sm;
  }

  &__recognition {
    @apply flex min-h-20 flex-col gap-2;
  }

  &__label {
    @apply text-sm font-bold text-neutral-950;
  }

  &__photo-text {
    @apply text-sm text-neutral-700;
  }

  &__categories {
    @apply flex flex-wrap gap-2;
  }

  &__similar {
    @apply mt-1;
  }

  &__keyword {
    @apply mt-1;
  }

  &__input {
    @apply hidden;
  }

  &__action {
    @apply grow;

    @media (width >= theme("screens.md")) {
      @apply grow-0;
    }
  }
}
</style>
