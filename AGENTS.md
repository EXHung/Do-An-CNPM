# Engineering requirements

## Team ownership for SP1

- The user is Phạm Minh Hùng (member 1): frontend, API integration, invitation email via SMTP, browser E2E and demo. Estimated allocation: 35%, difficulty 4/5. Owns `apps/web`, `apps/api/src/mail`, and `tests/e2e`.
- Nguyễn Hoàng Phú (member 2): authentication, sessions/cookies, AuthGuard, auth throttling, shared API infrastructure, account schema, local startup and CI. Estimated allocation: 30%, difficulty 4/5. Owns `apps/api/src/auth`, `apps/api/src/common`, `apps/api/src/database`, `scripts`, and `.github`.
- Phạm Minh Hoàng (member 3): workspace and membership APIs, invitation token lifecycle, RBAC, version checks, transactions, audit/outbox and related schema. Estimated allocation: 35%, difficulty 4.5/5. Owns `apps/api/src/workspaces`.
- Phú and Hoàng coordinate Prisma schema/migrations and backend integration tests. Each member tests their own module; Hùng leads browser E2E, with support from both teammates.
- Hoàng owns invitation creation/validation/acceptance; Hùng owns SMTP delivery, email template, invitation link UI and delivery feedback. Keep this boundary when assigning work.
- These are agreed responsibilities and estimated workload, not verified historical contribution percentages. Use these names and assignments consistently in reports; do not invent completed contributions or commits.

## Engineering rules

- Keep TypeScript strict. Never hide type errors.
- Authorize every protected operation on the server against current membership.
- Scope resources and relationships to the same workspace.
- Never log secrets, tokens or passwords. Never commit real environment files.
- Check version in the database update predicate; update audit and outbox in the same transaction.
- Do not edit deployed migrations.
- Label prototypes and synthetic metrics clearly. Never represent mock tests as database integration tests.
- Run typecheck, unit tests and build after changes. Report unverified integration explicitly.
