import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MissionsBanner from "./missions-banner.vue";

function mountBanner(props: Record<string, unknown>, slot?: string) {
  return mount(MissionsBanner, {
    props: { color: "primary", icon: "badge-check", ...props },
    slots: slot ? { default: slot } : {},
    global: { stubs: { VcIcon: true, VcButton: true } },
  });
}

describe("MissionsBanner", () => {
  // The balance banner fills the slot with the points and still needs its "Your points balance" title.
  it("keeps the title when the slot replaces the description", () => {
    const wrapper = mountBanner({ title: "Your balance" }, '<span class="points">120</span>');

    expect(wrapper.find(".missions-banner__title").text()).toBe("Your balance");
    expect(wrapper.find(".points").exists()).toBe(true);
  });

  it("shows the description when no slot is given", () => {
    const wrapper = mountBanner({ title: "Rewards", description: "Spend your points" });

    expect(wrapper.find(".missions-banner__subtitle").text()).toBe("Spend your points");
  });

  it("takes the info accent from its color", () => {
    expect(mountBanner({ color: "info" }).classes()).toContain("missions-banner--color--info");
    expect(mountBanner({ color: "primary" }).classes()).not.toContain("missions-banner--color--info");
  });
});
