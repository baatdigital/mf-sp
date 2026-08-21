# ISS-43 — mf-sp public visibility blocks self-hosted CI runners

## Symptom

Jobs on `mf-sp` queued forever with idle runners, correct labels
(`self-hosted, holding`), workflows `active`, and Actions permissions
identical to repos that do run successfully.

## Root cause

```
mf-sp        → runner_group_id: 0, runner_group_name: ""    (never assigned a group)
mf-marketing → runner_group_id: 1, runner_group_name: "default"

mf-sp:        visibility=public
mf-marketing: visibility=private   (same as mf-settings, mf-auth, and the rest)

runner group "Default" (id=1): visibility=all, allows_public_repositories=false
```

GitHub never hands self-hosted runners to a public repo while its runner
group has `allows_public_repositories: false`. This is the org's policy
working as intended, not an outage.

## Mitigation already applied (no further action needed here)

`ci.yml` on `develop` and `main` (commit `b8c3ce3`) switched the required
check to `runs-on: ubuntu-latest` — a GitHub-hosted runner, which public
repos do get. CI runs again; nothing in this PR changes that.

## What is NOT done, and why

`allows_public_repositories: true` on the `Default` runner group is
explicitly out of scope: it would hand self-hosted runners — which carry
AWS credentials, deploy keys, and build money-path services — to every
public repo in the org, including any fork's workflow. That is a policy
change with org-wide blast radius, not a fix for this one repo.

## Recommendation (owner decision, not executed by this change)

Flip `mf-sp` to **private**, matching its 20 sibling `mf-*` repos. `mf-sp`
is one of only 2 public repos in the org (the other is `.github`, expected).
It has 0 forks and 0 stars, so nothing external depends on it being public —
everything points to it being public by accident. Making it private lets CI
go back to the shared self-hosted runners and closes an exposure nobody
decided on, without touching the runner group policy that protects every
other repo.

This is a repo-visibility change (`gh repo edit baatdigital/mf-sp
--visibility private`), left to the repo owner to execute.
