import type { IPageContent } from "../types";

/** A section of a template, and the designer preview's `scroll-to` marker before it (its outlines and scrolling) */
export type TemplateEntryType = { item: IPageContent; anchor?: IPageContent };

export interface ITemplateParts {
  /** sections above the page's main section */
  before: TemplateEntryType[];
  /** the page's main section (product info, the category's product listing, a page's content) */
  main?: TemplateEntryType;
  /** sections shown beside or inside the main one, in template order */
  column: TemplateEntryType[];
  /** sections below the main one */
  after: TemplateEntryType[];
  /** the preview's marker after the last section */
  end?: IPageContent;
}

/**
 * A template's sections around the page's main section. Without a main section, every other section is "after".
 */
export function splitTemplate(
  content: IPageContent[],
  mainType: string,
  columnTypes: ReadonlySet<string> = new Set(),
): ITemplateParts {
  const entries: TemplateEntryType[] = [];
  let anchor: IPageContent | undefined;
  for (const item of content) {
    if (item.type === "scroll-to") {
      anchor = item;
    } else {
      entries.push({ item, anchor });
      anchor = undefined;
    }
  }
  const mainIndex = entries.findIndex((entry) => entry.item.type === mainType);
  const outside = (entry: TemplateEntryType) => entry.item.type !== mainType && !columnTypes.has(entry.item.type);
  return {
    before: mainIndex > 0 ? entries.slice(0, mainIndex).filter(outside) : [],
    main: mainIndex >= 0 ? entries[mainIndex] : undefined,
    column: entries.filter((entry) => columnTypes.has(entry.item.type)),
    after: entries.slice(Math.max(mainIndex, 0)).filter(outside),
    end: anchor,
  };
}
