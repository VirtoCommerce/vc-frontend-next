import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import HeaderPlate from "./header-plate.vue";
import ExtensionPointList from "@/shared/common/components/extension-point-list.vue";
import ExtensionPoint from "@/shared/common/components/extension-point.vue";

const h = vi.hoisted(() => ({ isAuthenticated: true }));

vi.mock("vue-router", () => ({
  useRoute: () => ({ path: "/" }),
  useRouter: () => ({ afterEach: vi.fn(), push: vi.fn(), resolve: () => ({ href: "/catalog" }) }),
}));

vi.mock("@/core/composables", () => ({
  useNavigations: () => ({ catalogMenuItems: ref([]), desktopMainMenuItems: ref([]) }),
  useWhiteLabeling: () => ({ themeLogoUrl: ref("") }),
}));

vi.mock("@/shared/account/composables/useUser", async () => {
  const { computed } = await import("vue");
  return { useUser: () => ({ isAuthenticated: computed(() => h.isAuthenticated) }) };
});

vi.mock("@/shared/layout/composables/useStuckPlate", () => ({
  useStuckPlate: () => ({ stuck: ref(false) }),
}));

vi.mock("@/shared/common/composables/extensionRegistry/useExtensionRegistry", () => {
  const status = {
    name: "PunchoutModeLabel",
    template: `<span data-test-id="punchout-mode-label">Punchout mode</span>`,
  };
  const entries: Record<string, Record<string, { component: object }>> = {
    topHeaderStatus: { "punchout-mode-label": { component: status } },
  };
  return {
    useExtensionRegistry: () => ({
      getComponent: (category: string, name: string) => entries[category]?.[name]?.component ?? null,
      getContribution: () => undefined,
      getEntries: (category: string) => entries[category] ?? {},
      getProps: () => undefined,
      isRegistered: (category: string, name: string) => Boolean(entries[category]?.[name]),
      passesCondition: () => true,
    }),
  };
});

function mountPlate() {
  return mount(HeaderPlate, {
    global: {
      components: { ExtensionPoint, ExtensionPointList },
      mocks: { $t: (key: string) => key, $context: { settings: {}, storeName: "Store" } },
      stubs: {
        RouterLink: true,
        VcImage: true,
        VcIcon: true,
        VcButton: true,
        SearchBar: true,
        MegaMenu: true,
        CatalogMenu: true,
        HeaderPreferencesMenu: true,
        HeaderAccountMenu: { template: `<div data-test-id="account-menu" />` },
      },
    },
  });
}

describe("HeaderPlate status slot", () => {
  it("renders what modules register for the header status, beside the account menu", () => {
    const wrapper = mountPlate();
    const end = wrapper.find(".header-plate__end");

    expect(end.find("[data-test-id='punchout-mode-label']").exists()).toBe(true);
    expect(end.html().indexOf("punchout-mode-label")).toBeLessThan(end.html().indexOf("account-menu"));
  });
});
