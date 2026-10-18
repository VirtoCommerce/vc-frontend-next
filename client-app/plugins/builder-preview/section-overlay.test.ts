import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isBuilderMessage } from "./builder-preview.protocol";
import { SectionOverlay } from "./section-overlay";

let frames: FrameRequestCallback[];
const flushFrames = () => {
  // the overlay renders two frames after a change
  for (let i = 0; i < 2; i++) {
    frames.splice(0).forEach((frame) => frame(0));
  }
};

/** Scroll anchors at the given page offsets, as the preview renders them before each item */
function anchors(tops: Record<string, number>) {
  Object.entries(tops).forEach(([id, top]) => {
    const element = document.createElement("div");
    element.id = "__scroll__" + id;
    element.getBoundingClientRect = () => ({
      top,
      bottom: top,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
    document.body.appendChild(element);
  });
}

function setup() {
  const blocker = document.createElement("div");
  document.body.appendChild(blocker);
  const onSelect = vi.fn();
  const onHover = vi.fn();
  const overlay = new SectionOverlay(document.body, blocker, onSelect, onHover);
  const boxes = () => [...document.querySelectorAll<HTMLElement>("[data-section-overlay] > div")];
  return { blocker, onSelect, onHover, overlay, boxes };
}

beforeEach(() => {
  document.body.replaceChildren();
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.stubGlobal("ResizeObserver", undefined);
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("section preview overlay", () => {
  it("outlines the section under the pointer and reports it; a click selects it", () => {
    anchors({ a: 0, b: 100, "shared-components-end": 300 });
    const { blocker, onSelect, onHover, overlay, boxes } = setup();
    overlay.update(["a", "b"], { a: "Hero", b: "Text" });
    flushFrames();

    blocker.dispatchEvent(new MouseEvent("mousemove", { clientY: 150 }));
    expect(onHover).toHaveBeenLastCalledWith("b");
    const [hover] = boxes();
    expect(hover.style.display).toBe("block");
    expect(hover.style.top).toBe("100px");
    expect(hover.style.height).toBe("200px");
    expect(hover.textContent).toBe("Text");

    blocker.dispatchEvent(new MouseEvent("click", { clientY: 20 }));
    expect(onSelect).toHaveBeenCalledWith("a", expect.any(MouseEvent));
    expect(boxes()[1].textContent).toBe("Hero");

    blocker.dispatchEvent(new MouseEvent("mouseleave"));
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("ignores sections without a name and draws the designer's selection", () => {
    anchors({ a: 0, ref: 100, "shared-components-end": 200 });
    const { blocker, onSelect, overlay, boxes } = setup();
    overlay.update(["a", "ref"], { a: "Hero" });
    overlay.select("a");
    flushFrames();

    blocker.dispatchEvent(new MouseEvent("click", { clientY: 150 }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(boxes()[1].style.display).toBe("block");
    overlay.select(null);
    flushFrames();
    expect(boxes()[1].style.display).toBe("none");
  });

  it("ends a section at the next anchor on the page, not the next section of the template", () => {
    // a product page: reviews come last in the template but show in the main column, above related products
    anchors({ info: 0, reviews: 200, related: 300, "shared-components-end": 500 });
    const { overlay, boxes } = setup();
    overlay.update(["info", "related", "reviews"], { info: "Product", related: "Related", reviews: "Reviews" });
    overlay.select("reviews");
    flushFrames();

    const selected = boxes()[1];
    expect(selected.style.top).toBe("200px");
    expect(selected.style.height).toBe("100px");
    expect(selected.textContent).toBe("Reviews");

    overlay.select("related");
    flushFrames();
    expect(selected.style.top).toBe("300px");
    expect(selected.style.height).toBe("200px");
  });

  it("accepts section names on render messages, only as strings", () => {
    const message = { source: "builder", type: "changed", template: { settings: {}, content: [] } };
    expect(isBuilderMessage({ ...message, sectionLabels: { a: "Hero" } })).toBe(true);
    expect(isBuilderMessage({ ...message, sectionLabels: { a: 1 } })).toBe(false);
  });
});
