<template>
  <div ref="cropperElement" class="image-cropper">
    <canvas ref="canvasElement" class="image-cropper__canvas" :aria-label="alt" role="img" />

    <div
      class="image-cropper__area"
      :style="areaStyle"
      data-test-id="image-search-crop-area-section"
      @pointerdown="onPointerDown($event, 'move')"
    >
      <span
        v-for="handle in CROP_HANDLES"
        :key="handle"
        :class="['image-cropper__handle', `image-cropper__handle--${handle}`]"
        :data-test-id="`image-search-crop-${handle}-handle`"
        @pointerdown.stop="onPointerDown($event, handle)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import { clampCropArea, CROP_HANDLES, resizeCropArea } from "@/shared/layout/utils/image-search/image-crop";
import type { CropAreaType, CropHandleType } from "@/shared/layout/utils/image-search/image-crop";

interface IEmits {
  (event: "update:modelValue", value: CropAreaType): void;
  (event: "change", value: CropAreaType): void;
}

interface IProps {
  image: ImageBitmap;
  modelValue: CropAreaType;
  alt?: string;
}

const emit = defineEmits<IEmits>();

const props = defineProps<IProps>();

type DragModeType = CropHandleType | "move";

const cropperElement = useTemplateRef("cropperElement");
const canvasElement = useTemplateRef("canvasElement");

const drag = ref<{ mode: DragModeType; startX: number; startY: number; startArea: CropAreaType } | null>(null);

const areaStyle = computed(() => ({
  left: `${props.modelValue.x * 100}%`,
  top: `${props.modelValue.y * 100}%`,
  width: `${props.modelValue.width * 100}%`,
  height: `${props.modelValue.height * 100}%`,
}));

watch(() => props.image, drawImage);

function drawImage(): void {
  const canvas = canvasElement.value;

  if (!canvas) {
    return;
  }

  canvas.width = props.image.width;
  canvas.height = props.image.height;
  canvas.getContext("2d")?.drawImage(props.image, 0, 0);
}

function onPointerDown(event: PointerEvent, mode: DragModeType): void {
  event.preventDefault();
  drag.value = { mode, startX: event.clientX, startY: event.clientY, startArea: { ...props.modelValue } };
}

function onPointerMove(event: PointerEvent): void {
  const bounds = cropperElement.value?.getBoundingClientRect();

  if (!drag.value || !bounds?.width || !bounds.height) {
    return;
  }

  const { mode, startX, startY, startArea } = drag.value;
  const dx = (event.clientX - startX) / bounds.width;
  const dy = (event.clientY - startY) / bounds.height;

  const area =
    mode === "move"
      ? clampCropArea({ ...startArea, x: startArea.x + dx, y: startArea.y + dy })
      : resizeCropArea(startArea, mode, dx, dy);

  emit("update:modelValue", area);
}

function onPointerUp(): void {
  if (!drag.value) {
    return;
  }

  drag.value = null;
  emit("change", props.modelValue);
}

useEventListener(window, "pointermove", onPointerMove);
useEventListener(window, "pointerup", onPointerUp);
useEventListener(window, "pointercancel", onPointerUp);

onMounted(drawImage);
</script>

<style lang="scss">
.image-cropper {
  // On a phone the photo takes the whole width: a portrait shot fitted into a height limit came out narrow and
  // small, and the dialog scrolls anyway. A wider screen centres it and caps its height instead.
  @apply relative w-full select-none overflow-hidden rounded-[--vc-radius];

  // The page must not scroll or zoom under a finger that drags the area.
  touch-action: none;

  @media (width >= theme("screens.md")) {
    @apply mx-auto w-fit;
  }

  &__canvas {
    @apply block h-auto w-full;

    @media (width >= theme("screens.md")) {
      @apply w-auto max-h-[45vh] max-w-full;
    }
  }

  &__area {
    @apply absolute cursor-move border-2 border-primary;

    // Dims everything the crop leaves out; product shots are mostly white, so the veil has to be dark.
    box-shadow: 0 0 0 100vmax rgb(from var(--color-neutral-900) r g b / 0.5);
  }

  // Physical sides, not logical: the photo is not mirrored in RTL, and the crop math works in its own axes.
  // Every handle is a 1.5rem strip inside the frame, wide enough for a finger; corners sit on top of sides.
  &__handle {
    @apply absolute z-[1] border-primary;

    &--top-left {
      @apply left-0 top-0 z-[2] size-6 cursor-nwse-resize border-l-4 border-t-4;
    }

    &--top-right {
      @apply right-0 top-0 z-[2] size-6 cursor-nesw-resize border-r-4 border-t-4;
    }

    &--bottom-left {
      @apply bottom-0 left-0 z-[2] size-6 cursor-nesw-resize border-b-4 border-l-4;
    }

    &--bottom-right {
      @apply bottom-0 right-0 z-[2] size-6 cursor-nwse-resize border-b-4 border-r-4;
    }

    &--top,
    &--bottom {
      @apply inset-x-0 h-6 cursor-ns-resize;
    }

    &--left,
    &--right {
      @apply inset-y-0 w-6 cursor-ew-resize;
    }

    &--top {
      @apply top-0;
    }

    &--bottom {
      @apply bottom-0;
    }

    &--left {
      @apply left-0;
    }

    &--right {
      @apply right-0;
    }

    // The grip in the middle of a side shows that the side itself can be dragged.
    &--top::before,
    &--bottom::before,
    &--left::before,
    &--right::before {
      @apply absolute rounded-full bg-primary content-[""];
    }

    &--top::before,
    &--bottom::before {
      @apply left-1/2 h-1 w-8 -translate-x-1/2;
    }

    &--top::before {
      @apply top-0;
    }

    &--bottom::before {
      @apply bottom-0;
    }

    &--left::before,
    &--right::before {
      @apply top-1/2 h-8 w-1 -translate-y-1/2;
    }

    &--left::before {
      @apply left-0;
    }

    &--right::before {
      @apply right-0;
    }
  }
}
</style>
