import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import MobileMenuLink from "./mobile-menu-link.vue";
import type { ExtendedMenuLinkType } from "@/core/types";
import type { VueWrapper } from "@vue/test-utils";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

const Page = { template: "<div />" };

const isCustomerActivity = (route: RouteLocationNormalizedLoaded) =>
  route.name === "Activities" && Boolean(route.query.organizationId);

let router: Router;

async function mountLink(link: ExtendedMenuLinkType, url: string) {
  await router.push(url);
  await router.isReady();

  return mount(MobileMenuLink, {
    props: { link },
    slots: { default: link.title ?? "" },
    global: { plugins: [router], stubs: { VcIcon: true, VcBadge: true } },
  });
}

const isIconLit = (wrapper: VueWrapper) =>
  wrapper.get(".mobile-menu-link__icon").classes().includes("mobile-menu-link__icon--active");

beforeEach(() => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/company/activities", name: "Activities", component: Page },
      { path: "/company/my-customers", name: "MyCustomers", component: Page },
    ],
  });
});

describe("MobileMenuLink icon highlight", () => {
  it("lights the icon of a link its rule claims, though vue-router matches another route", async () => {
    const wrapper = await mountLink(
      { title: "My customers", icon: "users", route: { name: "MyCustomers" }, activeWhen: isCustomerActivity },
      "/company/activities?organizationId=org-1",
    );

    expect(isIconLit(wrapper)).toBe(true);
  });

  it("leaves the icon unlit when the link's rule says no, though vue-router matches it", async () => {
    const wrapper = await mountLink(
      {
        title: "My activity",
        icon: "activity",
        route: { name: "Activities" },
        activeWhen: (route) => route.name === "Activities" && !isCustomerActivity(route),
      },
      "/company/activities?organizationId=org-1",
    );

    expect(isIconLit(wrapper)).toBe(false);
  });
});
