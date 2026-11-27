import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import HeaderPlate from "./header-plate.vue";
import type { ExtendedMenuLinkType } from "@/core/types";
import ExtensionPointList from "@/shared/common/components/extension-point-list.vue";
import ExtensionPoint from "@/shared/common/components/extension-point.vue";
import LinkDefault from "@/shared/layout/components/header/_internal/link-components/link-default.vue";

type EntryType = { component?: object; use?: () => Record<string, unknown> };

type HoistedType = {
  isAuthenticated: boolean;
  isMultiOrganization: boolean;
  entries: Record<string, Record<string, EntryType>>;
  menuItems: { value: ExtendedMenuLinkType[] };
  iconsMenuLinks: { value: ExtendedMenuLinkType[] | undefined };
};

const h = vi.hoisted((): HoistedType => ({
  isAuthenticated: true,
  isMultiOrganization: false,
  entries: {},
  menuItems: { value: [] },
  iconsMenuLinks: { value: undefined },
}));

const STATUS_ENTRIES: Record<string, Record<string, EntryType>> = {
  topHeaderStatus: {
    "punchout-mode-label": {
      component: {
        name: "PunchoutModeLabel",
        template: `<span data-test-id="punchout-mode-label">Punchout mode</span>`,
      },
    },
  },
};

const BUILT_IN_CART: ExtendedMenuLinkType = {
  id: "cart",
  route: { name: "Cart" },
  title: "Cart",
  icon: "cart-2",
  dataTestId: "desktop-main-menu-cart-link",
};

const MY_LIST: ExtendedMenuLinkType = { id: "my-list", title: "My list", route: { name: "MyList" } };

const ORGANIZATIONS: ExtendedMenuLinkType = { id: "organizations", title: "Organizations", icon: "case" };

vi.mock("@/core/composables", () => ({
  useNavigations: () => ({ catalogMenuItems: ref([]), desktopMainMenuItems: h.menuItems }),
  useWhiteLabeling: () => ({ themeLogoUrl: ref("") }),
}));

vi.mock("@/shared/account/composables/useUser", async () => {
  const { computed: vueComputed } = await import("vue");
  return {
    useUser: () => ({
      isAuthenticated: vueComputed(() => h.isAuthenticated),
      isMultiOrganization: vueComputed(() => h.isMultiOrganization),
    }),
  };
});

vi.mock("@/shared/layout/composables/useStuckPlate", () => ({
  useStuckPlate: () => ({ stuck: ref(false) }),
}));

vi.mock("@/shared/layout/composables/useThemeChrome", () => ({
  useThemeChrome: () => ({ logoWidth: ref(), logoStyle: ref(), iconsMenuLinks: h.iconsMenuLinks, siteHeader: ref() }),
}));

vi.mock("@/shared/static-content/sections", () => ({ getPreviewSectionAttrs: () => ({}) }));

vi.mock("@/shared/common/composables/extensionRegistry/useExtensionRegistry", () => ({
  useExtensionRegistry: () => ({
    getComponent: (category: string, name: string) => h.entries[category]?.[name]?.component ?? null,
    getContribution: (category: string, name: string) => h.entries[category]?.[name]?.use,
    getEntries: (category: string) => h.entries[category] ?? {},
    getProps: () => undefined,
    isRegistered: (category: string, name: string) => Boolean(h.entries[category]?.[name]?.component),
    passesCondition: () => true,
  }),
}));

// A link with a count names itself through useI18n (useHeaderCountLabel), which needs no installed plugin here.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: { title: string; count: string }) => (params ? `${params.title}: ${params.count}` : key),
    n: (value: number) => String(value),
  }),
}));

const VcBadgeStub = { name: "VcBadge", template: "<span><slot /></span>" };

function mountPlate() {
  const page = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: page },
      { path: "/catalog", name: "Catalog", component: page },
      { path: "/my-list", name: "MyList", component: page },
      { path: "/cart", name: "Cart", component: page },
      { path: "/:pathMatch(.*)*", component: page },
    ],
  });

  return mount(HeaderPlate, {
    global: {
      plugins: [router],
      components: { ExtensionPoint, ExtensionPointList },
      mocks: {
        $t: (key: string) => key,
        $n: (value: number) => String(value),
        $context: { settings: {}, storeName: "Store" },
      },
      stubs: {
        VcBadge: VcBadgeStub,
        VcImage: true,
        VcIcon: true,
        VcButton: true,
        SearchBar: true,
        MegaMenu: true,
        CatalogMenu: true,
        HeaderPreferencesMenu: true,
        HeaderAccountMenu: { template: `<div data-test-id="account-menu" />` },
        HeaderOrganizationsMenu: { props: ["item"], template: `<div data-test-id="organizations-menu" />` },
      },
    },
  });
}

