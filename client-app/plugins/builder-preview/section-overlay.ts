const SCROLL_ANCHOR_PREFIX = "__scroll__";
const END_ANCHOR_ID = "shared-components-end";
const ACCENT = "#2563eb";

/**
 * Outlines the page's sections in the designer preview, like a theme editor: the section under the pointer gets a
 * thin outline and its name, the selected one a solid outline. A click selects a section. Only sections the designer
 * named (`sectionLabels`) take part, so shared-component placements keep their own overlay.
 *
 * A section spans from its scroll anchor to the next section's anchor on the page (the anchors precede every rendered
 * item). On the page, not in the template: a product page shows its column sections (description, reviews) above the
 * sections that follow the product, whatever their order in the template.
 */
/** The element a header or footer section (a section group's) marks with its id */
export function markedSection(sectionId: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>("[data-pb-section]")].find(
    (element) => element.dataset.pbSection === sectionId,
  );
}

export class SectionOverlay {
  private readonly layer: HTMLDivElement;
  private readonly hoverBox: HTMLDivElement;
  private readonly selectBox: HTMLDivElement;
  private readonly resizeObserver: ResizeObserver | undefined;
  private sectionIds: string[] = [];
  private labels: Record<string, string> = {};
  private hovered: string | null = null;
  private selected: string | null = null;
  private frame: number | undefined;
  private disposed = false;

  constructor(
    private readonly body: HTMLElement,
    private readonly interactiveBlocker: HTMLElement,
    /** a click selected a section (the click, for what the pointer is on) */
    private readonly onSelect: (sectionId: string, event: MouseEvent) => void,
    private readonly onHover: (sectionId: string | null) => void,
  ) {
    this.layer = document.createElement("div");
    this.layer.dataset.sectionOverlay = "true";
    this.layer.setAttribute("aria-hidden", "true");
    Object.assign(this.layer.style, { position: "absolute", inset: "0", zIndex: "2147483646", pointerEvents: "none" });
    this.hoverBox = this.createBox("1px dashed");
    this.selectBox = this.createBox("2px solid");
    this.layer.append(this.hoverBox, this.selectBox);
    this.body.appendChild(this.layer);

    this.interactiveBlocker.addEventListener("mousemove", this.handlePointerMove);
    this.interactiveBlocker.addEventListener("mouseleave", this.handlePointerLeave);
    this.interactiveBlocker.addEventListener("click", this.handleClick);
    window.addEventListener("resize", this.scheduleRender);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.scheduleRender);
      this.resizeObserver.observe(this.body);
    }
  }

  /** The rendered items, in order, and the names of those that can be outlined. */
  update(sectionIds: string[], labels: Record<string, string>): void {
    this.sectionIds = sectionIds;
    this.labels = labels;
    if (this.hovered && !labels[this.hovered]) {
      this.setHovered(null);
    }
    this.scheduleRender();
  }

  /** The designer's selection (null: none). */
  select(sectionId: string | null): void {
    this.selected = sectionId;
    this.scheduleRender();
  }

  /** The designer's hover (its list of sections). */
  hover(sectionId: string | null): void {
    this.hovered = sectionId;
    this.scheduleRender();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
    }
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.scheduleRender);
    this.interactiveBlocker.removeEventListener("mousemove", this.handlePointerMove);
    this.interactiveBlocker.removeEventListener("mouseleave", this.handlePointerLeave);
    this.interactiveBlocker.removeEventListener("click", this.handleClick);
    this.layer.remove();
  }

  private createBox(border: string): HTMLDivElement {
    const box = document.createElement("div");
    Object.assign(box.style, {
      position: "absolute",
      boxSizing: "border-box",
      border: `${border} ${ACCENT}`,
      display: "none",
    });
    const label = document.createElement("span");
    Object.assign(label.style, {
      position: "absolute",
      top: "0",
      left: "0",
      padding: "3px 8px",
      borderRadius: "0 0 4px 0",
      background: ACCENT,
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      fontWeight: "500",
      lineHeight: "16px",
      whiteSpace: "nowrap",
    });
    box.appendChild(label);
    return box;
  }

  /** The section's box in page coordinates; height 0 when it isn't on the page */
  private rectOf(sectionId: string): { top: number; height: number } {
    // a header or footer section (a section group's) marks its element
    const marked = markedSection(sectionId);
    if (marked) {
      const box = marked.getBoundingClientRect();
      return { top: box.top + window.scrollY, height: box.height };
    }
    const start = this.sectionIds.includes(sectionId)
      ? document.getElementById(SCROLL_ANCHOR_PREFIX + sectionId)
      : null;
    const end = start ? this.nextAnchor(start) : undefined;
    const top = start ? start.getBoundingClientRect().top + window.scrollY : 0;
    const bottom = start && end ? end.getBoundingClientRect().top + window.scrollY : top;
    return { top, height: bottom - top > 1 ? bottom - top : 0 };
  }

  /** The anchor after `start` in the document that opens one of the page's items, or the end marker */
  private nextAnchor(start: HTMLElement): HTMLElement | undefined {
    const ids = new Set([...this.sectionIds, END_ANCHOR_ID].map((id) => SCROLL_ANCHOR_PREFIX + id));
    const anchors = [...document.querySelectorAll<HTMLElement>(`[id^="${SCROLL_ANCHOR_PREFIX}"]`)];
    return anchors.slice(anchors.indexOf(start) + 1).find((anchor) => ids.has(anchor.id));
  }

  private place(box: HTMLDivElement, sectionId: string | null): void {
    const rect = sectionId && this.labels[sectionId] ? this.rectOf(sectionId) : { top: 0, height: 0 };
    if (!rect.height || !sectionId) {
      box.style.display = "none";
      return;
    }
    Object.assign(box.style, {
      display: "block",
      top: `${rect.top}px`,
      height: `${rect.height}px`,
      left: "0",
      width: `${Math.max(this.body.scrollWidth, document.documentElement.clientWidth)}px`,
    });
    (box.firstChild as HTMLElement).textContent = this.labels[sectionId];
  }

  private render(): void {
    this.place(this.selectBox, this.selected);
    this.place(this.hoverBox, this.hovered !== this.selected ? this.hovered : null);
  }

  private readonly scheduleRender = (): void => {
    if (this.disposed) {
      return;
    }
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
    }
    // two frames: the page renders the new content first
    this.frame = requestAnimationFrame(() => {
      this.frame = requestAnimationFrame(() => {
        this.frame = undefined;
        this.render();
      });
    });
  };

  private sectionAt(clientY: number): string | null {
    const y = clientY + window.scrollY;
    for (const id of this.sectionIds) {
      if (!this.labels[id]) {
        continue;
      }
      const rect = this.rectOf(id);
      if (rect.height && y >= rect.top && y < rect.top + rect.height) {
        return id;
      }
    }
    return null;
  }

  private setHovered(sectionId: string | null): void {
    if (sectionId === this.hovered) {
      return;
    }
    this.hovered = sectionId;
    this.render();
    this.onHover(sectionId);
  }

  private readonly handlePointerMove = (event: MouseEvent): void => this.setHovered(this.sectionAt(event.clientY));
  private readonly handlePointerLeave = (): void => this.setHovered(null);
  private readonly handleClick = (event: MouseEvent): void => {
    const id = this.sectionAt(event.clientY);
    if (id) {
      this.selected = id;
      this.render();
      this.onSelect(id, event);
    }
  };
}
