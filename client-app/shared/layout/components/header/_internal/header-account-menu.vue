<template>
  <Teleport to="body">
    <VcLoaderOverlay v-if="reverting" fixed-spinner data-test-id="back-to-operator-loader">
      {{ $t("shared.layout.header.top_header.switching_back") }}
    </VcLoaderOverlay>
  </Teleport>

  <VcPopover
    class="header-account-menu"
    placement="bottom-end"
    :offset-options="10"
    role="dialog"
    :aria-label="$t('shared.layout.header.top_header.account_menu_label')"
    bg-color="--color-additional-50"
    lazy
    shadow
  >
    <template #trigger="{ opened, triggerProps }">
      <HeaderPod
        :opened="opened"
        :aria-label="$t('shared.layout.header.top_header.account_menu_label')"
        data-test-id="account-button"
        v-bind="triggerProps"
      >
        <span class="header-account-menu__initials">{{ initials }}</span>
      </HeaderPod>
    </template>

    <template #content="{ close }">
      <HeaderAccountMenuPanel
        :display-name="displayName"
        :initials="initials"
        @navigate="close"
        @sign-out="signMeOut"
        @back-to-operator="onBackToOperator(close)"
      />
    </template>
  </VcPopover>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useImpersonate, useSignMeOut, useUser } from "@/shared/account";
import HeaderAccountMenuPanel from "./header-account-menu-panel.vue";
import HeaderPod from "./header-pod.vue";

const { user } = useUser();
const { signMeOut } = useSignMeOut();
const { reverting, backToOperator } = useImpersonate();

const displayName = computed(() => user.value.contact?.fullName || user.value.userName);

const initials = computed(() =>
  displayName.value
    .replace(/(\p{L})\p{L}*/gu, "$1")
    .replace(/\P{L}/gu, "")
    .slice(0, 2)
    .toUpperCase(),
);

async function onBackToOperator(close: () => void): Promise<void> {
  close();
  await backToOperator();
}
</script>

<style lang="scss">
.header-account-menu {
  // Unset in light, so the kit's shadow stays; dark swaps in the header's (header-plate).
  --vc-popover-shadow: var(--header-menu-shadow);

  // The header's smallest step, the same 12.5 the locale pill takes, so the pod and the pill sit
  // as a pair rather than as a pill beside a button.
  &__initials {
    @apply font-geologica font-bold tracking-[0.02em];

    font-size: 0.78125rem;
  }
}
</style>
