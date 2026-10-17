import { createGlobalState } from "@vueuse/core";
import { ref } from "vue";

export type SectionGroupNameType = "header" | "footer";

/** A section of a group, as the page designer saves it: its settings, its blocks */
export type GroupSectionType = Record<string, unknown> & {
  id: string;
  type: string;
  hidden?: boolean;
  blocks?: GroupSectionType[];
};

const GROUPS: SectionGroupNameType[] = ["header", "footer"];
const LOAD_TIMEOUT_MS = 2000;

const isSection = (value: unknown): value is GroupSectionType =>
  !!value &&
  typeof value === "object" &&
  typeof (value as GroupSectionType).id === "string" &&
  typeof (value as GroupSectionType).type === "string";

/** The sections of a group file ({ type, name, content: [...] }), or none */
export function groupSections(data: unknown): GroupSectionType[] {
  const content = data && typeof data === "object" ? (data as { content?: unknown }).content : undefined;
  return Array.isArray(content) ? content.filter(isSection) : [];
}

/**
 * Shopify's section groups: the theme's header and footer sections (`sections/header-group.json`,
 * `sections/footer-group.json`), shown on every page and edited in the page designer. A theme without them keeps the
 * header and footer as they always were; a section only sets what it has (the header's menu, the footer's columns…).
 */
export const useSectionGroups = createGlobalState(() => {
  const groups = ref<Partial<Record<SectionGroupNameType, GroupSectionType[]>>>({});

  /** The store theme's groups, from the platform's public content; a missing file, or no answer in time: none */
  async function loadSectionGroups(storeId: string, themeName = "default"): Promise<void> {
    const loaded = await Promise.all(
      GROUPS.map(async (group) => {
        try {
          const url = `/cms-content/Themes/${encodeURIComponent(storeId)}/${encodeURIComponent(themeName)}/sections/${group}-group.json`;
          const response = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
          return [group, response.ok ? groupSections(await response.json()) : undefined] as const;
        } catch {
          return [group, undefined] as const;
        }
      }),
    );
    groups.value = Object.fromEntries(loaded.filter(([, sections]) => sections));
  }

  /** The designer's groups as they are being edited (its preview) */
  function setSectionGroups(next: Partial<Record<SectionGroupNameType, GroupSectionType[]>>): void {
    groups.value = { ...groups.value, ...next };
  }

  /** The group's first shown section of the type */
  function findSection(group: SectionGroupNameType, type: string): GroupSectionType | undefined {
    return groups.value[group]?.find((section) => section.type === type && !section.hidden);
  }

  /** The group has the type's section and it is hidden (the designer's eye): that part of the layout isn't shown */
  function isTurnedOff(group: SectionGroupNameType, type: string): boolean {
    const sections = groups.value[group]?.filter((section) => section.type === type) ?? [];
    return sections.length > 0 && sections.every((section) => section.hidden);
  }

  /** Every section of the groups (the preview outlines them, inline editing finds their texts) */
  function allSections(): GroupSectionType[] {
    return GROUPS.flatMap((group) => groups.value[group] ?? []);
  }

  return { groups, loadSectionGroups, setSectionGroups, findSection, isTurnedOff, allSections };
});
