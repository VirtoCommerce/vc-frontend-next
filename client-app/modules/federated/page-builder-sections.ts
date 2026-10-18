import { Logger } from "@/core/utilities";
import type { Component } from "vue";

// Page Builder sections and blocks contributed at runtime — by federated plugins, which cannot add
// to the build-time lists (`templateBlocks`, the builder-preview schema files). Data only: the host
// reads it twice, app-runner to register the components globally (the render loop resolves an
// item's `type` by name) and the builder preview to add the schemas to what it announces to the
// designer. Kept free of `./index` imports so the facade does not pull in the MF runtime.

/** "section": listed in the designer's Add section list. "block": placed inside a section whose schema lists it under `blocks`. */
export type PageBuilderSectionKindType = "section" | "block";

/** One field of the designer's settings panel, as the core schema files write it. */
export type PageBuilderSectionSettingType = {
  id: string;
  type: string;
  label?: string;
  tab?: string;
  [key: string]: unknown;
};

/**
 * What the designer shows for the section: its name and icon in the Add section list, its settings
 * panel. The same shape as the core files in `plugins/builder-preview/schemas/sections/*.json`, and
 * plain data: it is posted to the designer, so anything `structuredClone` refuses is rejected.
 */
export type PageBuilderSectionSchemaType = {
  name?: string;
  icon?: string;
  /** the setting the designer's section tree uses as the item's label */
  displayField?: string;
  settings?: PageBuilderSectionSettingType[];
  /** block types this section accepts */
  blocks?: string[];
  /** templates the section can be added to (e.g. "product"); none means pages */
  targetTemplates?: string[];
  /** shared setting groups from `schemas/shared` (e.g. "buttons") */
  includeShared?: string[];
  [key: string]: unknown;
};

export type PageBuilderSectionRegistrationType = {
  /**
   * `<plugin>-<name>`, lowercase kebab case (`acme-hero`). Saved in page content as the item's
   * `type`, so it is permanent: renaming it orphans every placed copy. While a plugin's `init()`
   * runs, the prefix must be that plugin's remote name.
   */
  type: string;
  /** Rendered with the item's settings bound as props (`v-bind="item"`): a `title` setting arrives as a `title` prop. */
  component: Component;
  schema: PageBuilderSectionSchemaType;
  /** Defaults to "section". */
  kind?: PageBuilderSectionKindType;
};

export type RegisteredPageBuilderSectionType = Required<Pick<PageBuilderSectionRegistrationType, "type" | "kind">> & {
  component: Component;
  schema: PageBuilderSectionSchemaType;
};

type ListenerType = (section: RegisteredPageBuilderSectionType) => void;

const TYPE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

const registered = new Map<string, RegisteredPageBuilderSectionType>();
const listeners: ListenerType[] = [];
let coreTypes: ReadonlySet<string> = new Set();
let registeringPlugin: string | undefined;

/** Host only: the types the host renders itself (`templateBlocks`, product blocks). A plugin may not take one over. */
export function setCorePageBuilderTypes(types: Iterable<string>): void {
  coreTypes = new Set(types);
}

/**
 * Host only (the federated loader): the remote whose `init()` is running, for its synchronous span,
 * or undefined. A registration made then must carry that plugin's prefix; one made from a
 * continuation cannot be attributed and only has to be namespaced.
 */
export function setRegisteringPlugin(name: string | undefined): void {
  registeringPlugin = name;
}

/** A remote name as a type prefix: "VirtoCommerce.Acme" -> "virtocommerce-acme". */
function toNamespace(remoteName: string): string {
  return remoteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function refuse(type: unknown, reason: string): false {
  const by = registeringPlugin ? ` by "${registeringPlugin}"` : "";
  Logger.error(`[MF] Page Builder type "${String(type)}"${by} refused: ${reason}`);
  return false;
}

/** Why the type cannot be taken, or undefined when it can. */
function typeRefusal(type: unknown): string | undefined {
  if (typeof type !== "string" || !TYPE_PATTERN.test(type)) {
    return `a type must be "<plugin>-<name>" in lowercase kebab case`;
  }
  const namespace = registeringPlugin ? toNamespace(registeringPlugin) : undefined;
  if (namespace && !type.startsWith(`${namespace}-`)) {
    return `a type must start with the plugin's own namespace "${namespace}-"`;
  }
  if (coreTypes.has(type)) {
    return "the host has a section or block of that type";
  }
  if (registered.has(type)) {
    return "that type is registered already";
  }
  return undefined;
}

/** Why the rest of the registration is unusable, or undefined when it is not. */
function contentRefusal({ component, schema, kind }: Partial<PageBuilderSectionRegistrationType>): string | undefined {
  if (kind !== "section" && kind !== "block") {
    return `kind must be "section" or "block"`;
  }
  if (!component || (typeof component !== "object" && typeof component !== "function")) {
    return "a component is required";
  }
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return "a schema object is required";
  }
  if (schema.settings !== undefined && !Array.isArray(schema.settings)) {
    return "schema.settings must be an array";
  }
  return undefined;
}

/**
 * Adds a section (or block) to the storefront and the Page Builder designer. Call it from the
 * plugin's `init()`: the host registers the component globally, and the builder preview waits for
 * plugins to settle before it announces its schemas. Returns false, and logs why, when refused:
 * a type that is not `<plugin>-<name>`, is the host's own, or was registered already (first wins).
 */
export function registerPageBuilderSection(registration: PageBuilderSectionRegistrationType): boolean {
  const { type, component, schema, kind = "section" } = registration ?? {};
  const reason = typeRefusal(type) ?? contentRefusal({ component, schema, kind });
  if (reason) {
    return refuse(type, reason);
  }
  let ownSchema: PageBuilderSectionSchemaType;
  try {
    // a copy: the plugin cannot change the schema after the check, and a value postMessage cannot clone fails here
    ownSchema = structuredClone(schema);
  } catch (error) {
    return refuse(type, `the schema is not plain data (${error instanceof Error ? error.message : String(error)})`);
  }

  const section: RegisteredPageBuilderSectionType = { type, kind, component, schema: { ...ownSchema, type } };
  registered.set(type, section);
  listeners.forEach((listener) => listener(section));
  return true;
}

/** In registration order. */
export function getRegisteredPageBuilderSections(): readonly RegisteredPageBuilderSectionType[] {
  return [...registered.values()];
}

/** Calls `listener` for every section registered so far, then for each one registered later (a plugin past the boot backstop). */
export function onPageBuilderSectionRegistered(listener: ListenerType): void {
  registered.forEach((section) => listener(section));
  listeners.push(listener);
}
