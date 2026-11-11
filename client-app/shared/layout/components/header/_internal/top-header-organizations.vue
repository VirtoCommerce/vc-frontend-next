<template>
  <div ref="root" class="top-header-organizations">
    <VcAlert
      v-if="switchError"
      class="top-header-organizations__error"
      color="danger"
      size="sm"
      variant="outline-dark"
      icon
    >
      {{ switchError }}
    </VcAlert>

    <div v-if="!isShowSearch" class="top-header-organizations__label">
      {{ $t("common.labels.organizations") }}
    </div>

    <div v-else class="top-header-organizations__search">
      <div class="top-header-organizations__label">
        {{ $t("common.labels.organizations") }}
      </div>

      <VcInput
        v-model="searchPhrase"
        type="search"
        size="sm"
        data-test-id="organizations-search"
        :placeholder="$t('shared.layout.header.top_header.search_organizations')"
        :aria-label="$t('shared.layout.header.top_header.search_organizations')"
        :clearable="!!searchPhrase"
        :aria="{
          role: 'combobox',
          'aria-expanded': 'true',
          'aria-haspopup': 'listbox',
          'aria-controls': listboxId,
          'aria-activedescendant': activeDescendantId ?? null,
        }"
        @keydown.enter="onSearch"
        @keydown.down.prevent="moveFocus(1)"
        @input="onSearchInput"
        @clear="onSearchClear"
      >
        <template #append>
          <VcButton
            icon="search"
            icon-size="1rem"
            :aria-label="$t('shared.layout.header.top_header.search_organizations')"
            data-test-id="organizations-search-button"
            @click="onSearch"
          />
        </template>
      </VcInput>
    </div>

    <div class="top-header-organizations__list">
      <VcScrollbar
        :id="listboxId"
        vertical
        role="listbox"
        :aria-label="$t('common.labels.organizations')"
        class="top-header-organizations__scroll"
        test-id="organizations-list"
      >
        <VcMenuItem
          v-for="(item, index) in displayedOrganizations"
          :key="item.id"
          size="sm"
          role="option"
          class="top-header-organizations__item"
          :active="contactOrganizationId === item.id"
          :option-id="getOptionId(index)"
          :data-vc-organization-option="componentId"
          :aria-selected="contactOrganizationId === item.id"
          :disabled="item.isLockedForCurrentUser"
          :title="
            item.isLockedForCurrentUser ? $t('shared.layout.header.top_header.organization_locked_tooltip') : undefined
          "
          @click="selectOrganization(item.id)"
          @keydown.up.prevent="moveFocus(-1)"
          @keydown.down.prevent="moveFocus(1)"
        >
          <VcRadioButton
            :model-value="contactOrganizationId"
            size="sm"
            :label="item.name"
            :value="item.id"
            :max-lines="2"
            :title="item.name"
            word-break="break-word"
            :data-organization-name="item.name"
            :disabled="item.isLockedForCurrentUser"
          />

          <template v-if="item.isLockedForCurrentUser" #append>
            <VcIcon name="lock-closed" size="sm" class="top-header-organizations__lock" />
          </template>
        </VcMenuItem>

        <VcInfinityScrollLoader
          v-if="hasNextPage"
          :loading="loading"
          :page-number="currentPage"
          :pages-count="pagesCount"
          distance="50"
          class="top-header-organizations__loader"
          @visible="loadOrganizations"
        />
      </VcScrollbar>

      <!-- Outside the listbox (only options belong there) and always rendered, so an empty result is announced. -->
      <output>
        <span
          v-if="organizations.length === 0 && !loading"
          class="top-header-organizations__empty"
          data-test-id="organizations-empty-list"
        >
          {{ $t("shared.layout.header.top_header.no_results") }}
        </span>
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn, useEventListener } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import { useOrganizationSwitcher, useUser, useUserOrganizations } from "@/shared/account";
import { useComponentId } from "@/ui-kit/composables";

const emit = defineEmits<{
  organizationSelected: [];
}>();

const SEARCH_DEBOUNCE_MS = 300;

const { user, organization } = useUser();
const {
  searchPhrase,
  organizations,
  loading,
  hasNextPage,
  pagesCount,
  currentPage,
  loadOrganizations,
  search,
  isShowSearch,
} = useUserOrganizations();
const { switchError, trySwitch } = useOrganizationSwitcher();

const contactOrganizationId = ref(user.value?.contact?.organizationId);

// Keep the radio selection in sync with the actual active organization so a failed/abandoned switch
// can't leave the optimistic value stale (clicking the current org early-returns without re-syncing).
watch(
  () => user.value?.contact?.organizationId,
  (organizationId) => {
    contactOrganizationId.value = organizationId;
  },
);

