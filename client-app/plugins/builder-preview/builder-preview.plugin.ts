import { v4 as uuidv4 } from "uuid";
import { watch } from "vue";
import { useGlobalInterceptors } from "@/core/api/common";
import { useLanguages } from "@/core/composables/useLanguages";
import { globals, setGlobals } from "@/core/globals";
import { Logger } from "@/core/utilities";
import { useSectionGroups } from "@/shared/layout/composables/useSectionGroups";
import { useStaticPage } from "@/shared/static-content";
import { templateBlocks } from "@/shared/static-content/components";
import { useThemeTemplates } from "@/shared/static-content/templates";
import { addBuilderMessageListener, createPreviewLoadedNotifier } from "./builder-preview.protocol";
import PreviewPage from "./components/preview-page.vue";
import ScrollToElement from "./components/scroll-to-element.vue";
import { InlineTextEditor, editableTexts } from "./inline-text-editor";
import { getRegisteredComponents } from "./register-components";
import { SectionOverlay, markedSection } from "./section-overlay";
import {
  SHARED_COMPONENT_END_ANCHOR_ID,
  SharedComponentOverlay,
  normalizeSharedComponentBoundaries,
} from "./shared-component-overlay";
import { getBuilderOrigin, getPreviewCultureName, getPreviewPageId } from "./utils";
import type { TransferDataType } from "./builder-preview.protocol";
import type { PageBuilderPluginOptionsType } from "./models/PageBuilderPluginOptionsType";
import type { IThemeConfig } from "@/core/types";
import type { GroupSectionType } from "@/shared/layout/composables/useSectionGroups";
import type { IPageContent, IPageTemplate } from "@/shared/static-content/types";
import type { App } from "vue";
import type { Router } from "vue-router";
import StaticPage from "@/pages/static-page.vue";

templateBlocks["scroll-to"] = ScrollToElement;

const { staticPagePreview } = useStaticPage();

// Switch the storefront preview to the edited page's language without touching the URL (VCST-5219).
// The designer preview runs on a fixed `/designer-preview` route (vue-router base ""), so we must not
// add a `/{lang}` prefix here; we re-apply the locale through the shared seam (app messages, UI kit
// and module bundles, number formats) and update globals.cultureName, which drives
// content-localized GraphQL queries on the next block remount.
async function applyPreviewLocale(rawCultureName?: string): Promise<void> {
  try {
    const { applyLocale, normalizeToSupportedCulture } = useLanguages();
    const cultureName = normalizeToSupportedCulture(rawCultureName);

    if (!cultureName || cultureName === globals.cultureName || !globals.i18n) {
      return;
    }

    await applyLocale(globals.i18n, cultureName, { rewriteUrl: false });
    setGlobals({ cultureName });
  } catch (error) {
    // Never propagate: the message handler reveals the preview body right after this, and a failed
    // locale switch must degrade to the boot language — not leave the preview permanently hidden.
    Logger.error("Failed to apply the preview locale", error);
  }
}

function scrollToSection(sectionId: string) {
  requestAnimationFrame(() => {
    // a page section's anchor, else a header or footer section's element
    const element = document.getElementById("__scroll__" + sectionId) ?? markedSection(sectionId);
    if (element) {
      const rect = measureElement(element);
      const targetPosition = (rect.top || 0) - window.innerHeight / 10;
      window.scroll({ top: targetPosition, behavior: "smooth" });
    }
  });
}

/** A section picked in the designer: outline it and scroll to it (a shared-component placement, else the section) */
function selectSection(sectionId: string, sharedComponentOverlay: SharedComponentOverlay | null) {
  sectionOverlay?.select(sectionId);
  initialSectionId = sectionId;
  if (!sharedComponentOverlay?.scrollToPlacement(sectionId)) {
    scrollToSection(sectionId);
  }
}

/**
 * The designer's page on the preview page; or, while it edits a template (`templateKey`), its version of the template on
 * the product, category or page it previews it with (the last `navigate` named it).
 */
