import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import BottomHeaderLink from "./bottom-header-link.vue";
import HeaderBadge from "@/shared/layout/components/header-badge/header-badge.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
    n: (value: number) => String(value),
  }),
}));

const Page = { template: "<div />" };
const VcBadge = { template: "<span><slot /></span>" };
const LINK = { title: "Compare", icon: "compare", route: { name: "Compare" } };

async function mountLink(count: number) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/compare", name: "Compare", component: Page }],
  });

  await router.push("/");
  await router.isReady();

  return mount(BottomHeaderLink, {
    props: { link: LINK, count },
    slots: { default: LINK.title },
    global: { plugins: [router], stubs: { VcIcon: true, VcBadge, transition: false } },
  });
}

describe("BottomHeaderLink count", () => {
  it("puts the full count into the link's accessible name and caps the badge at 99+", async () => {
    const wrapper = await mountLink(150);

    expect(wrapper.get("a").attributes("aria-label")).toBe(
      'shared.layout.header.link_with_count {"title":"Compare","count":"150"}',
    );

    const badge = wrapper.findComponent(HeaderBadge);
    expect(badge.text()).toBe("99+");
    expect(badge.find('[aria-hidden="true"]').exists()).toBe(true);
  });

  it("leaves the visible text as the name when there is no count", async () => {
    const wrapper = await mountLink(0);

    expect(wrapper.get("a").attributes("aria-label")).toBeUndefined();
    expect(wrapper.findComponent(HeaderBadge).text()).toBe("");
  });
});
