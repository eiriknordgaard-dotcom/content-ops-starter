# Eirik Nordgaard FINOP Website

Production website for [eiriknordgaard.com](https://eiriknordgaard.com), built with Next.js and deployed as a static site on Netlify.

## Local development

Use Node.js 20 or newer.

```shell
npm ci
npm run dev
```

## Build runtime

Use the Node.js 24 runtime selected by `.nvmrc`, matching hosted release checks. The production build rejects exports that omit the rendered page content. Lighthouse uses Playwright's installed Chromium so its measurement profile matches the versioned budget.

## Quality checks

Run the full release verification against an isolated local preview:

```shell
npx playwright install chromium firefox webkit
npm run verify:release
```

The browser suite covers Chromium, Firefox, desktop WebKit, and iPhone portrait and landscape profiles. It verifies the primary conversion links, mobile navigation, color theme persistence, the contact workflow, editorial content, and the custom not-found page. Accessibility checks cover critical pages and booking controls. Lighthouse measures three local mobile runs per representative URL and retains reports locally rather than uploading them publicly. See [release quality checks](https://github.com/eiriknordgaard-dotcom/finop-website-operations/blob/codex/approved-development-queue/RELEASE-QUALITY.md) for failure thresholds, isolation rules, report locations, and rollback.

The release runner produces a fake-ID test export. Build the accepted production candidate separately using the established production configuration.

The versioned [performance budget](https://github.com/eiriknordgaard-dotcom/finop-website-operations/blob/codex/approved-development-queue/PERFORMANCE-BUDGET.md) records production and preview baselines, measurement variance, blocking metric thresholds, and the remediation/rebaseline process. `npm run audit:performance-budget` validates the freshly collected Lighthouse reports.

### Safe lead-flow release check

Before a release that touches inquiries or booking, build the static preview and run:

```shell
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST123456 npm run build
npm run test:e2e -- tests/e2e/lead-flow.spec.ts tests/e2e/analytics.spec.ts tests/e2e/booking-modal.spec.ts
```

`lead-flow.spec.ts` checks the contact and booking entry points at desktop and portrait mobile sizes. It verifies required-field and email validation, one simulated contact completion and its tracking event, booking dialog opening and closing by keyboard and button, focus restoration, and a simulated calendar completion. The contact endpoint and Calendly widget are fulfilled in the browser. Analytics, fonts, and all other external traffic are blocked. An unexpected external request fails the test with its method and host/path. The analytics suite separately verifies that a simulated Calendly completion is counted once under the production hostname while still serving local pages and intercepting the widget and analytics loader. The booking suite checks dialog layout and overflow.

The test measurement ID is deliberately fake. Never deploy this local test build to production. These checks do not submit a live contact form, send analytics events, or book an appointment. Review the browser test report and any trace, screenshot, or video before promoting a separately built preview. A green local suite is not proof that third-party services are available in production; keep the read-only production smoke check as a separate release gate.

Recovery: this check changes test code and release instructions only, not public site behavior or business records. If it causes a release failure, revert the lead-flow test commit, rebuild the preview, and rerun the prior suite. Browser traces and screenshots are local diagnostics and are not a substitute for the versioned source checkpoint.

For a performance audit:

```shell
npm run audit:lighthouse
```

## Production monitoring

`npm run smoke:production` checks the live homepage, sitemap, robots file, custom 404 response, Calendly webhook health, and retired-route redirects. A failed scheduled or manual monitor run opens one assigned GitHub issue for the repository owner. Repeated failures update the same issue, and the next successful run records recovery and closes it.

The manual workflow includes a controlled failure option for verifying alert delivery. It runs the live smoke check first, does not submit forms or create appointments, and does not send analytics events.

GitHub Actions runs:

- the complete quality suite on pushes and pull requests;
- a daily production smoke test;
- weekly dependency update checks through Dependabot.

## Deployment

Netlify builds the site with `node scripts/netlify-build.mjs` and publishes `out/`. The build generates and validates SEO files before compiling the static site.

The Calendly webhook and server-side contact conversion tracking require these Netlify environment variables:

- `CALENDLY_WEBHOOK_SIGNING_KEY`
- `GA4_MEASUREMENT_ID`
- `GA4_MEASUREMENT_PROTOCOL_SECRET`

The Calendly webhook uses Netlify Blobs to prevent duplicate conversion events and reports its configuration state at `/api/calendly-webhook`. The contact form submits through `/api/contact-submit`, which records `generate_lead` only after Netlify Forms accepts the message.
