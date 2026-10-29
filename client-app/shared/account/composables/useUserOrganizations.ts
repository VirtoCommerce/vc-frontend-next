import { createGlobalState } from "@vueuse/core";
import { computed, ref, readonly } from "vue";
import { getOrganizations } from "@/core/api/graphql/account";
import { Logger, escapeFilterSyntaxValue } from "@/core/utilities";
import { ContactStatus } from "@/shared/company/types";
import type { OrganizationFieldsType } from "@/core/api/graphql/account";

const ORGANIZATIONS_PER_PAGE = 30;
const SEARCH_THRESHOLD = 10;

function _useUserOrganizations() {
  const organizations = ref<OrganizationFieldsType[]>([]);
  const loading = ref(false);
  const hasNextPage = ref(true);
  const endCursor = ref<string | undefined>(undefined);
  const totalCount = ref(0);
  const totalOrganizations = ref(0);
  const initialized = ref(false);
  const searchPhrase = ref("");

  const pagesCount = computed(() => Math.ceil(totalCount.value / ORGANIZATIONS_PER_PAGE));
  const currentPage = computed(() => Math.ceil(organizations.value.length / ORGANIZATIONS_PER_PAGE));
  const isShowSearch = computed(() => totalOrganizations.value > SEARCH_THRESHOLD);

  // Note: At this moment, Contact/Member query supports filters inside and it breaks encoding.
  // We need to apply this workaround by quoting the phrase as a filter-syntax string literal.
  const formattedSearchPhrase = computed(() =>
    searchPhrase.value ? `"${escapeFilterSyntaxValue(searchPhrase.value)}"` : "",
  );

  // Bumped by every search/reset: a page that lands after a newer search must not append to its list.
  let requestId = 0;

  async function fetchPage(): Promise<void> {
    const id = ++requestId;
    loading.value = true;

    try {
      const result = await getOrganizations({
        after: endCursor.value,
        first: ORGANIZATIONS_PER_PAGE,
        sort: "name:asc",
        searchPhrase: formattedSearchPhrase.value,
        statuses: [ContactStatus.Approved],
      });

      if (id !== requestId) {
        return;
      }

      organizations.value.push(...result.items);

      hasNextPage.value = result.pageInfo.hasNextPage;
      endCursor.value = result.pageInfo.endCursor;
      totalCount.value = result.totalCount;

      if (!searchPhrase.value) {
        totalOrganizations.value = result.totalCount;
      }

      initialized.value = true;
    } catch (error) {
      if (id !== requestId) {
        return;
      }
      Logger.error(`${_useUserOrganizations.name}.${fetchPage.name}`, error);
      throw error;
    } finally {
      if (id === requestId) {
        loading.value = false;
      }
    }
  }

  async function loadOrganizations(): Promise<void> {
    if (loading.value || !hasNextPage.value) {
      return;
    }

    await fetchPage();
  }

  // Starts its own request rather than waiting on one in flight, which belongs to the old list.
  async function search(): Promise<void> {
    organizations.value = [];
    endCursor.value = undefined;
    hasNextPage.value = true;
    totalCount.value = 0;

    await fetchPage();
  }

  function reset(): void {
    requestId++;
    organizations.value = [];
    endCursor.value = undefined;
    hasNextPage.value = true;
    totalCount.value = 0;
    totalOrganizations.value = 0;
    initialized.value = false;
    loading.value = false;
    searchPhrase.value = "";
  }

  return {
    searchPhrase,
    organizations: readonly(organizations),
    loading: readonly(loading),
    hasNextPage: readonly(hasNextPage),
    totalCount: readonly(totalCount),
    totalOrganizations: readonly(totalOrganizations),
    initialized: readonly(initialized),
    pagesCount,
    currentPage,
    isShowSearch,
    loadOrganizations,
    search,
    reset,
  };
}

export const useUserOrganizations = createGlobalState(_useUserOrganizations);
