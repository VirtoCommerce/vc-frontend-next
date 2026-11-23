<template>
  <VcEmptyPage class="awaiting-approval" image="lock.jpg" icon="outline-security">
    <VcTypography tag="h1" class="awaiting-approval__title">
      {{ $t("pages.awaiting_approval.title") }}
    </VcTypography>

    <VcTypography class="awaiting-approval__message">
      {{ $t("pages.awaiting_approval.message") }}
    </VcTypography>

    <VcButton
      class="awaiting-approval__sign-out"
      variant="outline"
      data-test-id="awaiting-approval-sign-out-button"
      @click="signMeOut"
    >
      {{ $t("shared.layout.header.link_logout") }}
    </VcButton>
  </VcEmptyPage>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { usePageHead } from "@/core/composables";
import { useSignMeOut } from "@/shared/account";

const { t } = useI18n();
const { signMeOut } = useSignMeOut();

usePageHead({
  title: t("pages.awaiting_approval.meta.title"),
});
</script>

<style lang="scss">
.awaiting-approval {
  &__title {
    @apply order-first mb-5;

    @media (width >= theme("screens.sm")) {
      @apply pe-8;
    }

    @media (width >= theme("screens.lg")) {
      @apply pe-16;
    }
  }

  &__message {
    @media (width >= theme("screens.sm")) {
      @apply pe-8;
    }

    @media (width >= theme("screens.lg")) {
      @apply pe-16;
    }
  }

  &__sign-out {
    @apply mt-6;
  }
}
</style>
