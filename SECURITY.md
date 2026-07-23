# Security Policy

Awano's security policy: how to report a vulnerability and what to expect after you do. The short version: open a GitHub issue describing what you found. Below are the supported versions, how to report, what happens next, the scope, and the controls already in place.

## Supported versions

Awano is developed as a single active line. Fixes land on `main` and the live demo; older tags are not back-patched.

| Version         | Supported |
| --------------- | --------- |
| `main` (latest) | ✅        |
| `1.0.0`         | ✅        |
| `< 1.0.0`       | ❌        |

## Reporting a vulnerability

Report suspected vulnerabilities by opening a [GitHub issue](https://github.com/chairulakmal/awano/issues/new) on this repository. Awano is a portfolio demo with no production users and intentionally public seed accounts, so a public issue is an acceptable channel here; note that filing one discloses the finding publicly right away.

Include enough to reproduce: the affected route or component, the role and session context, the steps, and the impact you observed. A minimal proof of concept helps most.

## What to expect

Awano is maintained by one person, so these are best-effort timelines, not a contractual SLA:

- Acknowledgement within a few days.
- An initial assessment (confirmed, needs more info, or out of scope) after triage.
- A fix on `main` and the demo once a report is confirmed, with credit in the issue or changelog if you want it.

Please avoid amplifying a confirmed issue more widely (blog posts, social media) until a fix has shipped.

## Scope

In scope: the application code in this repository and its behaviour on the live demo at [awano.chairulakmal.com](https://awano.chairulakmal.com). The highest-value reports are tenant-isolation bypasses, authentication or session flaws, privilege escalation across roles, and stored or reflected XSS.

Out of scope: the demo's seeded accounts are intentionally shared and publicly documented, so signing in with them is not a vulnerability; issues in third-party platforms (Railway, GitHub) belong to those vendors; and volumetric denial of service against the single demo instance is expected to succeed and is not tracked.

## Security posture

The design doc records the controls already in place and the reasoning behind each: server-side session-derived authorization on every mutation, per-query tenant scoping, a role-gated ticket state machine, bcrypt password hashing, login and password-change rate limiting, an upload MIME allowlist, and global security headers. See the Non-functional Requirements, Risks, and Decision Log sections of [docs/SPEC.md](docs/SPEC.md).
