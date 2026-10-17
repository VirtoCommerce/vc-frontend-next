<template>
  <div v-if="announcement" class="app-announcement" :style="announcement.style" :data-pb-section="announcement.id">
    <a v-if="isExternal(announcement.link)" :href="announcement.link" target="_blank" rel="noopener noreferrer">
      {{ announcement.text }}
    </a>

    <router-link v-else-if="announcement.link" :to="announcement.link">{{ announcement.text }}</router-link>

    <span v-else>{{ announcement.text }}</span>
  </div>

  <!-- The header group's Header section hidden in the page designer: no header -->
  <template v-if="headerTurnedOff" />

  <!-- Mobile header -->
  <MobileHeader v-else-if="isMobile" />

  <!-- Desktop header -->
  <template v-else>
    <div class="app-header">
      <div class="app-header__shell">
        <HeaderPlate
          ref="headerPlate"
          :is-catalog-button-shown="desktopMenuMode === DESKTOP_MENU_MODES.fullscreen"
          :is-mega-menu-shown="isMegaMenuShown"
        />
      </div>
    </div>

    <div class="app-header__print">
      <VcImage :src="logoUrl" :alt="$context.storeName" class="app-header__print-logo" />

      <Created />
    </div>
  </template>
</template>

<script setup lang="ts">
import { useBreakpoints, useCssVar } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWhiteLabeling, useThemeContext } from "@/core/composables";
import { DESKTOP_MENU_MODES } from "@/core/constants";
import { useUser } from "@/shared/account";
import { useSectionGroups } from "@/shared/layout/composables/useSectionGroups";
import { BREAKPOINTS } from "@/ui-kit/constants";
import Created from "../print/created.vue";
import HeaderPlate from "./_internal/header-plate.vue";
import MobileHeader from "./_internal/mobile-header.vue";

const OFFSET_TOP = 20;

/**
 * VCST-6030 demo branch: set to false to drop the category row from the header plate
 * entirely, leaving the single-row header. The store's `desktop_menu_mode` still decides
 * between the mega menu and the catalog button when this is on.
 */
const MEGA_MENU_ENABLED = true;

const breakpoints = useBreakpoints(BREAKPOINTS);
const { logoUrl } = useWhiteLabeling();
const { themeContext } = useThemeContext();

// The height the plate PAINTS when pinned, which the plate itself reports. Measuring the
// .app-header shell instead counted the air around the plate and the padding the pinned plate
// keeps in flow, and put everything hanging off these vars a step and a half too low.
const headerPlate = ref<{ pinnedHeight: number } | null>(null);
const headerHeightVar = useCssVar("--vc-layout-sidebar-offset-top");
// Exact sticky header height (no offset buffer), so other components (e.g. sticky elements that
// need to sit flush below the app header) can rely on it too. Only updated here for desktop —
// MobileHeader owns this var while it's the one rendered (see mobile-header.vue).
const appHeaderHeightVar = useCssVar("--vc-app-header-height");

// For optimization on mobile devices
const isMobile = breakpoints.smaller("lg");
const headerHeight = computed(() => headerPlate.value?.pinnedHeight ?? 0);

const desktopMenuMode = computed(() => themeContext.value?.settings?.desktop_menu_mode);

const route = useRoute();
const isExternal = (link?: string) => !!link && /^https?:\/\//i.test(link);

const { findSection, isTurnedOff } = useSectionGroups();
// the header group's Header section hidden (the designer's eye): no header
const headerTurnedOff = computed(() => isTurnedOff("header", "site-header"));
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// The header group's Announcement bar: its first shown announcement over the header. "Home page only" keeps it off
// the other pages; the designer's preview shows it whatever page is edited.
const announcement = computed(() => {
  const bar = findSection("header", "announcement-bar");
  const block = bar?.blocks?.find((item) => !item.hidden && text(item.text));
  const home = route.path === "/" || route.name === "Home" || route.path === "/designer-preview";
  if (!bar || !block || (bar.home_only && !home)) {
    return undefined;
  }
  return {
    id: bar.id,
    text: text(block.text),
    link: text(block.link) || undefined,
    style: { backgroundColor: text(bar.background) || undefined, color: text(bar.color) || undefined },
  };
});

watch(headerHeight, (value) => {
  headerHeightVar.value = `${value + OFFSET_TOP}px`;
});

watch([headerHeight, isMobile], ([value, mobile]) => {
  if (mobile) {
    return;
  }

  appHeaderHeightVar.value = `${value}px`;
});

const { isAuthenticated } = useUser();

const isMegaMenuShown = computed(() => {
  return (
    MEGA_MENU_ENABLED &&
    desktopMenuMode.value === DESKTOP_MENU_MODES.horizontal &&
    (isAuthenticated.value || themeContext.value.storeSettings.anonymousUsersAllowed)
  );
});
</script>

<style lang="scss">
.app-announcement {
  @apply flex justify-center px-4 py-2 text-center text-sm;

  background-color: #3a3a3a;
  color: #fff;

  a {
    color: inherit;

    &:hover {
      @apply underline;
    }
  }

  @media print {
    @apply hidden;
  }
}

.app-header {
  // Sticky lives on the OUTER element: a sticky box can only travel inside its parent,
  // and the shell is exactly as tall as the header. The negative offset equals the
  // shell's top padding, so the plate itself lands flush at viewport 0 when pinned —
  // which is also what header-plate reads to decide it is stuck.
  //
  // Above the screens' own sticky panels, which is what the design asks for — its header is 60
  // in a stack whose plates are 1. Ours is not that stack: the catalog and account toolbars sit
  // at 40 and used to pin OVER the header, while modals, the popup sidebar and the mobile menu
  // are at 50 and have to stay over it. 45 is the only rung that is both.
  @apply sticky z-[45];

  // Everything around the plate — the air above it, the air below it, and the strip the
  // pinned plate reserves but no longer paints — is air, not an element. Without this it
  // lies over the page as an invisible lid and swallows clicks meant for the content.
  // The plate itself takes the events back (see header-plate.vue).
  @apply pointer-events-none;

  // The shell's top padding, negated: the plate then lands flush at viewport 0 when the
  // header pins, which is also the geometry header-plate reads to decide it is stuck.
  top: calc(-1 * var(--page-stack, 1.5rem));

  @media print {
    @apply hidden;
  }

  // The page inset, and the one step of air ABOVE the plate. Nothing below it: the gap down to
  // the first content belongs to the page, which already spends it through VcContainer's own
  // top padding — measured against the design at 1512, its header ends at 154 and the content
  // starts at 194, all 40 of it the container's. A step here as well made ours 66.
  &__shell {
    @apply relative mx-auto;

    --gutter: var(--page-gutter, theme("padding.6"));

    max-width: calc(var(--vc-container-max-width, 87.75rem) + 2 * var(--gutter));
    padding: var(--page-stack, 1.5rem) var(--gutter) 0;
  }

  &__print {
    @apply hidden items-start justify-between;

    @media print {
      @apply flex;
    }
  }

  &__print-logo {
    @apply h-12;
  }
}
</style>
