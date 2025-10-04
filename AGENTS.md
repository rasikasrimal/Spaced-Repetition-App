# AGENTS Guidance

## Scope
These instructions apply to the entire repository.

## Workflow Preferences
- Favor the existing npm scripts (`npm run lint`, `npm run test:curve`, etc.) when running checks; avoid inventing new tooling without necessity.
- Keep Tailwind utility usage consistent with surrounding files and prefer semantic component extraction when markup becomes complex.
- Preserve TypeScript strictness by addressing type errors instead of using `any` unless absolutely required.
- When modifying UI, ensure responsive design and maintain accessible semantics (labels, aria attributes, focus states).
- Document notable behavioral changes in PR descriptions and final summaries so reviewers can follow the impact quickly.
