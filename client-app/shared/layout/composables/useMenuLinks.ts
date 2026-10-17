import { ref, toValue, watch } from "vue";
import { getMenu } from "@/core/api/graphql";
import { Logger } from "@/core/utilities";
import { convertToExtendedMenuLink } from "@/core/utilities/menu";
import type { MenuLinkType } from "@/core/api/graphql/types";
import type { ExtendedMenuLinkType } from "@/core/types";
import type { MaybeRefOrGetter } from "vue";

/**
 * The store's link lists (Content › Menus) by name, loaded once each as the names come up: the menus a theme setting
 * picks (the header's menu, the footer's columns). A list that fails to load, or doesn't exist, has no links.
 */
export function useMenuLinks(names: MaybeRefOrGetter<string[]>) {
  const links = ref<Record<string, ExtendedMenuLinkType[]>>({});

  watch(
    () => toValue(names).filter(Boolean),
    async (wanted) => {
      for (const name of wanted) {
        if (name in links.value) {
          continue;
        }
        links.value[name] = [];
        try {
          links.value[name] = (await getMenu(name)).map((item) =>
            convertToExtendedMenuLink(item as MenuLinkType, false),
          );
        } catch (e) {
          Logger.error(`useMenuLinks(${name})`, e);
        }
      }
    },
    { immediate: true },
  );

  return links;
}
