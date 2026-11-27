import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import OrdersTable from "./orders-table.vue";

vi.mock("../order-card.vue", () => ({ default: { name: "OrderCard", template: "<div />" } }));
vi.mock("../order-status.vue", () => ({ default: { name: "OrderStatus", template: "<span />" } }));

const VcTableColumnStub = {
  name: "VcTableColumn",
  props: { id: { type: String, required: true }, rowHeader: Boolean },
  template: "<div />",
};

function mountTable() {
  return mount(OrdersTable, {
    props: { loading: false, orders: [], pages: 1, page: 1, orderScope: "private" },
    global: {
      stubs: { VcTable: { template: "<div><slot /></div>" }, VcTableColumn: VcTableColumnStub },
      mocks: { $t: (key: string) => key, $d: (value: string) => value },
    },
  });
}

describe("OrdersTable columns", () => {
  it("marks the order number, and only it, as the row's header", () => {
    const headers = mountTable()
      .findAllComponents(VcTableColumnStub)
      .filter((column) => column.props("rowHeader"))
      .map((column) => column.props("id") as string);

    expect(headers).toEqual(["number"]);
  });
});
