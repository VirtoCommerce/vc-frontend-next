import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { VcTabSwitch, VcTabSwitchGroup } from "@/ui-kit/components/molecules";
import HeaderPreferencesMenu from "./header-preferences-menu.vue";
import VcImage from "@/ui-kit/components/atoms/image/vc-image.vue";

const en = { cultureName: "en-US", twoLetterLanguageName: "en", nativeName: "English (United States)" };
const de = { cultureName: "de-DE", twoLetterLanguageName: "de", nativeName: "Deutsch (Deutschland)" };
const pl = { cultureName: "pl-PL", twoLetterLanguageName: "pl", nativeName: "polski (Polska)" };

const { darkMode } = await vi.hoisted(async () => {
  const vue = await import("vue");
  return { darkMode: { isDarkModeAvailable: vue.ref(false), colorMode: vue.ref("light") } };
});

vi.mock("vue-router", () => ({
  useRoute: () => ({ path: "/" }),
}));

vi.mock("@/core/composables", () => ({
  useDarkMode: () => darkMode,
  useThemeContext: () => ({ themeContext: ref(undefined) }),
}));

vi.mock("@/shared/layout/composables", () => ({
  useLocaleSwitch: () => ({
    currentCurrency: ref({ code: "USD" }),
    supportedCurrencies: ref([{ code: "USD" }]),
    currentLanguage: ref(en),
    supportedLanguages: ref([en, de, pl]),
    selectCurrency: vi.fn(),
    selectLanguage: vi.fn(),
    getCountryCode: (language: { twoLetterLanguageName: string }) => language.twoLetterLanguageName,
  }),
}));

const VcPopoverStub = defineComponent({
  name: "VcPopover",
  template: `<div><slot name="trigger" :opened="true" :trigger-props="{}" /><slot name="content" /></div>`,
});

function mountMenu() {
  return mount(HeaderPreferencesMenu, {
    global: {
      components: { VcImage },
      stubs: { VcPopover: VcPopoverStub, VcIcon: true, VcTabSwitchGroup: true, VcTabSwitch: true },
      mocks: { $t: (key: string) => key },
    },
  });
}

describe("HeaderPreferencesMenu language options", () => {
  it("renders every option flag as decorative, so each option is named by its own label only", () => {
    const options = mountMenu().findAll("[data-culture-name]");

    expect(options).toHaveLength(3);

    for (const option of options) {
      const img = option.find("img.header-preferences-menu__flag");
      expect(img.exists()).toBe(true);
      expect(img.attributes("alt")).toBe("");
    }
  });

  it("names each option by its language once", () => {
    const german = mountMenu().find('[data-culture-name="de-DE"]');

    expect(german.text()).toBe("Deutsch (Deutschland)");
    expect(german.find("img").attributes("alt")).not.toContain("Deutsch");
  });
});

describe("HeaderPreferencesMenu appearance", () => {
  const CHECKED = "vc-tab-switch--checked";

  beforeEach(() => {
    darkMode.isDarkModeAvailable.value = true;
    darkMode.colorMode.value = "dark";
  });

  function mountWithSwitches() {
    return mount(HeaderPreferencesMenu, {
      global: {
        components: { VcImage, VcTabSwitchGroup, VcTabSwitch },
        stubs: { VcPopover: VcPopoverStub, VcIcon: true },
        mocks: { $t: (key: string) => key },
      },
    });
  }

  const modeTab = (wrapper: ReturnType<typeof mountWithSwitches>, mode: string) =>
    wrapper.findAllComponents(VcTabSwitch).find((item) => (item.props() as Record<string, unknown>).value === mode)!;

  it("marks the visitor's colour mode as chosen", () => {
    const wrapper = mountWithSwitches();

    expect(modeTab(wrapper, "dark").classes()).toContain(CHECKED);
    expect(modeTab(wrapper, "light").classes()).not.toContain(CHECKED);
  });

  it("saves the pressed colour mode", async () => {
    const wrapper = mountWithSwitches();

    await modeTab(wrapper, "system").find("button").trigger("click");

    expect(darkMode.colorMode.value).toBe("system");
  });
});
