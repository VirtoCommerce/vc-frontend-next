import { Logger } from "@/core/utilities";
import { whenFederatedModulesSettled } from "@/modules/federated/bootstrap";
import { getRegisteredPageBuilderSections } from "@/modules/federated/page-builder-sections";
import { BUILT_IN_TEMPLATES } from "@/shared/static-content/templates/built-in";
import { PageBuilderComponents } from "./page-builder-components";
import type { PageBuilderDescriptorType } from "./models/PageBuilderComponentType";
import type { PageBuilderSchemasStructureType, PageBuilderSchemaType } from "./models/PageBuilderSchemaType";
import type { Component } from "vue";

type PageBuilderJsonModulesType = Record<string, () => Promise<{ default: PageBuilderDescriptorType }>>;

const blocks = import.meta.glob("./schemas/blocks/*.json") as PageBuilderJsonModulesType;
const sections = import.meta.glob("./schemas/sections/*.json") as PageBuilderJsonModulesType;
const shared = import.meta.glob("./schemas/shared/*.json") as PageBuilderJsonModulesType;
const objects = import.meta.glob("./schemas/objects/*.json") as PageBuilderJsonModulesType;
const templates = import.meta.glob("./schemas/templates/*.json") as PageBuilderJsonModulesType;
const settingsSchema = import.meta.glob("./schemas/settings_schema.json") as PageBuilderJsonModulesType;

type SchemaKeysType = keyof PageBuilderSchemaType;

async function loadAllJsonFiles(): Promise<PageBuilderSchemaType> {
  const allModules: PageBuilderSchemasStructureType<PageBuilderJsonModulesType> = {
    blocks,
    sections,
    shared,
    objects,
    templates,
    settingsSchema,
  };

  const result: PageBuilderSchemaType = {
    blocks: {},
    sections: {},
    shared: {},
    objects: {},
    templates: {},
    settingsSchema: {},
  };

  for (const jsonModulesName of Object.keys(allModules) as SchemaKeysType[]) {
    const jsonModules = allModules[jsonModulesName];
    for (const path in jsonModules) {
      const module = await jsonModules[path]();
      const name = path.split("/").pop()?.split(".")[0];
      if (name) {
        if (!name.startsWith("__")) {
          result[jsonModulesName][name] = module.default;
        }
      } else {
        Logger.warn(`Could not load ${jsonModulesName} file: ${path}`);
      }
    }
  }

  return result;
}

async function loadFile(componentName: string): Promise<PageBuilderDescriptorType> {
  const module = (await import(`./schemas/sections/${componentName}.json`)) as {
    default: PageBuilderDescriptorType;
  };

  return module.default;
}

/**
 * Sections and blocks federated plugins registered, after the core ones. One whose type a core schema
 * already has is left out, so a plugin cannot change how the designer edits a core item.
 */
function addPluginSections(allSettings: PageBuilderSchemaType): void {
  for (const { type, kind, schema } of getRegisteredPageBuilderSections()) {
    if (allSettings.sections[type] || allSettings.blocks[type]) {
      Logger.error(`[MF] Page Builder type "${type}" left out of the designer: a core schema has that type`);
      continue;
    }
    const target = kind === "block" ? allSettings.blocks : allSettings.sections;
    target[type] = schema as unknown as PageBuilderDescriptorType;
  }
}

/** The built-in template each template descriptor starts from: product, category and page templates */
const DESCRIPTOR_BUILT_IN: Readonly<Record<string, string>> = {
  product: "product",
  category: "category",
  "page-template": "page",
};

/**
 * The page designer starts a template the theme doesn't have yet from what the storefront shows without one: it reads
 * the built-in document as the template descriptor's `default`.
 */
function addBuiltInTemplates(allSettings: PageBuilderSchemaType): void {
  for (const [descriptor, key] of Object.entries(DESCRIPTOR_BUILT_IN)) {
    const entry = allSettings.templates[descriptor] as unknown as Record<string, unknown> | undefined;
    if (entry && BUILT_IN_TEMPLATES[key]) {
      entry.default = BUILT_IN_TEMPLATES[key];
    }
  }
}

export async function getRegisteredComponents(): Promise<PageBuilderSchemaType> {
  // plugins register their sections while they load, so the designer is told once they have settled
  const [allSettings] = await Promise.all([loadAllJsonFiles(), whenFederatedModulesSettled()]);
  const sectionsList = (await Promise.all(
    PageBuilderComponents.map(async (x) => {
      if (typeof x === "string") {
        // load settings by name
        const result = await loadFile(x);
        result.type = x;
        return result;
      } else if (Array.isArray(x) && x.length === 2 && typeof x[1] === "string" && typeof x[0] === "object") {
        // load settings by name and set type as component name
        const [, filename] = x as [Component, string];
        const result = await loadFile(filename);
        result.type = filename;
        return result;
      } else if (typeof x === "object" && "__name" in x) {
        // load settings by component name
        const result = await loadFile(x.__name!);
        result.type = x.__name!;
        return result;
      } else if (typeof x === "object") {
        // just set type as component name and return result
        const descriptor = x as PageBuilderDescriptorType;
        if ("component" in descriptor) {
          const { component, ...rest } = descriptor;
          const componentName = (component as { __name: string }).__name;
          return {
            ...rest,
            name: rest.name ?? componentName,
            type: rest.type ?? componentName,
          };
        }
        return x;
      }
      return null;
    }),
  )) as PageBuilderDescriptorType[];

  for (const section of sectionsList) {
    allSettings.sections[section.type] = {
      ...allSettings.sections[section.type],
      ...section,
    };
  }

  addPluginSections(allSettings);
  addBuiltInTemplates(allSettings);

  return allSettings;
}
