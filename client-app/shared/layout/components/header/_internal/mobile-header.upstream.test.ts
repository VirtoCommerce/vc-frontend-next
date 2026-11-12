import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import MobileHeader from "./mobile-header.vue";
import HeaderBadge from "@/shared/layout/components/header-badge/header-badge.vue";

const mocks = vi.hoisted(() => ({ itemsQuantity: 0 }));

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

vi.mock("@/shared/layout/composables/useSearchBar", () => ({
  useSearchBar: () => ({ searchBarVisible: ref(false), toggleSearchBar: vi.fn() }),
}));

vi.mock("@/shared/layout/composables/useStuckPlate", () => ({ useStuckPlate: () => ({ stuck: ref(false) }) }));

const Page = { template: "<div />" };
const VcBadge = { template: "<span><slot /></span>" };

async function mountHeader(itemsQuantity: number) {
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

  return mount(MobileHeader, {
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
