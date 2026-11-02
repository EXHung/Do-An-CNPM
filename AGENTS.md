# Engineering requirements

- Keep TypeScript strict. Never hide type errors.
- Authorize every protected operation on the server against current membership.
- Scope resources and relationships to the same workspace.
- Never log secrets, tokens or passwords. Never commit real environment files.
- Check version in the database update predicate; update audit and outbox in the same transaction.
- Do not edit deployed migrations.
- Label prototypes and synthetic metrics clearly. Never represent mock tests as database integration tests.
- Run typecheck, unit tests and build after changes. Report unverified integration explicitly.
