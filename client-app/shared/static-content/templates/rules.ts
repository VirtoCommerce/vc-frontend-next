/** The kinds of pages a theme template is chosen for */
export type TemplatePageType = "product" | "category" | "page";

/** One rule: the template it picks, and when (every given condition must hold; none given: always) */
export interface ITemplateRule {
  template: string;
  when?: Record<string, unknown>;
  disabled?: boolean;
}

/**
 * The store's template rules (`config/template_rules.json` in the theme), an ordered list per page type: the first rule
 * that matches picks the template, else the type's default (`product`, `category`, `page`).
 */
export interface ITemplateRules {
  version?: number;
  product?: ITemplateRule[];
  category?: ITemplateRule[];
  page?: ITemplateRule[];
}

/** What a rule is checked against: data the storefront already has for the page */
export interface ITemplateSubject {
  /** catalog outlines ("catalogId/categoryId/…"), for `inCategory` */
  outlines?: string[];
  /** the category itself, for `inCategory` on a category page */
  id?: string;
  productType?: string;
  properties?: { name?: string | null; value?: unknown }[];
  /** the page's permalink */
  path?: string;
  language?: string;
  /** "designer" (a Page Builder page), "file" (a .page file) or "blog" */
  source?: string;
  /** the page's own settings */
  settings?: Record<string, unknown>;
}

export interface ITemplateResolution {
  pageType: TemplatePageType;
  template: string;
  /** the index of the rule that picked it, or null for the default */
  rule: number | null;
}

/**
 * Without a rules file a theme keeps today's choice: the `VirtoFrontend_UI_Layout` product property set to B2C picks
 * the B2C product template.
 */
export const DEFAULT_TEMPLATE_RULES: ITemplateRules = {
  version: 1,
  product: [{ template: "product.b2c", when: { property: { name: "VirtoFrontend_UI_Layout", equals: "B2C" } } }],
};

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim().toLowerCase());

/** `equals` against a value or any item of a list value; strings compare case-insensitively */
function matchesValue(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) => matchesValue(item, expected));
  }
  if (typeof expected === "string" || typeof actual === "string") {
    return text(actual) === text(expected);
  }
  return actual === expected;
}

/** A permalink glob: `*` matches any run of characters (so `/landing/*` matches every page under /landing/) */
function matchesPath(path: string | undefined, glob: string): boolean {
  if (!path) {
    return false;
  }
  const pattern = glob
    .trim()
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  // one leading slash, none trailing or doubled
  const normalize = (value: string) => `/${value.split("/").filter(Boolean).join("/")}`;
  return new RegExp(`^${normalize(pattern)}$`, "i").test(normalize(path));
}

type ConditionCheckType = (expected: unknown, subject: ITemplateSubject) => boolean;

const asNamedValue = (value: unknown) =>
  value && typeof value === "object" && typeof (value as { name?: unknown }).name === "string"
    ? (value as { name: string; equals?: unknown })
    : undefined;

const CONDITIONS: Record<string, ConditionCheckType> = {
  // the page's category, or a category above it in the catalog
  inCategory: (expected, subject) => {
    const ids = (Array.isArray(expected) ? expected : [expected]).map(text).filter(Boolean);
    const segments = new Set(
      [subject.id, ...(subject.outlines ?? []).flatMap((outline) => outline.split("/"))].map(text).filter(Boolean),
    );
    return ids.some((id) => segments.has(id));
  },
  productType: (expected, subject) => text(subject.productType) === text(expected),
  property: (expected, subject) => {
    const condition = asNamedValue(expected);
    return (
      !!condition &&
      (subject.properties ?? []).some(
        (property) => text(property.name) === text(condition.name) && matchesValue(property.value, condition.equals),
      )
    );
  },
  path: (expected, subject) => typeof expected === "string" && matchesPath(subject.path, expected),
  // a language or its region-less form: "de" matches "de-DE"
  language: (expected, subject) => {
    const language = text(subject.language);
    const wanted = text(expected);
    return !!wanted && (language === wanted || language.split("-")[0] === wanted);
  },
  source: (expected, subject) => text(subject.source) === text(expected),
  setting: (expected, subject) => {
    const condition = asNamedValue(expected);
    return !!condition && matchesValue(subject.settings?.[condition.name], condition.equals);
  },
};

/** Whether every condition of the rule holds. A condition this storefront doesn't know never holds. */
export function ruleMatches(rule: ITemplateRule, subject: ITemplateSubject): boolean {
  return Object.entries(rule.when ?? {}).every(([name, expected]) => CONDITIONS[name]?.(expected, subject) ?? false);
}

/** The template for a page: the first enabled rule of its type that matches, else the type's default */
export function resolveTemplate(
  pageType: TemplatePageType,
  subject: ITemplateSubject,
  rules: ITemplateRules | undefined,
): ITemplateResolution {
  const list = rules?.[pageType];
  const index = Array.isArray(list)
    ? list.findIndex(
        (rule) =>
          !!rule &&
          !rule.disabled &&
          typeof rule.template === "string" &&
          !!rule.template.trim() &&
          ruleMatches(rule, subject),
      )
    : -1;
  return index >= 0 && list
    ? { pageType, template: list[index].template.trim(), rule: index }
    : { pageType, template: pageType, rule: null };
}

/** A rules file read from the theme, or undefined when it isn't one */
export function parseTemplateRules(value: unknown): ITemplateRules | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const rules = value as Record<string, unknown>;
  const list = (key: TemplatePageType) =>
    Array.isArray(rules[key])
      ? (rules[key] as unknown[]).filter((rule): rule is ITemplateRule => !!rule && typeof rule === "object")
      : undefined;
  return {
    version: typeof rules.version === "number" ? rules.version : undefined,
    product: list("product"),
    category: list("category"),
    page: list("page"),
  };
}
