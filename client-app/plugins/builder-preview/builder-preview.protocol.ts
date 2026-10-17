import { Logger } from "@/core/utilities";
import type { PageBuilderSchemaType } from "./models/PageBuilderSchemaType";
import type { IThemeConfig } from "@/core/types";
import type { IPageContent, IPageTemplate } from "@/shared/static-content/types";

type NullableBuilderMessageFieldsType = {
  sectionId: string | null;
  userId: string | null;
};

type PreviewModelType = Partial<IPageContent> & Pick<IPageContent, "type">;

export type TransferDataType = {
  template?: IPageTemplate;
  model?: PreviewModelType;
  templateKey?: string;
  source: "builder";
  type: string;
  url?: string;
  settings?: IThemeConfig;
  token?: { access_token?: string } | null;
  cultureName?: string;
  sharedComponentBoundaries?: unknown;
  /** The names of the sections the preview outlines (section id → name); others aren't outlined. */
  sectionLabels?: Record<string, string>;
  /** `inspector` messages: off, the page works as it does live (no outlines, clicks reach the page). */
  enabled?: boolean;
  /** `groups` messages: the header and footer group sections as the designer edits them */
  header?: unknown[];
  footer?: unknown[];
} & Partial<NullableBuilderMessageFieldsType>;

const PREVIEW_UPDATE_TYPES = new Set(["changed", "update", "remove", "add", "reload", "page", "swap", "preview"]);

export function isBuilderMessage(value: unknown): value is TransferDataType {
  if (!isRecord(value) || value.source !== "builder" || typeof value.type !== "string") {
    return false;
  }

  if (PREVIEW_UPDATE_TYPES.has(value.type)) {
    return (
      isPageTemplate(value.template) &&
      (value.model === undefined || isPreviewModel(value.model)) &&
      isOptionalString(value.templateKey) &&
      isOptionalString(value.cultureName) &&
      isOptionalSelection(value.sectionId) &&
      (value.sharedComponentBoundaries === undefined || Array.isArray(value.sharedComponentBoundaries)) &&
      (value.sectionLabels === undefined || isStringRecord(value.sectionLabels))
    );
  }

  switch (value.type) {
    case "connect":
      return true;
    case "hover":
      return value.sectionId === null || isNonEmptyString(value.sectionId);
    case "select":
      return isNonEmptyString(value.sectionId);
    case "navigate":
      return typeof value.url === "string";
    case "settings":
      return isRecord(value.settings);
    case "inspector":
      return typeof value.enabled === "boolean";
    case "groups":
      return isOptionalItemList(value.header) && isOptionalItemList(value.footer);
    case "auth":
      return isAuthToken(value.token) && (value.userId === null || isOptionalString(value.userId));
    default:
      return false;
  }
}

export function addBuilderMessageListener(
  targetWindow: Window,
  builderOrigin: string,
  parentWindow: Window,
  onMessage: (message: TransferDataType) => void,
): () => void {
  const listener = (event: MessageEvent<unknown>) => {
    if (event.origin !== builderOrigin || event.source !== parentWindow) {
      // Not addressed to us. Foreign frames post to this window routinely, so stay quiet here.
      return;
    }

    if (!isBuilderMessage(event.data)) {
      // The designer is the only sender that reaches this point, so a rejected payload means the two
      // sides disagree about the protocol. Without this line "the preview does not update" leaves no trace.
      Logger.warn("[builder-preview] Rejected a designer message that does not match the preview protocol", {
        type: isRecord(event.data) ? event.data.type : typeof event.data,
      });
      return;
    }

    onMessage(event.data);
  };

  targetWindow.addEventListener("message", listener);
  return () => targetWindow.removeEventListener("message", listener);
}

export function createPreviewLoadedNotifier(targetWindow: Window, targetOrigin: string) {
  let data: PageBuilderSchemaType | undefined;

  const announce = () => {
    if (data) {
      targetWindow.postMessage({ source: "preview", type: "loaded", data }, targetOrigin);
    }
  };

  return {
    announce,
    setData(value: PageBuilderSchemaType) {
      data = value;
      announce();
    },
  };
}

function isPageTemplate(value: unknown): value is IPageTemplate {
  return (
    isRecord(value) && isRecord(value.settings) && Array.isArray(value.content) && value.content.every(isPageContent)
  );
}

function isPageContent(value: unknown): value is IPageContent {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.type);
}

function isPreviewModel(value: unknown): value is PreviewModelType {
  return isRecord(value) && isNonEmptyString(value.type) && (value.id === undefined || isNonEmptyString(value.id));
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalSelection(value: unknown): boolean {
  return value === undefined || value === "" || isNonEmptyString(value);
}

function isNonEmptyString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return String(value).trim().length > 0;
}

function isAuthToken(value: unknown): boolean {
  return (
    value === null || (isRecord(value) && (value.access_token === undefined || typeof value.access_token === "string"))
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((x) => typeof x === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A list of sections (each with a string id and type), or nothing */
function isOptionalItemList(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.type === "string"))
  );
}
