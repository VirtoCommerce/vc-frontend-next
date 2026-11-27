import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepAlive, defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import MobileHeader from "./mobile-header.vue";
import HeaderBadge from "@/shared/layout/components/header-badge/header-badge.vue";

const mocks = vi.hoisted(() => ({ itemsQuantity: 0, toggleSearchBar: vi.fn() }));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
    n: (value: number) => String(value),
  }),
}));

vi.mock("@/core/composables", () => ({ useWhiteLabeling: () => ({ themeLogoUrl: ref("") }) }));

vi.mock("@/shared/cart", () => ({ useShortCart: () => ({ cart: ref({ itemsQuantity: mocks.itemsQuantity }) }) }));

vi.mock("@/shared/layout", () => ({
  useNestedMobileHeader: () => ({ customSlots: ref({}), isAnimated: ref(false) }),
}));

const searchBarVisible = ref(false);

vi.mock("@/shared/layout/composables/useSearchBar", () => ({
  useSearchBar: () => ({ searchBarVisible, toggleSearchBar: mocks.toggleSearchBar }),
}));

vi.mock("@/shared/layout/composables/useStuckPlate", () => ({ useStuckPlate: () => ({ stuck: ref(false) }) }));

vi.mock("@/shared/layout/composables/useThemeChrome", () => ({
  useThemeChrome: () => ({ logoWidth: ref(), logoStyle: ref(), siteHeader: ref() }),
}));

vi.mock("@/shared/static-content/sections", () => ({ getPreviewSectionAttrs: () => ({}) }));

vi.mock("../../announcement-bar/announcement-bar.vue", () => ({
  default: { template: '<div data-test-id="announcement-bar" />' },
}));

enableAutoUnmount(afterEach);

const Page = { template: "<div />" };
const VcBadge = { template: "<span><slot /></span>" };

async function mountHeader(itemsQuantity: number, root: object = MobileHeader) {
  mocks.itemsQuantity = itemsQuantity;

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "Home", component: Page },
      { path: "/cart", name: "Cart", component: Page },
    ],
  });

  await router.push("/");
  await router.isReady();

  return mount(root, {
    global: {
      plugins: [router],
      mocks: { $t: (key: string) => key, $context: { settings: {}, storeName: "Store" } },
      stubs: {
        VcIcon: true,
        VcImage: true,
        VcBadge,
        ExtensionPointList: true,
        MobileMenu: true,
        MobileSearchBar: true,
        transition: false,
      },
    },
  });
}

const cartLink = (wrapper: Awaited<ReturnType<typeof mountHeader>>) => wrapper.get('a[href="/cart"]');

describe("MobileHeader cart count", () => {
  beforeEach(() => {
    mocks.itemsQuantity = 0;
  });

  it("names the cart link with the full count and caps the badge at 99+", async () => {
    const wrapper = await mountHeader(1543);

    expect(cartLink(wrapper).attributes("aria-label")).toBe(
      'shared.layout.header.link_with_count {"title":"common.links.cart","count":"1543"}',
    );
    expect(cartLink(wrapper).findComponent(HeaderBadge).text()).toBe("99+");
  });

  it("names the cart link without a count when the cart is empty", async () => {
    const wrapper = await mountHeader(0);

    expect(cartLink(wrapper).attributes("aria-label")).toBe("common.links.cart");
    expect(cartLink(wrapper).findComponent(HeaderBadge).text()).toBe("");
  });
});

describe("MobileHeader announcement", () => {
  it("shows the announcement bar above the header", async () => {
    const wrapper = await mountHeader(0);

    expect(wrapper.find("[data-test-id='announcement-bar'] + header.mobile-header").exists()).toBe(true);
  });
});

describe("MobileHeader kept alive", () => {
  const shown = ref(true);
  const Host = defineComponent({
    setup: () => () => h(KeepAlive, null, [shown.value ? h(MobileHeader) : h("div", { class: "other-page" })]),
  });

  beforeEach(() => {
    shown.value = true;
    searchBarVisible.value = false;
    mocks.toggleSearchBar.mockReset();
  });

  it("closes the menu when a page without the header takes over", async () => {
    const wrapper = await mountHeader(0, Host);
    await wrapper.get('button[aria-label="common.labels.main_menu"]').trigger("click");
    expect(wrapper.find("mobile-menu-stub").exists()).toBe(true);

    shown.value = false;
    await nextTick();
    shown.value = true;
    await nextTick();

    expect(wrapper.find("mobile-menu-stub").exists()).toBe(false);
  });

  it("closes an open search bar when a page without the header takes over", async () => {
    await mountHeader(0, Host);
    searchBarVisible.value = true;

    shown.value = false;
    await nextTick();

    expect(mocks.toggleSearchBar).toHaveBeenCalledOnce();
  });

  it("leaves a closed search bar closed", async () => {
    await mountHeader(0, Host);

    shown.value = false;
    await nextTick();

    expect(mocks.toggleSearchBar).not.toHaveBeenCalled();
  });
});
