import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { VcTabSwitch, VcTabSwitchGroup } from "@/ui-kit/components/molecules";
import ViewMode from "./view-mode.vue";

const CHECKED = "vc-tab-switch--checked";

function mountViewMode(mode?: string) {
  return mount(ViewMode, {
    props: { mode },
    global: {
      components: { VcTabSwitchGroup, VcTabSwitch },
      stubs: { VcIcon: true },
      mocks: { $t: (key: string) => key },
    },
  });
}

const tab = (wrapper: ReturnType<typeof mountViewMode>, testId: string) =>
  wrapper.findAllComponents(VcTabSwitch).find((item) => item.attributes("data-test-id") === testId)!;

describe("ViewMode", () => {
  it("marks the grid as chosen by default", () => {
    const wrapper = mountViewMode();

    expect(tab(wrapper, "grid-view-tab").classes()).toContain(CHECKED);
    expect(tab(wrapper, "list-view-tab").classes()).not.toContain(CHECKED);
  });

  it("marks the mode it is given as chosen", () => {
    const wrapper = mountViewMode("list");

    expect(tab(wrapper, "list-view-tab").classes()).toContain(CHECKED);
    expect(tab(wrapper, "grid-view-tab").classes()).not.toContain(CHECKED);
  });

  it("asks for the mode that is pressed", async () => {
    const wrapper = mountViewMode("grid");

    await tab(wrapper, "list-view-tab").find("button").trigger("click");

    expect(wrapper.emitted("update:mode")).toEqual([["list"]]);
  });
});
