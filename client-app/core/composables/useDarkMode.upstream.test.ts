import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { useDarkMode } from "./useDarkMode";

// useDarkMode is global state: the first test creates it, before any preset is known.
describe("useDarkMode before the preset is known", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("leaves the dark class the page's early script set until the preset is known", async () => {
    localStorage.setItem("vc-color-mode", "light");
    document.documentElement.classList.add("dark");

    useDarkMode();
    await nextTick();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("syncs the dark class once the preset is known", async () => {
    document.documentElement.classList.add("dark");

    useDarkMode().setActivePreset(true);
    await nextTick();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
