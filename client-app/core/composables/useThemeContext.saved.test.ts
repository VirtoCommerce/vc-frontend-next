import { describe, expect, it } from "vitest";
import { savedThemeSettings } from "./useThemeContext";

describe("savedThemeSettings", () => {
  it("reads the settings however the file keeps them", () => {
    expect(savedThemeSettings({ current: { header_menu: "main" } })).toEqual({ header_menu: "main" });
    expect(savedThemeSettings({ current: "dark", presets: { dark: { settings: { color_primary: "#000" } } } })).toEqual(
      { color_primary: "#000" },
    );
    expect(savedThemeSettings({ current: "dark", presets: { dark: { color_primary: "#111" } } })).toEqual({
      color_primary: "#111",
    });
    expect(savedThemeSettings({ current: "default", settings: { footer_copyright: "© Us" } })).toEqual({
      footer_copyright: "© Us",
    });
  });

  it("has none in anything else", () => {
    expect(savedThemeSettings(undefined)).toEqual({});
    expect(savedThemeSettings("text")).toEqual({});
    expect(savedThemeSettings({ current: "missing", presets: {} })).toEqual({});
  });
});
