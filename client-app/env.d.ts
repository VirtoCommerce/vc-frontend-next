/// <reference types="vite/client" />
/// <reference types="@types/gtag.js" />
/// <reference types="@types/google.maps" />

interface Window {
  gtag: Gtag.Gtag;
  google: typeof google;
  dataLayer: Array<unknown>;
}

/** Whether this build is an MF host (`module_federation_enabled`); see vite.federation.ts. */
declare const __MF_HOST__: boolean;

interface ImportMetaEnv {
  /** JSON map of remote name -> mf-manifest.json URL. Inlined at BUILD time (see core/federation/README.md). */
  readonly APP_MODULES_FEDERATION_REMOTES?: string;
  /** `"true"` shows example figures on the Sales Rep Reporting page instead of the backend's (local demos only). */
  readonly APP_SALES_REP_REPORTING_MOCK?: string;
}
