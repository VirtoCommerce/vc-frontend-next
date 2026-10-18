<template>
  <template v-if="shownTemplate">
    <!-- the page template's sections above the page's own -->
    <TemplateSection v-for="entry in templateParts.before" :key="entry.item.id" :entry="entry" :settings="settings" />

    <component
      :is="getBlockType(templateParts.main.anchor.type)"
      v-if="templateParts.main?.anchor"
      v-bind="templateParts.main.anchor"
      :model="templateParts.main.anchor"
    />

    <!-- the page itself, given its settings over its template's -->
    <slot :settings="settings" />

    <!-- the page template's sections below the page's own -->
    <TemplateSection v-for="entry in templateParts.after" :key="entry.item.id" :entry="entry" :settings="settings" />

    <component
      :is="getBlockType(templateParts.end.type)"
      v-if="templateParts.end"
      v-bind="templateParts.end"
      :model="templateParts.end"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { globals } from "@/core/globals";
import { getBlockType } from "@/plugins/builder-preview/block-mapping";
import { BUILT_IN_TEMPLATES, PAGE_LAYOUTS, splitTemplate, useThemeTemplates } from "../templates";
import TemplateSection from "./template-section.vue";
import type { PageLayoutType } from "../templates";
import type { IPageTemplate } from "../types";

interface IProps {
  /** the page's own settings: its explicit `template`, its `layout`, its `permalink` */
  pageSettings?: Record<string, unknown>;
}

const props = defineProps<IProps>();

const route = useRoute();

const { templateFor, previewFor, loadTemplateRules, pageLayout } = useThemeTemplates();
void loadTemplateRules();
/** The template the page chose, or the store's rules picked for it */
const pageTemplate = shallowRef<IPageTemplate>();
/**
 * The page designer's page template while it edits one, else the page's. Until the page's is known the page shows
 * right away in the built-in one (just the page): the rules are loaded at start, so a template follows at once.
 */
const shownTemplate = computed(() => previewFor("page") ?? pageTemplate.value ?? BUILT_IN_TEMPLATES.page);

/** The page template's sections around the page (where its `page-content` section is; else all after) */
const templateParts = computed(() => splitTemplate(shownTemplate.value?.content ?? [], "page-content"));

/** The page's settings over its template's */
const settings = computed<Record<string, unknown>>(() => ({ ...shownTemplate.value?.settings, ...props.pageSettings }));

watch(
  () => props.pageSettings,
  async (pageSettings = {}) => {
    pageTemplate.value = await templateFor(
      "page",
      {
        path: typeof pageSettings.permalink === "string" ? pageSettings.permalink : route.path,
        language: globals.cultureName,
        settings: pageSettings,
      },
      BUILT_IN_TEMPLATES,
      typeof pageSettings.template === "string" ? pageSettings.template : undefined,
    );
  },
  { immediate: true },
);

// the layout the page (else its template) asks for: the site's header and footer, the logo only, or none. It isn't
// reset when the frame unmounts: switching the layout remounts the page under the new one; leaving the page resets it
watchEffect(() => {
  // until the page's template is known (a remount after a layout switch starts in the built-in one), keep the layout
  if (!previewFor("page") && !pageTemplate.value && !props.pageSettings?.layout) {
    return;
  }
  const layout = settings.value.layout;
  pageLayout.value = PAGE_LAYOUTS.includes(layout as PageLayoutType) ? (layout as PageLayoutType) : undefined;
});
</script>
