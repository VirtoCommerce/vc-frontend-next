# Upstream merges

One log per upstream merge into this fork, `<YYYY-MM-DD>-<ref>.md`: what conflicted and how it was
resolved, the decisions later merges must keep, the upstream changes ported into the fork's own
components, what was deferred, and what the checks and the smoke test could not reach. The next merge
reads these before it asks anything. `fork-map.json` beside this folder records which upstream files the
fork's components replace.

Written by the `vc-frontend:merge-upstream` and `vc-frontend:port-upstream-to-fork` skills
(VirtoCommerce/ai-tools).

**An upstream merge PR lands as a merge commit — never squash, never rebase.** Either one drops upstream
as a parent, so `git merge-base` stays where it was and the next upstream merge replays every commit
and every conflict of this one.
