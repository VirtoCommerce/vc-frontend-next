import { describe, expect, it } from "vitest";
import { splitTemplate } from "./sections";
import type { IPageContent } from "../types";

const item = (id: string, type: string) => ({ id, type }) as IPageContent;
const ids = (entries: { item: IPageContent }[]) => entries.map((entry) => entry.item.id);

describe("splitTemplate", () => {
  it("splits the sections around the main one, keeping the column's in order", () => {
    const parts = splitTemplate(
      [
        item("a", "text"),
        item("info", "product-info"),
        item("rel", "related"),
        item("rev", "product-reviews"),
        item("b", "text"),
      ],
      "product-info",
      new Set(["product-reviews"]),
    );
    expect(ids(parts.before)).toEqual(["a"]);
    expect(parts.main?.item.id).toBe("info");
    expect(ids(parts.column)).toEqual(["rev"]);
    expect(ids(parts.after)).toEqual(["rel", "b"]);
  });

  it("keeps each preview marker with the section after it, and the last one as the end", () => {
    const parts = splitTemplate(
      [
        item("__scroll__a", "scroll-to"),
        item("a", "text"),
        item("__scroll__info", "scroll-to"),
        item("info", "product-info"),
        item("__scroll__end", "scroll-to"),
      ],
      "product-info",
    );
    expect(parts.before[0].anchor?.id).toBe("__scroll__a");
    expect(parts.main?.anchor?.id).toBe("__scroll__info");
    expect(parts.end?.id).toBe("__scroll__end");
  });

  it("puts everything after when there is no main section", () => {
    const parts = splitTemplate([item("a", "text"), item("b", "text")], "product-info");
    expect(parts.main).toBeUndefined();
    expect(ids(parts.before)).toEqual([]);
    expect(ids(parts.after)).toEqual(["a", "b"]);
  });
});
