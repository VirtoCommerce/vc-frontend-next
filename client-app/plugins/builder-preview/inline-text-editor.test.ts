import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineTextEditor, editableTexts, findEditable } from "./inline-text-editor";

const section = {
  id: "cta1",
  type: "call-to-action",
  title: "Big summer sale",
  background: "bg-primary",
  image: "https://example.com/a.png",
  body: "Some **bold** words",
  buttons: [{ label: "Shop now", link: "/sale" }],
  blocks: [
    { id: "b1", type: "text", text: "A block" },
    { id: "b2", type: "text", text: "Hidden one", hidden: true },
  ],
};

describe("editableTexts", () => {
  it("lists the plain texts with where they are, nested ones and blocks too", () => {
    expect(editableTexts(section)).toEqual([
      { itemId: "cta1", path: ["title"], value: "Big summer sale" },
      { itemId: "cta1", path: ["background"], value: "bg-primary" },
      { itemId: "cta1", path: ["buttons", 0, "label"], value: "Shop now" },
      { itemId: "b1", path: ["text"], value: "A block" },
    ]);
  });
});

describe("findEditable", () => {
  it("takes the innermost element showing exactly one of the texts", () => {
    document.body.innerHTML = `<div id="s"><div id="t">Big  summer
      sale</div><a><span id="label">Shop now</span></a></div>`;
    const texts = editableTexts(section);
    const boundary = document.getElementById("s")!;
    expect(findEditable(document.getElementById("t"), boundary, texts)?.text.path).toEqual(["title"]);
    expect(findEditable(document.getElementById("label"), boundary, texts)?.element.id).toBe("label");
    expect(findEditable(boundary, boundary, texts)).toBeNull();
  });
});

describe("InlineTextEditor", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("edits the clicked text and hands each change over, then lets held renders go", () => {
    document.body.innerHTML = `<div id="t">Big summer sale</div><div id="blocker"></div>`;
    const title = document.getElementById("t")!;
    const blocker = document.getElementById("blocker")!;
    document.elementsFromPoint = vi.fn(() => [blocker, title]);
    const onEdit = vi.fn();
    const onEnd = vi.fn();
    const editor = new InlineTextEditor(blocker, () => editableTexts(section), onEdit, onEnd);

    expect(editor.start("cta1", 10, 10)).toBe(true);
    expect(editor.isEditing).toBe(true);
    expect(title.hasAttribute("contenteditable")).toBe(true);
    expect(blocker.style.pointerEvents).toBe("none");

    title.textContent = "Big winter sale\u00a0";
    title.dispatchEvent(new Event("input"));
    expect(onEdit).toHaveBeenLastCalledWith({ itemId: "cta1", path: ["title"], value: "Big winter sale " });

    title.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(editor.isEditing).toBe(false);
    expect(title.hasAttribute("contenteditable")).toBe(false);
    expect(blocker.style.pointerEvents).toBe("auto");
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("leaves a click on something that is no setting alone", () => {
    document.body.innerHTML = `<div id="x">Not a setting</div><div id="blocker"></div>`;
    const blocker = document.getElementById("blocker")!;
    document.elementsFromPoint = vi.fn(() => [blocker, document.getElementById("x")!]);
    const editor = new InlineTextEditor(blocker, () => editableTexts(section), vi.fn(), vi.fn());
    expect(editor.start("cta1", 10, 10)).toBe(false);
    expect(blocker.style.pointerEvents).toBe("");
  });
});
