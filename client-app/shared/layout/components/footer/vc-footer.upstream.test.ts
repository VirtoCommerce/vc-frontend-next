import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import VcFooter from "./vc-footer.vue";
import type { ExtendedMenuLinkType } from "@/core/types";

const { chrome, whiteLabelingFooterLinks, storeFooterLinks } = await vi.hoisted(async () => {
  const vue = await import("vue");
  return {
    chrome: {
      footerColumns: vue.ref<ExtendedMenuLinkType[] | undefined>(),
      copyright: vue.ref<string | undefined>(),
      isCreditShown: vue.ref(true),
      siteFooter: vue.ref(),
    },
    whiteLabelingFooterLinks: vue.ref<ExtendedMenuLinkType[] | undefined>(),
    storeFooterLinks: vue.ref<ExtendedMenuLinkType[]>([]),
  };
});

vi.mock("@/core/composables", () => ({
  useNavigations: () => ({ footerLinks: storeFooterLinks, fetchFooterLinks: vi.fn() }),
  useWhiteLabeling: () => ({ themeLogoUrl: ref(""), footerLinks: whiteLabelingFooterLinks }),
}));

vi.mock("@/shared/layout/composables/useThemeChrome", () => ({ useThemeChrome: () => chrome }));

vi.mock("@/shared/static-content/sections", () => ({ getPreviewSectionAttrs: () => ({}) }));

vi.mock("./_internal/footer-links.vue", async () => {
  const vue = await import("vue");
  return {
    default: vue.defineComponent({
      name: "FooterLinks",
      props: { linksBlock: { type: Object, required: true } },
      setup: () => () => vue.h("div"),
    }),
  };
});

const CreditStub = { name: "Credit", template: '<span data-test-id="credit"><slot /></span>' };

const THEME_COLUMN: ExtendedMenuLinkType = { id: "theme-column", title: "Theme column" };
const WHITE_LABELING_BLOCK: ExtendedMenuLinkType = { title: "White-labeling block" };
const STORE_BLOCK: ExtendedMenuLinkType = { id: "store-block", title: "Store block" };

function mountFooter() {
  return mount(VcFooter, {
    global: {
      components: { "i18n-t": CreditStub },
      stubs: { VcImage: true },
      mocks: { $t: (key: string) => key, $context: { storeName: "Store" } },
    },
  });
}

function shownBlocks(): ExtendedMenuLinkType[] {
  return mountFooter()
    .findAllComponents({ name: "FooterLinks" })
    .map((links) => links.props("linksBlock") as ExtendedMenuLinkType);
}

enableAutoUnmount(afterEach);

beforeEach(() => {
  chrome.footerColumns.value = undefined;
  chrome.copyright.value = undefined;
  chrome.isCreditShown.value = true;
  whiteLabelingFooterLinks.value = undefined;
  storeFooterLinks.value = [STORE_BLOCK];
});

describe("VcFooter links", () => {
  it("shows the theme's footer columns before white-labeling's links and the store's menu", () => {
    chrome.footerColumns.value = [THEME_COLUMN];
    whiteLabelingFooterLinks.value = [WHITE_LABELING_BLOCK];

    expect(shownBlocks()).toEqual([THEME_COLUMN]);
  });

  it("shows white-labeling's links without theme columns", () => {
    whiteLabelingFooterLinks.value = [WHITE_LABELING_BLOCK];

    expect(shownBlocks()).toEqual([WHITE_LABELING_BLOCK]);
  });

  it("shows the store's menu without theme columns or white-labeling's links", () => {
    expect(shownBlocks()).toEqual([STORE_BLOCK]);
  });
});

describe("VcFooter copyright", () => {
  it("shows the theme's copyright in place of the default line", () => {
    chrome.copyright.value = "© Acme Ltd";

    const bottom = mountFooter().get(".app-footer__bottom");

    expect(bottom.text()).toContain("© Acme Ltd");
    expect(bottom.text()).not.toContain("shared.layout.footer.all_rights_reserved");
  });

  it("shows the default line without a theme copyright", () => {
    expect(mountFooter().get(".app-footer__bottom").text()).toContain("shared.layout.footer.all_rights_reserved");
  });
});

describe("VcFooter credit", () => {
  it("shows the platform credit by default", () => {
    expect(mountFooter().find("[data-test-id='credit']").exists()).toBe(true);
  });

  it("hides the platform credit when the theme turns it off", () => {
    chrome.isCreditShown.value = false;

    expect(mountFooter().find("[data-test-id='credit']").exists()).toBe(false);
  });
});
