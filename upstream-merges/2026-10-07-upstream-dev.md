# upstream/dev into dev — 2026-10-07

- Range: `702d1c1c7`..`2b75c7de7` (2 upstream commits, up to "2.60.0")
- Merge commit: `e139ac984`; ports: none
- PR: opened from `chore/merge-upstream-upstream-dev` — lands as a merge commit, never squash or rebase

## Decisions that carry forward

- **The root `package.json` keeps the fork's own version** (3.0.0 since `58382f95e`), never upstream's
  release number. This replaces the rule in `2026-10-07-origin-dev.md` that the root version follows
  upstream "while the fork sets no version of its own": the fork now versions on its own track, and
  taking upstream's would move it backwards (3.0.0 → 2.60.0). User.
- **`core-api/package.json` takes the higher version** (unchanged from the earlier log; not touched in
  this range).

## Conflicts

| File           | Fork                        | Upstream       | Resolution       | Decided by |
| -------------- | --------------------------- | -------------- | ---------------- | ---------- |
| `package.json` | version 3.0.0 (`58382f95e`) | version 2.60.0 | the fork's 3.0.0 | user       |

## Clean merges checked

- `backend-packages.json` — platform 3.1073.0 → 3.1076.0, module bumps, the SalesRep/XCart/Cart PR-build
  blobs replaced by released versions (VirtoCommerce/vc-frontend#2547). The fork never changed it.
- `core/api/graphql/types.ts`, `modules/sales-rep/api/graphql/types.ts` — regenerated upstream against
  the new backend; taken as they are, the fork never changed them.
- `core/api/graphql/account/queries/requestPasswordReset/` — deleted upstream (the backend dropped the
  deprecated field; `sendPasswordResetEmail` replaces it). Nothing in the fork imports it.
- Line trace (step 5): every line upstream added is in the merge, except `"version": "2.60.0"`.

## Ports (vc-frontend:port-upstream-to-fork)

| Upstream change                                                     | Verdict | Fork file / evidence                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend packages and GraphQL types (VirtoCommerce/vc-frontend#2547) | n/a     | section B: `types.ts` is also used upstream by `currency-selector.vue`, which the fork replaces; the change is generated types only, none touching currency, and `useLocaleSwitch` imports the same file |

Map changes: none. Sections A and C had no upstream changes in this range; D and E empty.

## Lost features and deferrals

- Ship-to selector and organization switcher — still as in `2026-10-07-origin-dev.md`; upstream did not
  touch them in this range.

## Checks

| Check          | Result                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| validate:types | pass                                                                                         |
| lint           | 30 errors, the same 30 on the fork's parent (`origin/dev`); none in files this merge changed |
| test:unit      | 3722 pass (239 files)                                                                        |
| check-locales  | pass                                                                                         |
| build-only     | pass                                                                                         |

New tests: none — no ported behavior.

## Smoke

- Backend: `https://vcst-qa.govirto.com`, `vite preview` on 3100, signed out.
- Checked: home, `/catalog`, `/search?q=hat`, a product page, `/cart`, `/sign-in`, `/forgot-password`.
  26 GraphQL responses, none with `errors`; no alerts, no overlay. Console: a QA catalog image on an
  unresolvable host and one 404 resource — data, not code.
- Not reachable: the password-reset email (submitting the form sends mail), signed-in flows against the
  new backend packages.

## Follow-ups

- None.