async function showPageOrTemplate(templateKey: string | undefined, template: IPageTemplate, router: Router) {
  if (templateKey) {
    useThemeTemplates().setPreview(templateKey, template);
    if (templateUrl) {
      templatePath = new URL(templateUrl, window.location.origin).pathname;
      await router.push(templateUrl);
    }
  } else {
    // back from a template's page, if the designer was editing one
    useThemeTemplates().setPreview(undefined);
    if (templateUrl || templatePath) {
      templatePath = undefined;
      await router.push("/designer-preview");
    }
    staticPagePreview.value = template;
  }
  templateUrl = undefined;
}

async function updatePreview(
  data: TransferDataType,
  options: { router: Router },
  sharedComponentOverlay: SharedComponentOverlay | null,
) {
  const template = data.template;
  if (!template) {
    return;
  }

  // Add-block models have no persisted id yet. Give only the preview copy an id for rendering and anchors.
  const model: IPageContent | undefined = data.model
    ? { ...data.model, id: data.model.id ?? `__preview__${uuidv4()}` }
    : undefined;
  const content = model ? [...template.content, model] : template.content;
  renderedContent = content;
  const newTemplate = { ...template, content: <IPageContent[]>[] };

  content.forEach((block: IPageContent) => {
    newTemplate.content.push({ type: "scroll-to", id: "__scroll__" + block.id }, block);
  });
  newTemplate.content.push({ type: "scroll-to", id: `__scroll__${SHARED_COMPONENT_END_ANCHOR_ID}` });

  await showPageOrTemplate(data.templateKey, newTemplate, options.router);

  sharedComponentOverlay?.update(
    content.map((block) => block.id),
    normalizeSharedComponentBoundaries(data.sharedComponentBoundaries),
  );
  renderedLabels = data.sectionLabels ?? {};
  updateSectionOverlay();
  if (data.sectionId !== undefined) {
    sectionOverlay?.select(data.sectionId || null);
  }

  // Remember the initially selected section for scroll restoration after auth changes
  if (data.sectionId) {
    initialSectionId = data.sectionId;
  }

  if (pendingScrollRestore) {
    pendingScrollRestore = false;
    if (initialSectionId) {
      scrollToSection(initialSectionId);
    }
  } else if (data.type === "page" && initialSectionId) {
    scrollToSection(initialSectionId);
  }
}

