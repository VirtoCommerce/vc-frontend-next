import { createGlobalState } from "@vueuse/core";
import { cloneDeep } from "lodash-es";
import { computed, ref } from "vue";
import { presets } from "@/assets/presets";
import settingsData from "@/config/settings_data.json";
import { presetNameToFileName } from "@/core/utilities";
import { IS_DEVELOPMENT } from "../constants";
import { BrowserTargetType } from "../enums";
import type { StoreResponseType } from "../api/graphql/types";
import type { IThemeConfig, IThemeConfigPreset, IThemeContext } from "../types";

const loadedPresets = new Map<string, IThemeConfigPreset>();
const SAVED_SETTINGS_TIMEOUT_MS = 2000;

export function getPredefinedPreset(presetName: string): IThemeConfigPreset | null {
  if (presetName in presets) {
    return presets[presetName];
  }
  return null;
}

export async function loadPreset(presetName: string): Promise<IThemeConfigPreset | null> {
  if (loadedPresets.has(presetName)) {
    return loadedPresets.get(presetName)!;
  }

  try {
    const response = await fetch(`/assets/presets/${presetName}.json`);

    if (response.ok) {
      const preset = (await response.json()) as IThemeConfigPreset;
      loadedPresets.set(presetName, preset);
      return preset;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to load preset "${presetName}" from /assets/presets/:`, error);
  }

  return null;
}

export async function getPreset(presetName: string): Promise<IThemeConfigPreset | null> {
  const predefinedPreset = getPredefinedPreset(presetName);
  if (predefinedPreset) {
    return predefinedPreset;
  }

  const loadedPreset = await loadPreset(presetName);
  if (loadedPreset) {
    return loadedPreset;
  }

  return null;
}

/**
 * The settings in a theme's settings_data.json: the page designer writes them as `current`; a preset's name in
 * `current` picks one of `presets`; the app's own file keeps them in `settings`.
 */
export function savedThemeSettings(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    return {};
  }
  const {
    current,
    presets: namedPresets,
    settings,
  } = data as {
    current?: unknown;
    presets?: Record<string, unknown>;
    settings?: unknown;
  };
  if (current && typeof current === "object") {
    return current as Record<string, unknown>;
  }
  const preset = typeof current === "string" ? namedPresets?.[current] : undefined;
  if (preset && typeof preset === "object") {
    return ((preset as { settings?: Record<string, unknown> }).settings ?? preset) as Record<string, unknown>;
  }
  return settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
}

function getThemeConfig() {
  const data = cloneDeep(settingsData) as IThemeConfig;

  if (IS_DEVELOPMENT && typeof data.settings === "object" && data.settings !== null) {
    data.settings.details_browser_target = BrowserTargetType.SELF;
    data.settings.product_page_browser_target = BrowserTargetType.SELF;
    data.settings.cart_page_browser_target = BrowserTargetType.SELF;
  }

  return data;
}

function _useThemeContext() {
  const themeContext = ref<IThemeContext>();

  function setThemeContext(store: StoreResponseType) {
    const themeConfig = getThemeConfig();

    if (!themeConfig) {
      throw new Error("Can't get theme context");
    }

    themeContext.value = {
      ...store,
      settings: themeConfig.settings,
      storeSettings: store.settings,
      defaultPresetName: themeConfig.current,
    };
  }

  /**
   * The settings the store's theme saved on the platform (the page designer's Theme tab: header, footer, colours…),
   * over the ones built into the app. Theme files are public content (/cms-content, the content module's default
   * layout); no file, or no answer in time, keeps the built-in ones.
   */
  async function applySavedThemeSettings(storeId: string, themeName = "default"): Promise<void> {
    if (!themeContext.value) {
      return;
    }
    try {
      const url = `/cms-content/Themes/${encodeURIComponent(storeId)}/${encodeURIComponent(themeName)}/config/settings_data.json`;
      const response = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(SAVED_SETTINGS_TIMEOUT_MS) });
      if (!response.ok) {
        return;
      }
      const saved = savedThemeSettings(await response.json());
      Object.assign(themeContext.value.settings, saved);
      // colours are CSS variables, as the designer's preview sets them
      for (const [key, value] of Object.entries(saved)) {
        if (key.startsWith("color") && typeof value === "string" && value) {
          document.documentElement.style.setProperty(`--${key.replaceAll("_", "-")}`, value);
        }
      }
    } catch {
      // the built-in settings stay
    }
  }

  async function addPresetToThemeContext(presetName: string): Promise<void> {
    if (!themeContext.value) {
      throw new Error("The global state should be defined");
    }

    let resolvedName = presetNameToFileName(presetName);
    let preset = await getPreset(resolvedName);

    if (!preset) {
      const defaultPresetName = getThemeConfig().current;
      resolvedName = presetNameToFileName(defaultPresetName);
      preset = await getPreset(resolvedName);
    }

    if (preset) {
      themeContext.value.preset = preset;
      themeContext.value.activePresetName = resolvedName;
    } else {
      throw new Error("Missing preset");
    }
  }

  return {
    setThemeContext,
    applySavedThemeSettings,
    addPresetToThemeContext,
    themeContext: computed({
      get() {
        if (!themeContext.value) {
          throw new Error("Theme context is missing.");
        }

        return themeContext.value;
      },

      set() {
        throw new Error("Theme context change is not available.");
      },
    }),
    modulesSettings: computed(() => {
      return themeContext.value?.storeSettings?.modules;
    }),
  };
}

export const useThemeContext = createGlobalState(_useThemeContext);
