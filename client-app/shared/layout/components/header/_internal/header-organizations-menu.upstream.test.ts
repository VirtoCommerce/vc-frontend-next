import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { VcPopover } from "@/ui-kit/components/molecules";
import HeaderOrganizationsMenu from "./header-organizations-menu.vue";
import type { VueWrapper } from "@vue/test-utils";

const { organization } = await vi.hoisted(async () => {
  const { ref } = await import("vue");
  return {
    organization: ref<{ id: string; name: string } | undefined>(),
  };
});

vi.mock("@/shared/account", () => ({
  useUser: () => ({ organization }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string, params: Record<string, string>) => `${key} ${JSON.stringify(params)}` }),
}));

vi.mock("./organization-list.vue", () => ({
  default: defineComponent({
    name: "OrganizationList",
    emits: { organizationSelected: () => true },
    template: `<button class="test-choose" type="button" @click="$emit('organizationSelected')">Org 2</button>`,
  }),
}));

enableAutoUnmount(afterEach);

const Page = defineComponent({
  components: { HeaderOrganizationsMenu },

  template: `
    <div>
      <HeaderOrganizationsMenu :item="{ id: 'organizations', title: 'Companies' }" />
      <a class="test-next" href="#">All products</a>
    </div>
  `,
});

function mountPage(): VueWrapper {
  return mount(Page, {
    attachTo: document.body,
    global: {
      components: { VcPopover },
      stubs: { VcIcon: true },
      mocks: { $t: (key: string) => key },
    },
  });
}

function trigger(wrapper: VueWrapper) {
  return wrapper.get('[data-test-id="organizations-button"]');
}

async function open(wrapper: VueWrapper): Promise<void> {
  await trigger(wrapper).trigger("click");
  await flushPromises();
  expect(trigger(wrapper).attributes("aria-expanded")).toBe("true");
}

beforeEach(() => {
  organization.value = { id: "org-1", name: "Northwind Traders" };
});

describe("HeaderOrganizationsMenu", () => {
  it("names the trigger by its caption and the current organization", () => {
    const wrapper = mountPage();

    expect(trigger(wrapper).attributes("aria-label")).toBe(
      'shared.layout.header.organization_switcher.trigger_label {"title":"Companies","name":"Northwind Traders"}',
    );
  });

  it("closes once an organization is chosen", async () => {
    const wrapper = mountPage();
    await open(wrapper);

    await wrapper.get(".test-choose").trigger("click");
    await flushPromises();

    expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
  });

  it("closes on Escape after focus has left the panel", async () => {
    const wrapper = mountPage();
    await open(wrapper);
    const next = wrapper.get<HTMLElement>(".test-next").element;
    next.focus();

    next.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await flushPromises();

    expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(next);
  });
});