function shownItems(): ExtendedMenuLinkType[] {
  return mountPlate()
    .findAllComponents(LinkDefault)
    .map((link) => link.props("item") as ExtendedMenuLinkType);
}

beforeEach(() => {
  h.isAuthenticated = true;
  h.isMultiOrganization = false;
  h.entries = STATUS_ENTRIES;
  h.menuItems.value = [];
  h.iconsMenuLinks.value = undefined;
});

describe("HeaderPlate status slot", () => {
  it("renders what modules register for the header status, beside the account menu", () => {
    const wrapper = mountPlate();
    const end = wrapper.find(".header-plate__end");

    expect(end.find("[data-test-id='punchout-mode-label']").exists()).toBe(true);
    expect(end.html().indexOf("punchout-mode-label")).toBeLessThan(end.html().indexOf("account-menu"));
  });
});

describe("HeaderPlate links", () => {
  beforeEach(() => {
    h.menuItems.value = [MY_LIST];
  });

  it("shows the count a headerMenu entry contributes as a badge on the host's link", () => {
    h.entries = { headerMenu: { "my-list": { use: () => ({ count: 4 }) } } };

    const wrapper = mountPlate();

    expect(wrapper.getComponent(VcBadgeStub).text()).toBe("4");
    // The badge is hidden from assistive technology, so the count also goes into the link's name.
    expect(wrapper.get('a[aria-label="My list: 4"]').text()).toContain("My list");
  });

  it("repaints the badge when the contributed count changes", async () => {
    const count = ref(0);
    h.entries = { headerMenu: { "my-list": { use: () => ({ count: computed(() => count.value) }) } } };

    const wrapper = mountPlate();
    expect(wrapper.findComponent(VcBadgeStub).exists()).toBe(false);

    count.value = 2;
    await nextTick();

    expect(wrapper.getComponent(VcBadgeStub).text()).toBe("2");
  });

  it("draws the link without a badge when nothing is contributed", () => {
    h.entries = {};

    const wrapper = mountPlate();

    expect(wrapper.text()).toContain("My list");
    expect(wrapper.findComponent(VcBadgeStub).exists()).toBe(false);
  });
});

describe("HeaderPlate icons menu", () => {
  beforeEach(() => {
    h.entries = {};
    h.menuItems.value = [BUILT_IN_CART];
  });

  it("shows the built-in links without a theme menu", () => {
    expect(shownItems()).toEqual([BUILT_IN_CART]);
  });

  it("shows the theme link's title on a link to a built-in page, with that page's icon and count", () => {
    h.iconsMenuLinks.value = [{ title: "Basket", route: "/cart" }];

    expect(shownItems()).toEqual([{ ...BUILT_IN_CART, title: "Basket" }]);
  });

  it("shows a theme link to another page as the theme has it", () => {
    h.iconsMenuLinks.value = [{ title: "Help", route: "/help" }];

    expect(shownItems()).toEqual([{ id: "/help", title: "Help", route: "/help" }]);
  });
});

describe("HeaderPlate organizations", () => {
  beforeEach(() => {
    h.entries = {};
    h.menuItems.value = [BUILT_IN_CART, ORGANIZATIONS];
  });

  it("opens the organizations from the pod at the account end, not from a link of the row", () => {
    h.isMultiOrganization = true;

    const wrapper = mountPlate();

    expect(wrapper.find(".header-plate__end [data-test-id='organizations-menu']").exists()).toBe(true);
    expect(shownItems()).toEqual([BUILT_IN_CART]);
  });

  it("renders nothing for a member of one organization", () => {
    const wrapper = mountPlate();

    expect(wrapper.find("[data-test-id='organizations-menu']").exists()).toBe(false);
    expect(shownItems()).toEqual([BUILT_IN_CART]);
  });

  it("renders nothing when the store's menu has no organizations item", () => {
    h.isMultiOrganization = true;
    h.menuItems.value = [BUILT_IN_CART];

    expect(mountPlate().find("[data-test-id='organizations-menu']").exists()).toBe(false);
  });
});
