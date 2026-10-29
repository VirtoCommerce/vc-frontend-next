<template>
  <VcPopover
    class="header-organizations-menu"
    placement="bottom-end"
    :offset-options="10"
    role="dialog"
    :aria-label="$t('common.labels.organizations')"
    lazy
    shadow
    @toggle="onToggle"
  >
    <template #trigger="{ opened, triggerProps }">
      <HeaderPod
        :opened="opened"
        :aria-label="triggerLabel"
        :title="organization?.name"
        data-test-id="organizations-button"
        v-bind="triggerProps"
      >
        <VcIcon name="briefcase-business" size="sm" />
      </HeaderPod>
    </template>

    <template #content="{ close }">
      <div class="header-organizations-menu__panel">
        <TopHeaderOrganizations
          :key="openCount"
          class="header-organizations-menu__list"
          @organization-selected="close"
        />
      </div>
    </template>
  </VcPopover>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useUser } from "@/shared/account";
import HeaderPod from "./header-pod.vue";
import TopHeaderOrganizations from "./top-header-organizations.vue";

const { t } = useI18n();
const { organization } = useUser();

// The popover only hides its content when closed, so re-mount the list on each open: it refetches
// and drops a previous switch error instead of showing a stale state.
const openCount = ref(0);

function onToggle(opened: boolean) {
  if (opened) {
    openCount.value++;
  }
}

// Icon-only, so the name says what the button opens before whose organization is current.
const triggerLabel = computed(() =>
  organization.value?.name
    ? t("shared.layout.header.organizations_menu.trigger_label", { name: organization.value.name })
    : t("common.labels.organizations"),
);
</script>

<style lang="scss">
.header-organizations-menu {
  // The design's popover surface is the plate cream, which VcMenuItem rows already rest on
  // (_paprika.scss); on white the rows read as tinted stripes.
  --vc-popover-bg-color: var(--plate-bg, var(--color-additional-50));

  // One column, at most half the screen: the title and search stay put and only the list scrolls.
  &__panel {
    @apply flex max-h-[50vh] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[--vc-radius] border border-neutral-200 p-4.5 text-[--body-text-color];
  }

  &__list {
    @apply min-h-0 flex-1;
  }
}
</style>
