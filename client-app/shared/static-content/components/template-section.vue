<template>
  <!-- the designer preview's marker where the section starts (its outlines and scrolling) -->
  <component :is="getBlockType(entry.anchor.type)" v-if="entry.anchor" v-bind="entry.anchor" :model="entry.anchor" />

  <component
    :is="getBlockType(entry.item.type)"
    v-if="!entry.item.hidden"
    v-bind="{ ...$attrs, ...context, ...entry.item }"
    :id="getAnchorId(entry.item)"
    :model="entry.item"
    :settings="settings"
  />
</template>

<script setup lang="ts">
import { getBlockType } from "@/plugins/builder-preview/block-mapping";
import { getAnchorId } from "../anchors";
import type { TemplateEntryType } from "../templates/sections";

interface IProps {
  /** a section of a product, category or page template */
  entry: TemplateEntryType;
  /** the template's settings */
  settings?: Record<string, unknown>;
  /** what the page passes every section (the product, the category), under the section's own settings */
  context?: Record<string, unknown>;
}

// the page's attributes (its spacing) go to the section, not its marker
defineOptions({ inheritAttrs: false });

defineProps<IProps>();
</script>
