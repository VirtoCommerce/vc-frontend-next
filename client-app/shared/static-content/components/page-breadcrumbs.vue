<template>
  <div class="page-breadcrumbs mx-auto mt-7 w-full max-w-screen-2xl px-5 pb-5 md:px-12 lg:pb-10">
    <VcBreadcrumbs class="mb-3" :items="breadcrumbs" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useBreadcrumbs } from "@/core/composables";
import { humanizeName } from "@/core/utilities/common";
import { useStaticPage } from "../composables/useStaticPage";

// The page's trail (Home / the page), as the page settings' "Hide Breadcrumbs" used to draw it above the sections.
// The live page name is injected into `settings.name` upstream (useSlugInfo), so it follows renames.
const { staticPage } = useStaticPage();
const breadcrumbs = useBreadcrumbs(
  computed(() => [{ title: humanizeName(staticPage.value?.settings?.name || "") }] as IBreadcrumb[]),
);
</script>

<style lang="scss">
// Breadcrumbs then the page's heading read as one block, as the page settings drew them; in the designer's preview
// an empty scroll anchor sits between the two.
.page-breadcrumbs:has(+ .page-heading, + .empty-block-for-scroll-to + .page-heading) {
  padding-bottom: 0;
}

.page-breadcrumbs + .page-heading,
.page-breadcrumbs + .empty-block-for-scroll-to + .page-heading {
  margin-top: 0;
}
</style>
