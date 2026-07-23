# Docs

The index for Awano's documentation: what each file is and which files are current versus frozen. Start with `SPEC.md`, the canonical engineering design doc; everything else is either a focused reference or historical. The forward plan and the shipped history live one level up, at the repo root.

## Current

| File | Owns |
|---|---|
| [SPEC.md](SPEC.md) | The engineering design doc: data model, roles and permissions, auth and session, route map, testing, deployment, and the decision log. The source of truth for behaviour. |
| [DESIGN.md](DESIGN.md) | The visual design guide: colour, typography, spacing, and component patterns. The source of truth for how the UI looks. |
| [i18n.md](i18n.md) | Implementation reference for the planned English and Japanese internationalization and mobile-browser support. |
| [dev.md](dev.md) | Local PostgreSQL notes beyond the README quick start. |

## At the repo root

| File | Owns |
|---|---|
| [../README.md](../README.md) | Public description, highlights, local setup, and testing. |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | A guided tour of the key design decisions with file paths. |
| [../SECURITY.md](../SECURITY.md) | The security policy: supported versions, how to report a vulnerability, and scope. |
| [../TODO.md](../TODO.md) | The forward plan: what we intend to build next, currently focused on the UI/UX revamp. |
| [../CHANGELOG.md](../CHANGELOG.md) | What has shipped, newest first. |

## Archive

Frozen point-in-time artifacts, kept for reference. Not maintained.

| File | Was |
|---|---|
| [archive/REVIEW.md](archive/REVIEW.md) | The pre-Playwright code review before v1 was called done; findings resolved. |

The v1 build logs that used to live here (`PLAN.md`, `PLANv1.md`) were absorbed: shipped items into [../CHANGELOG.md](../CHANGELOG.md), the i18n and mobile plan into [i18n.md](i18n.md). Their originals remain in git history.