const componentId = useComponentId("organizations");
const listboxId = componentId + "-listbox";
const activeDescendantId = ref<string>();
const root = useTemplateRef<HTMLElement>("root");

// The list is shared session state, so a lock applied while this menu was closed would otherwise
// leave a stale, clickable row. Refresh on every mount to catch that. The phrase is shared too
// (mobile menu), so each open starts from the full list.
onMounted(() => {
  searchPhrase.value = "";
  void search();
});

// Without the search field the popover keeps focus on its own panel, so arrows enter the list from there.
useEventListener(
  () => root.value?.closest<HTMLElement>("[role='dialog']"),
  "keydown",
  (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
      return;
    }

    event.preventDefault();
    moveFocus(event.key === "ArrowDown" ? 1 : -1);
  },
);

const displayedOrganizations = computed(() => {
  const withoutCurrent = organizations.value.filter((item) => item.id !== organization.value?.id);

  if (organization.value && !loading.value && organizations.value.length > 0) {
    return [organization.value, ...withoutCurrent];
  }

  return withoutCurrent;
});

watch(displayedOrganizations, () => {
  activeDescendantId.value = undefined;
});

function getOptionId(index: number): string {
  return `${componentId}-option-${index}`;
}

// Locked rows are disabled buttons that can't take focus, so they're left out and arrows step over them.
function getOptionElements(): HTMLElement[] {
  const elements = document.querySelectorAll<HTMLElement>(
    `[data-vc-organization-option="${componentId}"] [tabindex='0']:not(:disabled)`,
  );
  return Array.from(elements);
}

function moveFocus(step: 1 | -1): void {
  const elements = getOptionElements();

  if (!elements.length) {
    return;
  }

  let current = elements.indexOf(document.activeElement as HTMLElement);
  // From outside the list (search field, panel) Down enters at the top (-1 + 1) and Up at the bottom (0 - 1).
  if (current === -1 && step === -1) {
    current = 0;
  }
  const target = elements[(current + step + elements.length) % elements.length];

  activeDescendantId.value = target?.id;
  target?.focus();
}

async function selectOrganization(organizationId: string): Promise<void> {
  if (!organizationId) {
    return;
  }

  // The current organization is already active — selecting it must not trigger a redundant switch.
  if (organizationId === organization.value?.id) {
    emit("organizationSelected");
    return;
  }

  const target = organizations.value.find((item) => item.id === organizationId);
  if (target?.isLockedForCurrentUser) {
    return;
  }

  contactOrganizationId.value = organizationId;

  const succeeded = await trySwitch(organizationId);

  if (!succeeded) {
    contactOrganizationId.value = user.value?.contact?.organizationId;
    return;
  }

  emit("organizationSelected");
}

async function onSearch(): Promise<void> {
  await search();
}

const debouncedSearch = useDebounceFn(search, SEARCH_DEBOUNCE_MS);

async function onSearchInput(): Promise<void> {
  if (!searchPhrase.value.trim()) {
    await search();
  } else {
    void debouncedSearch();
  }
}

// Not reset(): it zeroes the total, which hides the search block and drops focus out of the dialog.
async function onSearchClear(): Promise<void> {
  searchPhrase.value = "";
  await search();
}
</script>

<style lang="scss">
// Drawn as one column of the header's organizations popover (header-organizations-menu.vue): the
// title and search stay put and only the list scrolls.
.top-header-organizations {
  @apply flex flex-col;

  &__error {
    @apply mb-2.5;
  }

  &__search {
    @apply pb-2.5;

    // A field, not a pill; the in-field button follows (VcInput takes the field radius less 2px).
    --vc-input-radius: var(--control-radius, 0.5rem);
  }

  &__label {
    @apply pb-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600;
  }

  // The list is one outlined tile, like the groups of the account and preferences menus. The tile is
  // our own wrapper: VcScrollbar only takes the leftover height.
  &__list {
    @apply flex min-h-0 flex-1 flex-col rounded-[--vc-radius] border border-neutral-200 p-1 pb-1.5;
  }

  &__scroll {
    @apply min-h-0 flex-1;
  }

  // Rows draw on the header's shared menu plates (header-plate.vue); bold marks the current one.
  &__item {
    --vc-menu-item-radius: var(--control-radius, 0.5rem);
    --vc-menu-item-padding-x: theme("spacing[2.5]");
    --vc-menu-item-hover-bg: var(--header-menu-hover-bg);
    --vc-menu-item-active-bg: var(--header-menu-active-bg);

    & + & {
      @apply mt-0.5;
    }
  }

  &__lock {
    --vc-icon-color: theme("colors.neutral.600");
  }

  &__loader {
    @apply py-2;
  }

  &__empty {
    @apply block px-2.5 py-2 text-center text-sm text-neutral-600;
  }
}
</style>
