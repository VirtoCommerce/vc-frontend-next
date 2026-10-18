import { createGlobalState } from "@vueuse/core";
import { shallowRef } from "vue";
import { globals } from "@/core/globals";
import { DEFAULT_TEMPLATE_RULES, parseTemplateRules, resolveTemplate } from "./rules";
import type { ITemplateResolution, ITemplateRules, ITemplateSubject, TemplatePageType } from "./rules";
import type { IPageTemplate } from "../types";

const LOAD_TIMEOUT_MS = 2000;
/** The theme the store's content lives under; the section groups and the saved theme settings use the same one */
const THEME_NAME = "default";

const isTemplate = (value: unknown): value is IPageTemplate =>
  !!value && typeof value === "object" && Array.isArray((value as IPageTemplate).content);

/** A content page's layout: the site's header and footer, the logo only, or nothing around the page */
export type PageLayoutType = "full" | "minimal" | "blank";

export const PAGE_LAYOUTS: readonly PageLayoutType[] = ["full", "minimal", "blank"];

/** The page type a template key is for: "product.printer" → "product" */
export const templatePageType = (key: string) => key.split(".")[0] as TemplatePageType;

/**
 * The theme's templates for product, category and content pages (`templates/{key}.json`) and the rules that pick one
 * (`config/template_rules.json`), read from the platform's public content like the section groups. A page asks for
 * its template with what it knows about itself; a missing file falls back to the built-in template.
 */
export const useThemeTemplates = createGlobalState(() => {
  /** The template the page designer is editing, shown in place of the theme's on pages of its type */
  const preview = shallowRef<{ key: string; template: IPageTemplate }>();
  /** The last template picked for a page, and by which rule (the designer shows it) */
  const resolved = shallowRef<ITemplateResolution>();
  /** The layout the shown content page asks for (its own setting, else its template's), over the route's */
  const pageLayout = shallowRef<PageLayoutType>();

  let rulesRequest: Promise<ITemplateRules> | undefined;
  const templateRequests = new Map<string, Promise<IPageTemplate | undefined>>();

  async function fetchThemeFile(path: string): Promise<unknown> {
    try {
      const url = `/cms-content/Themes/${encodeURIComponent(globals.storeId ?? "")}/${THEME_NAME}/${path}`;
      const response = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
      return response.ok ? await response.json() : undefined;
    } catch {
      return undefined;
    }
  }

  /** The store's rules; without a rules file, today's choice (the B2C product property) */
  function loadTemplateRules(): Promise<ITemplateRules> {
    rulesRequest ??= fetchThemeFile("config/template_rules.json").then(
      (value) => parseTemplateRules(value) ?? DEFAULT_TEMPLATE_RULES,
    );
    return rulesRequest;
  }

  function loadTemplate(key: string): Promise<IPageTemplate | undefined> {
    let request = templateRequests.get(key);
    if (!request) {
      request = fetchThemeFile(`templates/${key}.json`).then((value) => (isTemplate(value) ? value : undefined));
      templateRequests.set(key, request);
    }
    return request;
  }

  /**
   * The template for a page: the one its explicit choice names, else the one the rules pick. Each comes from the
   * theme, else the built-in template of that key, else the theme's default for the page type, else the built-in one.
   */
  async function templateFor(
    pageType: TemplatePageType,
    subject: ITemplateSubject,
    builtIn: Partial<Record<string, IPageTemplate>>,
    explicitKey?: string,
  ): Promise<IPageTemplate | undefined> {
    const resolution: ITemplateResolution =
      explicitKey && templatePageType(explicitKey) === pageType
        ? { pageType, template: explicitKey, rule: null }
        : resolveTemplate(pageType, subject, await loadTemplateRules());
    resolved.value = resolution;
    const key = resolution.template;
    return (
      (await loadTemplate(key)) ??
      builtIn[key] ??
      (key === pageType ? undefined : await loadTemplate(pageType)) ??
      builtIn[pageType]
    );
  }

  /** The designer's template while it edits one for this page type */
  function previewFor(pageType: TemplatePageType): IPageTemplate | undefined {
    return preview.value && templatePageType(preview.value.key) === pageType ? preview.value.template : undefined;
  }

  function setPreview(key: string | undefined, template?: IPageTemplate): void {
    preview.value = key && template ? { key, template } : undefined;
  }

  return { preview, resolved, pageLayout, loadTemplateRules, templateFor, previewFor, setPreview };
});
