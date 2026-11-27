# Release 63 (upstream/dev) into dev — 2026-11-27

- Base: `dev`; range: `a6ee5ce36`..`c6bf9afe1` (33 upstream commits: release 63 = tag `2.63.0` = `f3eb587df`, upstream's version bump to 2.64.0 `f3974b7f4`, and VirtoCommerce/vc-frontend#2674 from the 64 cycle)
- Merge commit: `19ae48697`; map: `4eda2f4e8`; ports: `8d8ddd987`; tests: `688ca6d77`; visual fixes: `e17beb3d2` (dark logo), `7c8d0af9a` (widget chevron), `b13ac9632` (Storybook theme)
- Branch: `chore/merge-upstream-upstream-dev` — its PR lands as a merge commit, never squash or rebase
- Jira: VCST-7055
- Clone config: `merge.conflictStyle zdiff3`, `rerere.enabled true`, `rerere.autoUpdate false`, `gc.rerereResolved 365` were already set; `remote.upstream.tagOpt --no-tags` set in this session (undo: `git config --unset remote.upstream.tagOpt`)

## Decisions that carry forward

- **A published Site Builder palette repaints the pinned paprika preset.** `app-runner.ts` pins
  `DEMO_THEME_PRESET = "paprika"` and calls `setupThemePalette(() => false)`: with no published palette
  paprika stays; a published one replaces colours only (shape, type and spacing stay paprika's), and Site
  Builder's palette is responsible for contrast and its dark variant. Same behaviour as upstream
  (VirtoCommerce/vc-frontend#2630). User.
- **The header organization switcher is the fork's pod wrapping upstream's `OrganizationList`.**
  Upstream built the same feature (VirtoCommerce/vc-frontend#2667: `organization-list.vue`, a labelled
  `organization-switcher.vue` link, a `menu.json` item `organizations`). The fork keeps
  `header-organizations-menu.vue` at the account end, renders it only when the `organizations` menu item
  exists (so removing the item hides it, as upstream intends) and never renders that item in the links row;
  it uses upstream's i18n key `shared.layout.header.organization_switcher.trigger_label`. Upstream fixes to
  the switcher's behaviour go into `organization-list.vue` (shared) or the pod. User.
- **The theme knows nothing about the product-comparison module.** Compare moved out of the repo into
  VirtoCommerce/vc-module-product-comparison (VirtoCommerce/vc-frontend#2635); it renders exactly as the
  module ships it, and the theme adds no CSS for the module's classes. This replaces the compare-table rule
  in `2026-10-15-2.60.0.md`. The compare visual scenarios were dropped with it. User.
- **Where both sides built the same ui-kit component, upstream's component wins and the paprika look is
  theme CSS**: VcTabSwitchGroup (the fork's `seg` look), VcTypography (the heading scale), VcTable
  (`rowHeader`, not the fork's `strong`), VcPagination, VcMenuItem (upstream's `-color` token names) — tokens
  in `_paprika.scss`, zero-specificity rules in `_paprika-components.scss`. Keeping the fork's component
  API re-conflicts on every merge. Obvious (rule of the skill).
- **One logo per colour mode for the header and the footer: light → standard, dark → inverted.** Both take
  the page's colour on Next. `themeLogoUrl` in dark mode = upstream's `darkLogoUrl` (the dark logo of the light
  logo's source), else white-labeling's secondary logo, else the store's `logo_inverted_image`. Upstream leaves
  `darkLogoUrl` undefined for an uploaded organization logo or a white-labeling logo without a secondary one
  and then shows the light logo; that put the standard logo on the dark header and footer (caught by the
  visual check, fixed in the branch's logo commit). User.
- **Storybook loads the paprika theme** (`storybook-styles/main.scss`: `_paprika-components.scss` in `vc.app`, then
  `_color-mode-switch.scss` and `_paprika.scss` unlayered, as `main.scss`). The fork's look of kit components now
  lives in those files, not in the kit; without them Storybook shows upstream's classic look. Obvious.
- **The root `package.json` keeps the fork's own version** (3.4.0), unchanged from the last log.

## Conflicts

| File(s) | Fork | Upstream | Resolution | Decided by |
|---|---|---|---|---|
| `app-runner.ts`, `useDarkMode.ts` | pinned paprika; animated colour-mode reveal | Site Builder palette, `setActivePreset(boolean)` (VirtoCommerce/vc-frontend#2630, VirtoCommerce/vc-frontend#2666) | pin kept, `setupThemePalette(() => false)`; fork's reveal + upstream's flags | user |
| `useWhiteLabeling.ts` | `themeLogoUrl` per colour mode | brand fields, `darkLogoUrl` (VirtoCommerce/vc-frontend#2630) | upstream's + `themeLogoUrl` on upstream's sources; new minimal/secure headers use it | obvious |
| `tailwind.config.ts` | geologica/inter stacks | theme moved to `ui-kit/tailwind-preset.ts` (VirtoCommerce/vc-frontend#2674) | upstream's + fork stacks under `extend` | obvious |
| `assets/styles/README.md` | fork token rows | upstream token rows | upstream's rows + fork rows still read | obvious |
| `package.json` | 3.4.0 | 2.64.0 | 3.4.0 | earlier log |
| `.github/workflows/*` (8) | dependabot pins | `.github@v3.1000.11`, `setup-vcbuild` (VirtoCommerce/vc-frontend#2682) | upstream's; sonarqube-scan keeps the fork's newer v8.5.0 | obvious |
| VcTabSwitchGroup (vue/test/stories AA, dark AU) | own group with `variant`/`fill` | radiogroup owning the model (VirtoCommerce/vc-frontend#2654) | upstream's; `seg` look as theme CSS; 3 consumers migrated | obvious |
| `vc-tab-switch.vue` | checked tokens | same tokens + group mode | upstream's + fork's hover icon token | obvious |
| `vc-typography.vue` | heading scale in the kit | tokens (VirtoCommerce/vc-frontend#2655) | upstream's; scale as theme tokens | obvious |
| VcTable (vue/column/types/stories) | `strong` column | `rowHeader` (VirtoCommerce/vc-frontend#2618) | upstream's API + fork's flush-radius/footer-padding tokens | obvious |
| `vc-menu-item.vue`, dark `vc-menu-item.scss` (UD) | `--vc-menu-item-*-bg` | `-bg-color`, dark file moved (VirtoCommerce/vc-frontend#2667, VirtoCommerce/vc-frontend#2674) | upstream's names, fork usages renamed, dark row bg transparent | obvious |
| `vc-pagination.vue` | ring/radius in the kit | tokens (VirtoCommerce/vc-frontend#2617) | upstream's; values in `_paprika.scss` | obvious |
| `vc-widget.vue` + stories | container margin token | `--bleed` (VirtoCommerce/vc-frontend#2667) | upstream's bleed + theme rule; both no-shadow lines | obvious |
| `vc-popover.vue` | motion, available height | padding/border tokens | both | obvious |
| dark `vc-modal.scss` (AU) | fork dark modal | dark folder moved | kept at the new path | obvious |
| Organization switcher (`top-header-organizations.vue` UD, header-plate, locales) | own pod | `organization-list` + `organization-switcher` (VirtoCommerce/vc-frontend#2667) | fork's pod wrapping upstream's list | user |
| `vc-header.vue` (UD) | fork header | renamed `app-header.vue` (VirtoCommerce/vc-frontend#2656) | fork's header in `app-header.vue` + upstream's KeepAlive/catalog gating/announcement bar | obvious |
| `bottom-header.vue`, `bottom-header-link.vue`, `mobile-header.vue`, `mega-menu.vue`, `mobile-menu.vue`, `vc-footer.vue`, `secure-layout.vue`, `composables/index.ts`, mobile `link-compare.vue` (UD) | restyled header/footer | preview attrs, external links, KeepAlive, extension counts, compare removal | fork markup + upstream behaviour; bottom-header behaviour ported into header-plate | obvious |
| `useUserOrganizations.ts` + test (AA) | stale-answer fix | same fix, other way | upstream's | obvious |
| `compare-table.vue` + test (UD) | 2.60.0 deltas | moved to the module (VirtoCommerce/vc-frontend#2635) | deleted, no theme CSS | user |
| `locales/*.json` (13) | `organizations_menu`, compare label, `demo_home` | `organization_switcher`, compare removed | upstream's keys + fork's `demo_home` | user / obvious |
| `orders.vue` | plate + inset table | `bordered`, flush table | one `bordered`, fork styles | obvious |
| `points-history.vue`, `purchase-requests.vue`, `quotes.vue` | row hover token | BEM rows (VirtoCommerce/vc-frontend#2618) | upstream's | obvious |
| `pages/category.vue`, `catalog/category.vue` | breadcrumbs slot, plates | Site Builder listing, `shownViewMode` (VirtoCommerce/vc-frontend#2630) | upstream's block + fork's slot; port `shownViewMode` | obvious |
| `product-price-block.vue` | 16px neutral-800 icons | `ExtensionPointList` row (VirtoCommerce/vc-frontend#2635) | upstream's + fork icon size/colour | obvious |

Also in this PR (user): the 8 English copies already in non-en locales (`preferences_menu.*`, de `sorting.short.featured`) translated.

## Clean merges checked

- `vc-line-item.vue` — selected line now a primary leading edge instead of a tint (VirtoCommerce/vc-frontend#2686); all cart lines are selected by default, so the cart looks different. Kept upstream's.
- static-content `features` / `slider` / `products-block` — text on dark gray now `additional-50` (VirtoCommerce/vc-frontend#2688).
- `main.scss` — kit styles through one entry and a `body` frame background; the fork's unlayered tail still wins.
- `matcher.vue` — fork pins `internal: 0` (`/` stays the theme's page), as before.
- `category-products.vue` — read `common.buttons.scroll_to_top`, which moved to `ui_kit.buttons.scroll_to_top` (VirtoCommerce/vc-frontend#2674); repointed.
- `orders-table.vue`, `product-card.vue`, `product-price.vue`, `product.vue`, `routes/main.ts`, `category-selector.vue`, `product-reviews.vue`, `index.html`, other workflows — no risk found.

## Ports (vc-frontend:port-upstream-to-fork)

Line trace: every upstream line missing from the merged files is a resolution named in the Conflicts table.
Drift report (`fork-drift.mjs --fork 19ae48697 --from a6ee5ce36 --to c6bf9afe1`): unresolved imports 0, sections A2/D/E empty.

| Upstream change | Verdict | Fork file / evidence |
|---|---|---|
| VCST-6744 frame header width (VirtoCommerce/vc-frontend#2656), upstream `mobile-header.vue` | port | `mobile-header.vue` root reads `--vc-frame-header-width` (`8d8ddd987`); no visual change while paprika sets no header offset. CSS only: jsdom applies no SFC styles, so no unit test can observe it — covered by the visual check |
| VCST-6744 (VirtoCommerce/vc-frontend#2656), `top-header.vue` / `app-header.vue` | already | `app-header.vue` announcement reads the frame width (merge commit); fork's mega-menu draws its own hairline (`border-t`, `--mega-menu-border-color`) |
| VCST-6237 organization switcher (VirtoCommerce/vc-frontend#2667), `organization-switcher.vue`, `top-header.vue` | already | `header-organizations-menu.vue`: upstream's trigger label key, Escape-from-anywhere, re-mount per open; `header-plate.vue` gates the pod on the `organizations` menu item |
| VCST-6572 / VCST-5918 (VirtoCommerce/vc-frontend#2630, VirtoCommerce/vc-frontend#2635), `bottom-header.vue` | already | ported into `header-plate.vue` in the merge commit: preview attrs, logo width (`useThemeChrome`), theme icons menu, extension `count`, catalog menu closed on deactivate |
| VCST-6572 `useHeaderLogo` / `useFooterLogo` (VirtoCommerce/vc-frontend#2630) | n/a | the theme's `themeLogoUrl` is its design: inverted logo in dark mode always, normal logo on the light footer |
| shared files whose upstream users are replaced (`useNavigations`, `useDarkMode`, `useLanguages`, `useThemeContext` in `routes/main.ts`, `useThemeSnapshot`, `sections.ts`, `modules.ts`, `customer-reviews/constants.ts`, …) | n/a | users are `top-header`, `bottom-header`, `language-selector`, `currency-selector`, the logo composables; `routes/main.ts` gates the loyalty catalog through `useLoyaltySettings` (same conditions); `customer-reviews/constants.ts` only gained a Site Builder section type |

Map changes: `+ useWhiteLabeling.ts` replaces `useHeaderLogo.ts`, `useFooterLogo.ts`; in the merge commit: `organization-switcher.vue` and `organization-list.vue` added to the header entry, `vc-tab-switch-group.vue` removed from the fork-only additions (upstream's now).

## Lost features and deferrals

- **VcTabSwitchGroup pill waiting out the colour-mode view transition** — fork-only behaviour of the replaced component; the slide under the reveal snapshot is no longer seen.

## Checks

| Check | Result |
|---|---|
| validate:types | pass |
| lint | 1 error: prettier in `ui-kit/components/templates/frame/vc-frame.vue`, upstream's file unchanged by the merge (on `M^2` too); 300+ warnings, mostly `sonarjs/null-dereference` |
| test:unit | merge-caused failures fixed (language-selector ×2: the layout barrel now pulls `useWhiteLabeling` → `useThemeSnapshot` into the test, fixed by importing `useLocaleSwitch` directly; `pages/category.test.ts`: the Category stub renders the breadcrumbs slot; `ui-kit/presets/index.test.ts`: two dead menu-item keys dropped from `paprika.dark.json`). Left: first-import timeouts (5s) in `useLanguages.test.ts`, `useNavigations.test.ts`, `useThemeContext.test.ts` and, under full-suite load, a varying set of others — `useLanguages`/`useNavigations` fail the same way on `M^2` alone (48s for 41 tests), pass on `M^1`; all pass sequentially except those |
| root tests (`scripts/design-token-table.test.ts`, `tailwind.config.test.ts`) | pass |
| build-only | pass |
| check-locales | none new |
| build:core-types | regenerated; the contract drops VcTableColumn `strong` (fork-only prop, replaced by upstream's `rowHeader`) |

New tests (`688ca6d77`), each checked by removing the ported line and watching it fail: `header-plate.upstream.test.ts` (extension count, pod gating on multi-org + `organizations` item, item kept out of the row, catalog menu closed on deactivate), `header-organizations-menu.upstream.test.ts` (trigger label, Escape from outside, list re-mounted per open), `app-header.upstream.test.ts` (catalog gating ×2, header height cleared/restored on deactivate/activate, announcement bar), `mobile-header.upstream.test.ts` (menu and search closed on deactivate, announcement bar), `vc-footer.upstream.test.ts` (theme columns first, copyright, credit), `useWhiteLabeling.upstream.test.ts` (`themeLogoUrl`), `useDarkMode.upstream.test.ts` (unknown preset guard), `view-mode.upstream.test.ts`, `header-preferences-menu.upstream.test.ts` (group model), `orders-table.upstream.test.ts` (`rowHeader`), `category-products.upstream.test.ts` (scroll-to-top label). Already guarded by upstream's tests: bottom-header-link external attributes, category breadcrumbs, `shownViewMode`, `productActions`, category-sort. Not testable: bottom-header-link's click guard (vue-router's own `guardEvent` already skips `target="_blank"`).

## Smoke

- Backend: vcst-qa (`B2B-store`), built app via `vite preview` on :3100.
- Anonymous, desktop 1512 and 375: home, catalog, category (breadcrumbs, sort and view rails), product (the product-comparison plugin's action through `productActions`), search, cart, bulk order, `/compare` (served by the plugin), sign-in, sign-up, news — no console errors, error toasts or GraphQL `errors`. One server-error toast was a local `ERR_NETWORK_CHANGED`; gone on reload.
- Signed in (a multi-organization customer; the user signed in): account dashboard, orders (row header bold, segmented All/My orders, round pager), profile, lists, quotes, points history, notifications, security, company info and members — clean. `/account/addresses` redirects to the dashboard for this user: the route guard is unchanged by the merge.
- Organization switcher: one pod (briefcase) after the account button, as before the merge; no duplicate in the links row; accessible name "Organizations: <current organization>"; the list shows every organization with the current one checked; Escape closes it. Screenshots light and dark confirmed by the user.
- Not reachable: Site Builder palette repaint (needs a published Site Builder theme), single-organization user hiding the pod, removing the `organizations` menu item.

## Visual

Engine: `vc-frontend` plugin `visual/` (snap + diff), base `ec10679c4` against head `688ca6d77`, Chromium 150 (the installed headless shell; Playwright's own build was not downloaded).

- Storybook, every story (`affected.mjs` = `ALL`), paprika preset light/dark × 1280/375: 3156 rows, 2810 same, 240 changed (62 stories, all confirmed by the 3× re-shoot), 0 noise, 26 unrendered (3 stories empty on both sides, 14 timeouts that rendered on recheck), 48/32 added/removed (renamed stories).
  - Cause of most changes: the fork's look moved out of the kit into `_paprika*.scss`, which Storybook did not load → fixed in `b13ac9632`; the re-shoot of the 62 stories now shows the paprika look (pills, rings, theme headings, the page's cream ground). The remaining differences against base are Storybook gaining the app's tokens it never loaded before; breadcrumbs are blue as in the app.
  - Upstream-owned, intended: VcLineItems selected edge and cart badge, VcShape / VcCompositeShape / VcVariantPickerGroup sample images (upstream deleted the assets), VcShape white glyph in dark.
- Pages (HAR replay, 11 targets × 1512/375 × light/dark = 44 rows):
  - Regression, every dark page: header logo width and footer column shift — the light logo shown in dark mode. Fixed in `e17beb3d2`; re-shot, header and footer match base.
  - Regression, product page: widget collapse chevron orange instead of the text ink (load order after VirtoCommerce/vc-frontend#2674). Fixed in `7c8d0af9a`.
  - Intended: catalog/category/search sort rail at 375 (tab switch group), `/compare` drawn by the product-comparison plugin, sign-in by email code (VirtoCommerce/vc-frontend#2683).
- Not measured: signed-in pages (checked by hand in the smoke), the cart with items, static pages other than home, Storybook's other presets and the soft design.
- Evidence: `scratchpad/visual/` of the session (diff images, both `visual-diff.json`, confirmation sets); not committed.

## Follow-ups

- none
