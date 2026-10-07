# origin/dev into demo/VCST-6030 — 2026-10-07

- Range: `27a3af2ed`..`6af049316` (28 upstream commits, up to "chore: bump version to 3.0.0")
- Merge commit: `7e64d0201`; ports: `7802723af`
- PR: VirtoCommerce/vc-frontend-next#2 — lands as a merge commit, never squash or rebase

## Decisions that carry forward

- **`category.vue` keeps two breakpoints.** `isCompact` (< lg) drives the popup filters, the facet
  sidebar and the in-stock/branch controls; `isMobile` (< md) drives the horizontal filters. Upstream has
  only `isMobile`: map each of its conditions to the one the fork already uses at that spot, never
  rename wholesale.
- **`category.vue` markup is the theme's plates** (head plate with breadcrumbs, title and art; body
  plate with the listing) and sorting is `CategorySort`, not upstream's inline `VcSelect`. Upstream's
  conditions on its sort `div` go onto `CategorySort`.
- **`MissionsBanner` follows upstream's API** (`color: "primary" | "info"`, `--color--info`, `__action`,
  title outside the slot). The theme's deltas on top: `--plate-radius`, title 18px leading / 0.02em,
  subtitle 13px / 18px, `flex-auto` body, icon colour through `--vc-icon-color`. The balance label is the
  banner title in the banner title's style — the theme's smaller label style was dropped (user, 1a).
  The rewards banner links to the loyalty catalog when it is available; upstream's has no link.
