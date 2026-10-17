const ACCENT = "#2563eb";
/** Item keys that are never text the page shows */
const NOT_TEXT = new Set(["id", "type", "hidden", "anchor", "blocks", "componentRef"]);
/** Markup, markdown or a link: shown differently from how it is stored, so it is edited in the designer's panel */
const NOT_PLAIN = /[<>*_#`[\]]|^\s*(https?:|\/|#)/;

/** A plain-text setting of a section or block: where it is (item id, path in the item) and its value */
export interface IEditableText {
  itemId: string;
  path: (string | number)[];
  value: string;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** The plain-text settings of a section and its blocks, nested ones (objects, lists) too */
export function editableTexts(section: Record<string, unknown>): IEditableText[] {
  const found: IEditableText[] = [];
  const walk = (itemId: string, value: unknown, path: (string | number)[]) => {
    if (typeof value === "string") {
      if (normalize(value) && !NOT_PLAIN.test(value)) {
        found.push({ itemId, path, value });
      }
    } else if (Array.isArray(value)) {
      value.forEach((child, index) => walk(itemId, child, [...path, index]));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, child]) => walk(itemId, child, [...path, key]));
    }
  };
  const walkItem = (item: Record<string, unknown>) => {
    if (typeof item.id !== "string" || item.hidden) {
      return;
    }
    for (const [key, value] of Object.entries(item)) {
      if (!NOT_TEXT.has(key)) {
        walk(item.id, value, [key]);
      }
    }
  };
  walkItem(section);
  (Array.isArray(section.blocks) ? section.blocks : []).forEach((block) => walkItem(block as Record<string, unknown>));
  return found;
}

/** The innermost element from `start` up to `boundary` that shows exactly one of the texts, and that text */
export function findEditable(
  start: Element | null,
  boundary: Element,
  texts: IEditableText[],
): { element: HTMLElement; text: IEditableText } | null {
  for (let element = start; element && element !== boundary; element = element.parentElement) {
    const shown = normalize(element.textContent ?? "");
    const text = shown ? texts.find((candidate) => normalize(candidate.value) === shown) : undefined;
    if (text && element instanceof HTMLElement) {
      return { element, text };
    }
  }
  return null;
}

/**
 * Edits a section's text right on the page, as a theme editor does: a click on a text the designer has as a plain
 * setting makes that element editable (the caret where the pointer is), and every change goes to the designer as
 * that setting's new value. The page takes the pointer while editing; a press outside, Enter (single line) or Esc
 * ends it.
 */
export class InlineTextEditor {
  private editing: { element: HTMLElement; text: IEditableText; outline: string; offset: string } | null = null;

  constructor(
    private readonly interactiveBlocker: HTMLElement,
    /** the section's plain-text settings */
    private readonly textsOf: (sectionId: string) => IEditableText[],
    private readonly onEdit: (edit: IEditableText) => void,
    /** editing ended: the preview can render what it held back */
    private readonly onEnd: () => void,
  ) {}

  get isEditing(): boolean {
    return this.editing !== null;
  }

  /** A click on a section (at clientX/Y): edit the text under the pointer, if it is one of the section's settings */
  start(sectionId: string, clientX: number, clientY: number): boolean {
    this.end();
    // the page element under the blocker (the outline layers take no pointer, so they aren't hit)
    const under = document.elementsFromPoint(clientX, clientY).find((element) => element !== this.interactiveBlocker);
    const found = findEditable(under ?? null, document.body, this.textsOf(sectionId));
    if (!found) {
      return false;
    }
    const { element, text } = found;
    this.editing = { element, text, outline: element.style.outline, offset: element.style.outlineOffset };
    // plain text only (no pasted markup); a browser without it reads the value as "inherit"
    element.setAttribute("contenteditable", "plaintext-only");
    if (element.contentEditable !== "plaintext-only") {
      element.setAttribute("contenteditable", "true");
    }
    element.style.outline = `2px solid ${ACCENT}`;
    element.style.outlineOffset = "2px";
    this.interactiveBlocker.style.pointerEvents = "none";
    element.focus({ preventScroll: true });
    placeCaret(clientX, clientY);
    element.addEventListener("input", this.handleInput);
    element.addEventListener("keydown", this.handleKeydown);
    document.addEventListener("mousedown", this.handleOutsidePress, true);
    return true;
  }

  end(): void {
    if (!this.editing) {
      return;
    }
    const { element, outline, offset } = this.editing;
    this.editing = null;
    element.removeEventListener("input", this.handleInput);
    element.removeEventListener("keydown", this.handleKeydown);
    document.removeEventListener("mousedown", this.handleOutsidePress, true);
    element.removeAttribute("contenteditable");
    element.style.outline = outline;
    element.style.outlineOffset = offset;
    element.blur();
    this.interactiveBlocker.style.pointerEvents = "auto";
    this.onEnd();
  }

  private readonly handleInput = (): void => {
    if (!this.editing) {
      return;
    }
    const { element, text } = this.editing;
    // the editor writes a no-break space for a trailing space; the setting holds a plain one
    const value = (element.innerText ?? element.textContent ?? "").replace(/\u00a0/g, " ");
    this.onEdit({ ...text, value: text.value.includes("\n") ? value : value.replace(/\n/g, " ") });
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const multiline = this.editing?.text.value.includes("\n");
    if (event.key === "Escape" || (event.key === "Enter" && !event.shiftKey && !multiline)) {
      event.preventDefault();
      this.end();
    }
  };

  /** A press outside ends editing; the blocker is back before the click lands, so the page doesn't take it */
  private readonly handleOutsidePress = (event: MouseEvent): void => {
    if (this.editing && !this.editing.element.contains(event.target as Node)) {
      event.preventDefault();
      this.end();
    }
  };
}

/** The caret where the pointer is (else the browser's default: the start) */
function placeCaret(clientX: number, clientY: number) {
  const position =
    typeof document.caretPositionFromPoint === "function" ? document.caretPositionFromPoint(clientX, clientY) : null;
  const selection = window.getSelection();
  if (position && selection) {
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
