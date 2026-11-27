import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepAlive, defineComponent, h, nextTick, ref } from "vue";
import AppHeader from "./app-header.vue";

const { isCatalogMenuShown, desktopMenuMode, plateHeight, Stub } = await vi.hoisted(async () => {
  const vue = await import("vue");
  return {
    isCatalogMenuShown: vue.ref(true),
    desktopMenuMode: vue.ref<string>("fullscreen"),
    plateHeight: vue.ref(0),
    Stub: (name: string, testId: string) => ({
      default: vue.defineComponent({ name, setup: () => () => vue.h("div", { "data-test-id": testId }) }),
    }),
  };
});

vi.mock("@/core/composables", () => ({
  useNavigations: () => ({ isCatalogMenuShown }),
  useWhiteLabeling: () => ({ logoUrl: ref("") }),
  useThemeContext: () => ({
    themeContext: ref({
      get settings() {
        return { desktop_menu_mode: desktopMenuMode.value };
      },
      storeSettings: { anonymousUsersAllowed: true },
    }),
  }),
}));

vi.mock("@/shared/account", () => ({ useUser: () => ({ isAuthenticated: ref(true) }) }));

vi.mock("../announcement-bar/announcement-bar.vue", () => Stub("AnnouncementBar", "announcement-bar"));
vi.mock("../print/created.vue", () => Stub("Created", "created"));
vi.mock("./_internal/mobile-header.vue", () => Stub("MobileHeader", "mobile-header"));

vi.mock("./_internal/header-plate.vue", async () => {
  const vue = await import("vue");
  return {
    default: vue.defineComponent({
      name: "HeaderPlate",
      props: { isCatalogButtonShown: Boolean, isMegaMenuShown: Boolean },
      setup: (_, { expose }) => {
        expose({ pinnedHeight: plateHeight });
        return () => vue.h("div", { "data-test-id": "header-plate" });
      },
    }),
  };
});

const global = {
  stubs: { VcImage: true },
  mocks: { $context: { storeName: "Store" } },
};

const plate = (wrapper: ReturnType<typeof mount>) => wrapper.getComponent({ name: "HeaderPlate" });

const appHeaderHeight = () => document.documentElement.style.getPropertyValue("--vc-app-header-height");

enableAutoUnmount(afterEach);

beforeEach(() => {
  isCatalogMenuShown.value = true;
  desktopMenuMode.value = "fullscreen";
  plateHeight.value = 0;
  document.documentElement.style.removeProperty("--vc-app-header-height");
});

describe("AppHeader announcement", () => {
  it("shows the announcement bar above the desktop header", () => {
    const wrapper = mount(AppHeader, { global });

    expect(wrapper.find("[data-test-id='announcement-bar'] + .app-header").exists()).toBe(true);
  });
});

describe("AppHeader catalog menu", () => {
  it("shows the catalog button in the fullscreen menu mode", () => {
    expect(plate(mount(AppHeader, { global })).props("isCatalogButtonShown")).toBe(true);
  });

  it("hides the catalog button when the catalog menu is switched off", () => {
    isCatalogMenuShown.value = false;

    expect(plate(mount(AppHeader, { global })).props("isCatalogButtonShown")).toBe(false);
  });

  it("shows the mega menu in the horizontal menu mode", () => {
    desktopMenuMode.value = "horizontal";

    expect(plate(mount(AppHeader, { global })).props("isMegaMenuShown")).toBe(true);
  });

  it("hides the mega menu when the catalog menu is switched off", () => {
    desktopMenuMode.value = "horizontal";
    isCatalogMenuShown.value = false;

    expect(plate(mount(AppHeader, { global })).props("isMegaMenuShown")).toBe(false);
  });
});

describe("AppHeader kept alive", () => {
  const shown = ref(true);
  const Host = defineComponent({
    setup: () => () => h(KeepAlive, null, [shown.value ? h(AppHeader) : h("div", { class: "other-page" })]),
  });

  beforeEach(() => {
    shown.value = true;
  });

  it("clears --vc-app-header-height while a page without the header is shown, and restores it after", async () => {
    mount(Host, { global });
    plateHeight.value = 64;
    await nextTick();
    expect(appHeaderHeight()).toBe("64px");

    shown.value = false;
    await nextTick();

    expect(appHeaderHeight()).toBe("");

    shown.value = true;
    await nextTick();

    expect(appHeaderHeight()).toBe("64px");
  });
});