- **Paprika's dark table-row hover stays neutral-200.** Upstream's dark layer sets `--row-hover-shade`
  to neutral-100 for contrast, but paprika sets the public `--vc-table-row-hover-bg-color`, which wins.
  In paprika dark neutral-100 is `#29201b`, the plate itself, so a 100 hover is invisible; neutral-600
  text on neutral-200 is 5.70:1, AA. (Upstream's problem was coffee: 3.40:1.) User, 2a.
- **`core-api/package.json` takes the higher version**; the root `package.json` follows upstream while
  the fork sets no version of its own.
- **`fork-map.json` uses `ignored` sparingly.** `home.vue` is a replacement (demo-home), so upstream
  changes to it show in section C; ship-to and the org switcher stay unmapped on purpose.

## Conflicts

| File(s)                                                                              | Fork                                                                    | Upstream                                                                                                         | Resolution                                                                                                                                                                                                                                                                | Decided by |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `shared/catalog/components/category.vue`                                             | plate layout, `CategorySort`, `isCompact`                               | barcode lookup hides filters and controls, barcode heading, single-hit redirect (VirtoCommerce/vc-frontend#2501) | fork markup; `!isBarcodeLookup` on popup sidebar, facets toggler, controls, horizontal filters, sidebar visibility; `CategorySort` stands in for the horizontal sort; barcode heading in the head plate; `hasActiveFilters` and the barcode keyword to `CategoryProducts` | obvious    |
| `loyalty/components/missions-banner.vue`, `points-balance.vue`, `pages/missions.vue` | white accent cards, `variant` mapped to a tone, catalog link on rewards | same redesign with a `color` prop, label moved into the banner title (VirtoCommerce/vc-frontend#2524)            | upstream API, fork values reapplied (see above)                                                                                                                                                                                                                           | user (1a)  |
| `ui-kit/organisms/table/vc-table.vue`                                                | `--row-hover-bg`                                                        | `--row-hover-shade` + `--row-hover-bg-color`, dark shade 100 (VirtoCommerce/vc-frontend#2532)                    | upstream's names; paprika's values through the public token                                                                                                                                                                                                               | user (2a)  |
| `core-api/package.json`                                                              | 0.1.2                                                                   | 0.2.0                                                                                                            | 0.2.0                                                                                                                                                                                                                                                                     | obvious    |
| `sales-rep/PORT_TO_MF.md`                                                            | `useBreakpoints` in `pages/dashboard.vue`                               | in `components/sales-rep-orders-filters.vue`                                                                     | both listed; left unformatted, as the fork had it                                                                                                                                                                                                                         | obvious    |

## Clean merges checked

- `core-api/contract/index.d.ts` — regenerated with `yarn build:core-types`: added the `orderDetails`
  extension point (returns' "Request return" button) the text merge had missed.
- `_ui-kit-tokens.scss` — secondary button text 500 → 600 (AA, VirtoCommerce/vc-frontend#2515); paprika does not override it.
- `wishlist-card.vue` — new `share` event and `shareable`/`removable` props; the lists page took upstream's.
- `language-selector.vue` — upstream's decorative-flag fix arrived, but only the mobile menu renders it
  (see Ports).
- `app-runner.ts`, `router/routes/main.ts` — returns module init, `/oauth/authorize` route; no fork overlap.

## Ports (vc-frontend:port-upstream-to-fork)

| Upstream change                                                               | Verdict | Fork file / evidence                                                                                                                       |
| ----------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| VCST-5840 decorative language flags (VirtoCommerce/vc-frontend#2513)          | port    | `header-preferences-menu.vue`: `alt=""`; test `header-preferences-menu.upstream.test.ts`, fails with `:alt="language.nativeName"` restored |
| VCST-5945 top header on one line at 1280 (VirtoCommerce/vc-frontend#2534)     | n/a     | the theme's header bar shows initials only (`header-account-menu.vue:26`); names and organizations are in the panel, no ship-to in the bar |
| VCST-5748 OTP in the home login section (VirtoCommerce/vc-frontend#2477)      | n/a     | `demo-home` has no login section; OTP reaches the sign-in page and the static-content `login.vue` block                                    |
| VCST-2945 barcode search in `search-bar.vue` (VirtoCommerce/vc-frontend#2501) | already | `header-plate.vue` renders `search-bar.vue`                                                                                                |
| Returns menu item + VCST-6176 icon alias (VirtoCommerce/vc-frontend#2544)     | already | merges into `desktopPurchasingMenuItems`, read by `useAccountMenuSections.ts`                                                              |

Map changes: `fork-map.json` created — header (`header-plate`, account menu and panel ← `top-header`,
`bottom-header`, `top-header-link`), preferences menu + `useLocaleSwitch` ← `language-selector`,
`currency-selector`, `demo-home/*` ← `home.vue`, and the fork-only additions with `"upstream": []`.
No `ignored` entries.

## Lost features and deferrals

- **Ship-to selector** — upstream renders it in `top-header.vue`; the theme's header has none (since
  before this merge). Deferred: its own ticket if the demo needs it. Unmapped, so the drift report shows
  it in section A whenever upstream changes `ship-to-selector.vue` — ask again then.
- **Organization switcher** — `header-account-menu-panel.vue` renders `TopHeaderOrganizations` behind
  `IS_ORGANIZATION_SWITCHER_SHOWN`, which tree-shakes it away. Not discussed in this merge; unmapped.

## Checks

| Check          | Result                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| validate:types | pass                                                                                                                                                     |
| lint           | 30 errors, the same 30 on both parents (e.g. `no-unnecessary-type-assertion` in `useErrorsTranslator.ts`, `search-dropdown.vue`); none in resolved files |
| test:unit      | 3722 pass. Upstream's `language-selector.test.ts` failed until its mocks used the theme's `useLocaleSwitch`; assertions unchanged                        |
| check-locales  | pass                                                                                                                                                     |
| build-only     | pass                                                                                                                                                     |

New tests, each checked by removing the ported line:

- `category.upstream.test.ts` — barcode heading, barcode as the list's keyword, `hasActiveFilters`
  false in a lookup (upstream's `category.test.ts` covers the other six conditions).
- `missions-banner.upstream.test.ts` — title kept beside the slot, info accent from `color`.
- `header-preferences-menu.upstream.test.ts` — decorative flags (the VCST-5840 port).

## Smoke

- Backend: `https://vcst-qa.govirto.com`, `vite preview` on 3100, signed out.
- Checked: home, `/catalog`, `/search?q=hat`, `/search?barcode=…` (heading names the code, filters and
  controls hidden), desktop preferences menu (15 flags `alt=""`, each option named once), mobile menu
  language list (15 flags `alt=""`), `/sign-in` (no OTP — `OtpSignIn.Enabled` is false on QA), account
  routes and `/oauth/authorize` redirect to sign-in. No GraphQL `errors`, no alerts, no overlay.
- Not reachable: barcode lookups with results — QA's `Catalog.Search.BarcodeSearchFields` is `[]`, so
  `barcode:` matches nothing (fixture `QA-BC-2945-008` has UPC `294500000084`, found by full text);
  missions, lists sharing, returns and dark table hover need a signed-in user; OTP needs the setting on.

## Follow-ups

- Barcode lookup with results, missions, list sharing, returns, OTP: QA checklist in the PR.
