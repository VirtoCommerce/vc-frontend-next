import { describe, expect, it } from "vitest";
import { groupSections, useSectionGroups } from "./useSectionGroups";

describe("section groups", () => {
  it("read the sections of a group file, and nothing else", () => {
    const header = { id: "h1", type: "site-header", menu: "main" };
    expect(groupSections({ type: "header", name: "Header", content: [header, { id: 3 }, "x"] })).toEqual([header]);
    expect(groupSections({ content: "nope" })).toEqual([]);
    expect(groupSections(undefined)).toEqual([]);
  });

  it("turn a part of the layout off only when its section is there and hidden", () => {
    const { setSectionGroups, isTurnedOff } = useSectionGroups();
    setSectionGroups({ header: [], footer: [] });
    expect(isTurnedOff("header", "site-header")).toBe(false);
    setSectionGroups({ header: [{ id: "h1", type: "site-header" }] });
    expect(isTurnedOff("header", "site-header")).toBe(false);
    setSectionGroups({ header: [{ id: "h1", type: "site-header", hidden: true }] });
    expect(isTurnedOff("header", "site-header")).toBe(true);
    expect(isTurnedOff("footer", "site-footer")).toBe(false);
  });

  it("find a group's first shown section of a type", () => {
    const { setSectionGroups, findSection, allSections } = useSectionGroups();
    setSectionGroups({
      header: [
        { id: "a", type: "announcement-bar", hidden: true },
        { id: "b", type: "announcement-bar" },
      ],
      footer: [{ id: "f", type: "site-footer" }],
    });
    expect(findSection("header", "announcement-bar")?.id).toBe("b");
    expect(findSection("footer", "site-header")).toBeUndefined();
    expect(allSections().map((section) => section.id)).toEqual(["a", "b", "f"]);
  });
});
