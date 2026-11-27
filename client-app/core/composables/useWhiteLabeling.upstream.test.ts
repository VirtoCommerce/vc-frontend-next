import { beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeSnapshot } from "@/core/theme-snapshot/useThemeSnapshot";
import { useWhiteLabeling } from "./useWhiteLabeling";

const mocks = vi.hoisted(() => ({ isDark: { value: true } }));

vi.mock("./useDarkMode", () => ({ useDarkMode: () => ({ isDark: mocks.isDark }) }));
vi.mock("@/core/api/graphql/whiteLabeling/queries", () => ({ getGetWhiteLabelingSettings: vi.fn() }));
vi.mock("./useThemeContext", async () => {
  const { computed } = await import("vue");

  return {
    useThemeContext: () => ({
      modulesSettings: computed(() => [
        {
          moduleId: "VirtoCommerce.WhiteLabeling",
          settings: [{ name: "WhiteLabeling.WhiteLabelingEnabled", value: true }],
        },
      ]),
      themeContext: computed(() => ({ settings: { logo_image: "logo.svg", logo_inverted_image: "logo-white.svg" } })),
    }),
  };
});

describe("useWhiteLabeling themeLogoUrl", () => {
  beforeEach(() => {
    mocks.isDark.value = true;
    useWhiteLabeling().setWhiteLabelingSettings();
    useThemeSnapshot().setDraft({ brand: { logoUrl: "acme.svg", secondaryLogoUrl: "acme-white.svg" } });
  });

  it("shows the theme's logo for dark backgrounds in the dark theme", () => {
    expect(useWhiteLabeling().themeLogoUrl.value).toBe("acme-white.svg");
  });

  it("shows white-labeling's light logo in the dark theme when white-labeling has no logo for dark backgrounds", () => {
    useWhiteLabeling().setWhiteLabelingSettings({ logoUrl: "store.svg" });

    expect(useWhiteLabeling().themeLogoUrl.value).toBe("store.svg");
  });

  it("shows white-labeling's logo for dark backgrounds with white-labeling's logo", () => {
    useWhiteLabeling().setWhiteLabelingSettings({ logoUrl: "store.svg", secondaryLogoUrl: "store-white.svg" });

    expect(useWhiteLabeling().themeLogoUrl.value).toBe("store-white.svg");
  });

  it("shows the light logo in the light theme", () => {
    mocks.isDark.value = false;

    expect(useWhiteLabeling().themeLogoUrl.value).toBe("acme.svg");
  });
});
