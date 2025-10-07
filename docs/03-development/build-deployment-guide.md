# Build and Deployment Guide

## Prerequisites
- Node.js 20 LTS (match `.nvmrc` if present).
- npm 10+.
- Modern browser for manual verification.
- Access to deployment platform (e.g., Vercel or container registry).

## Local development
```bash
npm install
npm run dev
```
- Development server runs at `http://localhost:3000`.
- Hot reloading is enabled through Next.js.

## Quality gates
Run before pushing changes:
```bash
npm run lint
npm run test:visual
```
- `npm run lint` executes ESLint + TypeScript checks.
- `npm run test:visual` runs Playwright smoke tests to ensure key flows render.

## Production build
```bash
npm run build
npm run start
```
- `npm run build` generates the production bundle and optimises assets.
- `npm run start` launches the Next.js server on port 3000 for smoke verification.

## Environment configuration
The app is local-first and typically requires no environment variables. Optional overrides:
- `NEXT_PUBLIC_BASE_PATH` – Adjust base path when deploying under subdirectories.
- `NEXT_PUBLIC_ANALYTICS_ID` – Instrument analytics (if adopted later). Ensure privacy policy reflects any tracking.

## Deployment options
### Vercel
1. Connect repository to Vercel project.
2. Configure build command `npm run build` and output directory `.next`.
3. Enable Preview deployments for feature branches; require checks before production promotion.

### Container image
1. Use the provided Dockerfile (if present) or base on `node:20-alpine`.
2. Install dependencies, run `npm run build`, and prune dev dependencies if desired.
3. Run `npm run start` in production environment.
4. Expose port 3000 and configure health checks.

### Static export (partial)
- Selected routes using the App Router may support static export via `next export`. Validate functionality before adopting this approach.

## Deployment checklist
- [ ] Update documentation and changelog.
- [ ] Confirm CI pipeline passes on the release branch.
- [ ] Smoke-test production build locally (`npm run build && npm run start`).
- [ ] Verify theme toggle, review flow, and timeline interactions in both themes.
- [ ] Publish release notes and notify stakeholders per communication plan.

## Rollback plan
- Retain previous deployment artefact or Vercel build to allow one-click rollback.
- If issues arise, revert the offending commit on `main` and redeploy last known good version.
- Document incident and mitigation steps in `docs/04-testing/qa-report.md` and `docs/05-operations/maintenance-plan.md`.

## Monitoring
- Track production health through platform dashboards (Vercel analytics, container metrics) if enabled.
- Collect user feedback via GitHub issues and support channels.
- Schedule periodic reviews of dependency vulnerabilities.