function updateSettings(app: App, settings: IThemeConfig) {
  const keys = Object.entries(settings);

  keys.forEach(([key, value]) => {
    (app.config.globalProperties.$cfg as Record<string, unknown>)[key] = value;
  });

  keys
    .filter(([key]) => key?.startsWith("color"))
    .forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key?.replaceAll("_", "-") ?? ""}`, value as string);
    });
}

export function measureElement(element: HTMLElement): {
  top?: number;
  left?: number;
  height?: number;
  width?: number;
} {
  const target = element;
  const target_width = target.offsetWidth;
  const target_height = target.offsetHeight;
  let rect = {};
  let gleft = 0;
  let gtop = 0;

  const moonwalk = function (_parent: HTMLElement | null) {
    if (_parent) {
      gleft += _parent.offsetLeft;
      gtop += _parent.offsetTop;
      moonwalk(<HTMLElement>_parent.offsetParent);
    } else {
      rect = {
        top: target.offsetTop + gtop,
        left: target.offsetLeft + gleft,
        height: target_height,
        width: target_width,
      };
      return rect;
    }
  };
  moonwalk(<HTMLElement>target.offsetParent);
  return rect;
}

let templateUrl: string | undefined;
// the product, category or page a template is previewed on: the designer stays there while it edits the template
let templatePath: string | undefined;
let previewToken: string | null | undefined;
let originalUserId: string | undefined;
let pendingScrollRestore = false;
let initialSectionId: string | undefined;
// outlines the designer's sections (hover, selection, click to select); null outside the designer
let sectionOverlay: SectionOverlay | null = null;
// takes the pointer in the designer, so the page can't be used; null outside the designer
let interactiveBlocker: HTMLElement | null = null;
// edits a clicked text in place; while it does, renders wait (a re-render would move the caret)
let inlineEditor: InlineTextEditor | null = null;
let heldBackRender: TransferDataType | null = null;
let renderHeldBack: (() => void) | null = null;
// the page's sections as last rendered (and their names), for the outlines and the texts a click can edit
let renderedContent: IPageContent[] = [];
let renderedLabels: Record<string, string> = {};

/** The designer's header and footer groups as it edits them */
function applyGroups(data: TransferDataType) {
  useSectionGroups().setSectionGroups({
    ...(data.header ? { header: data.header as GroupSectionType[] } : {}),
    ...(data.footer ? { footer: data.footer as GroupSectionType[] } : {}),
  });
  updateSectionOverlay();
}

/** The outlined sections: the header and footer groups', then the page's (in page order) */
function updateSectionOverlay() {
  const groupIds = useSectionGroups()
    .allSections()
    .map((section) => section.id);
  sectionOverlay?.update([...groupIds, ...renderedContent.map((block) => block.id)], renderedLabels);
}

/** The designer's inspector: off, the page takes the pointer again and no outlines show; links still stay on the preview. */
function setInspector(enabled: boolean, sharedComponentOverlay: SharedComponentOverlay | null) {
  inlineEditor?.end();
  if (interactiveBlocker) {
    interactiveBlocker.style.pointerEvents = enabled ? "auto" : "none";
  }
  sectionOverlay?.hover(null);
  sharedComponentOverlay?.highlight(null);
  document.querySelectorAll<HTMLElement>("[data-section-overlay], [data-shared-component-overlay]").forEach((layer) => {
    layer.style.display = enabled ? "" : "none";
  });
}

function modifyRequests() {
  const { onRequest } = useGlobalInterceptors();

  // Take all previously registered interceptors (e.g. auth plugin)
  // and replace them with a single wrapper that runs them sequentially,
  // then applies preview overrides last.
  // This avoids the Promise.all race where auth's async refresh()
  // could overwrite the preview Authorization header.
  const existingInterceptors = onRequest.value.splice(0);

  onRequest.value.push(async (input, init) => {
    for (const intercept of existingInterceptors) {
      await intercept(input, init);
    }

    if (!init) {
      return;
    }

    // Only add x-template-builder header to HTTP requests (where init.headers exists),
    // not to WebSocket connectionParams (where init is a plain object).
    if (init.headers) {
      Object.assign(init.headers, { ["x-template-builder"]: "preview-mode" });
    }

    // Override Authorization on both init.headers and init itself,
    // because auth plugin may place it on either depending on
    // whether init.headers existed (HTTP requests vs WebSocket connectionParams).
    const target = init as Record<string, unknown>;
    if (previewToken) {
      if (init.headers) {
        (init.headers as Record<string, string>).Authorization = `Bearer ${previewToken}`;
      }
      target.Authorization = `Bearer ${previewToken}`;
    } else if (previewToken === null) {
      if (init.headers) {
        delete (init.headers as Record<string, string>).Authorization;
      }
      delete target.Authorization;
    }
  });
}

/** Largest value a CSS `z-index` accepts (2^31 - 1) — keeps the blocker above every storefront element. */
const MAX_Z_INDEX = 2147483647;

function createOverlay(builderOrigin: string): {
  bodyEl: HTMLElement | null;
  sharedComponentOverlay: SharedComponentOverlay | null;
} {
  const bodyEl = document.getElementsByTagName("body").item(0);

  if (!bodyEl) {
    return { bodyEl: null, sharedComponentOverlay: null };
  }

  bodyEl.style.visibility = "hidden";
  bodyEl.style.position = "relative";
  interactiveBlocker = document.createElement("div");
  // Cover the whole viewport and sit above every storefront element (sticky header, language
  // selector, etc.) so no in-preview interaction is possible inside the designer. This is what
  // prevents the user from switching the storefront language and hitting the `/fr/designer-preview`
  // 404 — the preview simply follows the edited page's language instead (VCST-5219).
  interactiveBlocker.style.position = "fixed";
  interactiveBlocker.style.inset = "0";
  interactiveBlocker.style.zIndex = String(MAX_Z_INDEX);
  interactiveBlocker.style.background = "transparent";
  interactiveBlocker.style.pointerEvents = "auto";
  bodyEl.appendChild(interactiveBlocker);

  const postSectionMessage = (type: "select" | "hover", sectionId: string | null) => {
    window.parent.postMessage({ source: "preview", type, data: { sectionId } }, builderOrigin);
  };
  // both overlays report the pointer; the designer hears one hover: a placement under it, else a section
  let hoveredPlacement: string | null = null;
  let hoveredSection: string | null = null;
  let reportedHover: string | null = null;
  const reportHover = () => {
    const hovered = hoveredPlacement ?? hoveredSection;
    if (hovered !== reportedHover) {
      reportedHover = hovered;
      postSectionMessage("hover", hovered);
    }
  };
  const sharedComponentOverlay = new SharedComponentOverlay(
    bodyEl,
    interactiveBlocker,
    (placementId) => postSectionMessage("select", placementId),
    (placementId) => {
      hoveredPlacement = placementId;
      reportHover();
    },
  );
  inlineEditor = new InlineTextEditor(
    interactiveBlocker,
    (sectionId) => {
      const section =
        renderedContent.find((item) => item.id === sectionId) ??
        useSectionGroups()
          .allSections()
          .find((item) => item.id === sectionId);
      return section ? editableTexts(section) : [];
    },
    (edit) => window.parent.postMessage({ source: "preview", type: "edit", data: edit }, builderOrigin),
    () => renderHeldBack?.(),
  );
  sectionOverlay = new SectionOverlay(
    bodyEl,
    interactiveBlocker,
    (sectionId, event) => {
      postSectionMessage("select", sectionId);
      inlineEditor?.start(sectionId, event.clientX, event.clientY);
    },
    (sectionId) => {
      hoveredSection = sectionId;
      reportHover();
    },
  );

  return { bodyEl, sharedComponentOverlay };
}

async function handleMessage(
  app: App,
  options: PageBuilderPluginOptionsType,
  bodyEl: HTMLElement | null,
  sharedComponentOverlay: SharedComponentOverlay | null,
  loadedNotifier: ReturnType<typeof createPreviewLoadedNotifier>,
  data: TransferDataType,
) {
  if (data.type === "connect") {
    loadedNotifier.announce();
    return;
  }

  // Render the preview in the edited page's language before it becomes visible (VCST-5219),
  // so a non-default-language page never flashes in the store default language.
  await applyPreviewLocale(data.cultureName);

  if (bodyEl) {
    bodyEl.style.visibility = "visible";
  }

  switch (data.type) {
    case "changed":
    case "update":
    case "remove":
    case "add":
    case "reload":
    case "swap":
    case "preview":
      if (inlineEditor?.isEditing) {
        heldBackRender = data;
        break;
      }
      await updatePreview(data, options, sharedComponentOverlay);
      break;

    case "page":
      // a whole page from the designer (a section picked in its tree, a version shown) ends inline editing and
      // replaces what editing held back: the designer's page already has every edit typed here
      if (inlineEditor?.isEditing) {
        heldBackRender = null;
        inlineEditor.end();
      }
      await updatePreview(data, options, sharedComponentOverlay);
      break;

    case "hover":
      sharedComponentOverlay?.highlight(data.sectionId ?? null);
      sectionOverlay?.hover(data.sectionId ?? null);
      break;
    case "select":
      if (data.sectionId) {
        selectSection(data.sectionId, sharedComponentOverlay);
      }
      break;
    case "navigate": {
      // we will know about template it or not in the next message
      templateUrl = data.url;
      break;
    }
    case "settings":
      if (data.settings) {
        updateSettings(app, data.settings);
      }
      break;
    case "inspector":
      setInspector(data.enabled !== false, sharedComponentOverlay);
      break;
    case "groups":
      applyGroups(data);
      break;
    case "auth": {
      previewToken = data.token?.access_token || null;
      if (!originalUserId) {
        originalUserId = globals.userId;
      }
      setGlobals({ userId: data.userId || originalUserId });
      // Force remount of all blocks with new token and restore scroll afterward
      pendingScrollRestore = true;
      staticPagePreview.value = undefined;
      sharedComponentOverlay?.update([], []);
      sectionOverlay?.update([], {});
      break;
    }
    default:
      Logger.warn(`Unknown message type: ${data.type}`);
  }
}

function handleMessages(
  app: App,
  options: PageBuilderPluginOptionsType,
  builderOrigin: string,
  bodyEl: HTMLElement | null,
  sharedComponentOverlay: SharedComponentOverlay | null,
  loadedNotifier: ReturnType<typeof createPreviewLoadedNotifier>,
) {
  // Builder messages arrive as independent tasks, and each handler awaits (locale switch, router
  // navigation), so unqueued handlers would interleave: an older message could apply its template
  // after a newer one. Chaining them keeps preview state in the order the builder sent it.
  let messageQueue: Promise<void> = Promise.resolve();

  // inline editing ended: the last render it held back goes out, in order with the rest
  renderHeldBack = () => {
    const data = heldBackRender;
    heldBackRender = null;
    if (data) {
      messageQueue = messageQueue.then(() =>
        updatePreview(data, options, sharedComponentOverlay).catch((error: unknown) => {
          Logger.error("Failed to render the builder preview", error);
        }),
      );
    }
  };

  return addBuilderMessageListener(window, builderOrigin, window.parent, (data) => {
    messageQueue = messageQueue.then(() =>
      handleMessage(app, options, bodyEl, sharedComponentOverlay, loadedNotifier, data).catch((error: unknown) => {
        // Never break the chain: a failed message must not stall every following one.
        Logger.error("Failed to handle the builder preview message", error);
      }),
    );
  });
}

function modifyRoutes(router: Router, mode: "preview" | "designer") {
  if (mode === "designer") {
    const page = <IPageTemplate>(<unknown>{ settings: {}, content: [] });
    staticPagePreview.value = page;
  }
  const routes = router.getRoutes();
  const matcher = routes.find((x) => x.name === "Matcher")!;
  router.removeRoute("Matcher");
  router.addRoute({
    path: "/designer-preview",
    name: "StaticPage",
    component: mode === "preview" ? PreviewPage : StaticPage,
    props: true,
    meta: { public: true },
  });
  router.addRoute(matcher);

  // the designer's ?ep= stays in the URL: a reload of the frame (Vite's, a currency or cart change) must boot the
  // designer preview again, not the standalone one, which has no pageId and shows the 404 page
  const builderOrigin = getBuilderOrigin();
  // the preview stays on its page: the designer's page, or the product, category or page a template is shown on
  router.beforeEach((to, from, next) => {
    const query = builderOrigin && !to.query.ep ? { ...to.query, ep: builderOrigin } : to.query;
    const allowed = to.path === "/designer-preview" || (!!templatePath && to.path === templatePath);
    if (allowed && query === to.query) {
      next();
    } else {
      next({ path: allowed ? to.path : (templatePath ?? "/designer-preview"), query, hash: to.hash });
    }
  });
}

// eslint-disable-next-line no-restricted-exports
export default {
  install: async (app: App, options: PageBuilderPluginOptionsType) => {
    modifyRequests();

    const builderOrigin = getBuilderOrigin();

    modifyRoutes(options.router, builderOrigin ? "designer" : "preview");

    if (builderOrigin) {
      const loadedNotifier = createPreviewLoadedNotifier(window.parent, builderOrigin);
      const { bodyEl, sharedComponentOverlay } = createOverlay(builderOrigin);
      handleMessages(app, options, builderOrigin, bodyEl, sharedComponentOverlay, loadedNotifier);

      // which template a page got, and by which rule: the designer shows it ("template in effect", its Test box)
      watch(
        () => useThemeTemplates().resolved.value,
        (resolved) =>
          resolved && window.parent.postMessage({ source: "preview", type: "resolved", data: resolved }, builderOrigin),
      );

      const customComponents = await getRegisteredComponents();
      loadedNotifier.setData(customComponents);
      await options.router.push("/designer-preview");
    } else {
      // Preserve both pageId and cultureName so a refreshed or shared standalone-preview URL keeps
      // rendering in the page's language instead of the store default (VCST-5219).
      const query = new URLSearchParams();
      const pageId = getPreviewPageId();
      if (pageId) {
        query.set("pageId", pageId);
      }
      const cultureName = getPreviewCultureName();
      if (cultureName) {
        query.set("cultureName", cultureName);
      }
      await options.router.push(`/designer-preview?${query.toString()}`);
    }
  },
};
