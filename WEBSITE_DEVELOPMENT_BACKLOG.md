# Website Development Baseline and Backlog

Owner: Steve, Development Manager

Reviewed: September 14, 2026

## Scope and authority

Maintain the existing Next.js static website hosted on Netlify. Preserve approved landing-page visuals and messaging. Max owns content and SEO strategy; Steve owns implementation and verification. New costs, destructive actions, material scope changes, and unapproved visual changes require Managing Partner authorization. Synced project sources are read-only. Do not use em dashes.

This review made no website implementation or hosting changes. Existing local SEO and analytics changes were preserved. This document is the only authored change from the review. Builds and tests regenerated ignored local artifacts; the final local test build uses a dummy GA4 identifier and must not be uploaded to production.

## Verified baseline

- Production: https://eiriknordgaard.com/.
- Netlify project: silver-sable-95cae8, ID 794fc56d-bfb6-439c-8e78-56bafe846d07.
- Published production deploy: 6aa80ded94dbcab050db18b8, ready, published September 14 at 15:08:40 UTC. This manual deploy has no recorded commit reference.
- Repository: https://github.com/eiriknordgaard-dotcom/content-ops-starter. Remote main is 741081ae0e0d314fad27693b9a7b27a0f0e14574. Local HEAD is 7339902 with additional uncommitted SEO and analytics work.
- Next.js 16.3.4, React 19.2.8, static export to out/, trailing-slash URLs. npm and package-lock.json are the canonical package-management workflow.
- Nine sitemap pages return 200 with one H1, matching production canonicals, and no response-header noindex exclusions. Local SEO validation passes.
- Production smoke test passes, including rendered HTML, redirects, sitemap, robots, GA4 bundle identifier, and configured contact and Calendly endpoints.
- Chromium, Firefox, and WebKit live probes at 320x740, 393x852, 430x932, 852x393, 768x1024, 1024x768, and 1440x900 found no horizontal overflow or uncaught page errors. Mobile menu aria-expanded toggled correctly. These are browser-engine/viewport simulations, not physical-device certification.
- Checklist remains ungated. Its PDF returns 200 with application/pdf. No checklist email inputs are present.
- Build, TypeScript, ESLint, SEO checks, GA bootstrap regression check, and mocked server conversion test pass.
- Fresh local desktop Lighthouse results: homepage and fractional FINOP page score 99 performance and 100 accessibility, best practices, and SEO; role guide scores 100 in all four categories. LCP is 0.9s, 1.0s, and 0.6s respectively. These are single-run local lab results, not production field or mobile-user measurements. No Lighthouse reports were uploaded externally.
- Browser suite: 40/44 pass when the GA build identifier is absent; 44/44 pass when built with NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST123456. Google Analytics, attribution writes, form submissions, and bookings are intercepted in conversion tests.
- Production uses G-JKBTSP4HK1, not the dummy test identifier. Service-detail event instrumentation is present in the live bundle.
- Security headers are present on production pages. Calendly code checks signed payloads and timestamp freshness before processing. Contact analytics payloads exclude contact names, emails, and messages in the mocked server test.
- GitHub's scheduled production monitor has successful daily runs September 7 through September 13. It is a daily check, not continuous uptime monitoring, and actual scheduler execution was later than the requested time.
- Latest dependency PR quality run passed on September 14. Eight dependency PRs are open. Remote main is not protected.
- Netlify Forms registrations exist: contact-form has five recorded submissions, retired finop-checklist-download has one. Counts do not establish genuine leads or email delivery; no submission contents were inspected.

## Urgent repairs

No live outage or broken primary conversion path was established in this review. The first two backlog items are high-priority release safeguards, not claims of current visitor-facing failure.

## Prioritized backlog

### P1: Reconcile production and version control

Production contains September 14 changes absent from remote main. Local changes include two guides, sitemap dates, SEO validation, production checks, analytics instrumentation, attribution timing, and new tests. Local commit 7339902 is also absent from remote main. A future Git-triggered deployment can overwrite the manually deployed improvements.

Next action: reconcile the SEO task's approved release with its source, review existing changes without discarding them, commit/push the complete verified implementation, and associate future releases with commit IDs. Compare live content after deployment. Add a concise release ledger and rollback instructions.

Acceptance: production behavior is reproducible from a recorded remote commit; all checks pass for that commit; recovery identifies a previous ready deploy. Verify recovery in a preview before claiming a tested rollback procedure.

### P1: Make CI exercise the complete current test suite

The workflow executes individual checks, not npm run check, so scripts/check-analytics-bootstrap.mjs is omitted. The new contact server test is not wired into CI. New production-host simulation tests require a GA4 build identifier, but CI supplies none. The server test directly imports TypeScript; the configured CI Node 20 environment cannot run it the same way as this review's Node 24 runtime.

Next action: supply an explicitly dummy build identifier in CI, include the bootstrap and server checks, and choose a compatible compiled-test path or deliberately standardize/test the supported Node runtime. Do not put secrets in CI solely to run mocked tests. Consider required checks before production deployment and main-branch protection, after verifying account/repository capabilities.

Acceptance: a clean checkout passes the full documented checks without production credentials. Bootstrap, attribution, failed submissions, and booking completion distinctions are exercised. A failed required test prevents the agreed release path.

### P2: Harden contact submission validation and failures

The endpoint validates form-name, content type, and a coarse payload size but does not validate required name, email, or message. A local mocked request containing only form-name=contact-form returns success when the upstream mock accepts it. The Netlify forwarding fetch lacks a controlled catch for timeout/network errors. The browser has validation, but direct requests bypass it.

Next action: add proportionate server field validation, field-length limits, explicit upstream-failure handling, and regression tests. Review duplicate/retry behavior. Preserve genuine submissions and do not turn analytics failure into a lost inquiry.

Acceptance: malformed requests are rejected before forwarding or lead tracking; upstream timeouts produce a safe response; valid submissions still work. Distinguish the explicit honeypot check from Netlify's separate spam classification.

### P2: Verify the operational handoff and alerts

Health endpoints confirm secrets are configured, not that email notifications arrive, Calendly's webhook subscription remains active, or a person owns failed-monitor alerts.

Next action: coordinate with Grace to document destination, ownership, spam-review handling, and response workflow. Verify GitHub failure notification routing. Arrange one agreed end-to-end contact test with recipient confirmation and verify booking delivery through an authorized test or genuine booking evidence.

Acceptance: a submission is recorded, notification received, and ownership acknowledged. No synthetic production lead or real appointment is created without agreement. Do not advertise guaranteed delivery or operating backups without evidence.

### P2: Bound public analytics storage and retention

The public attribution endpoint writes a new Blob for each structurally valid request. Code has no visible request-body limit, origin restriction, rate limit, or cleanup for unused tokens. The webhook expires attribution only when a token is read; unused entries can remain indefinitely. Processed webhook markers also have no documented retention policy. Check-then-write duplicate protection is not atomic under simultaneous deliveries.

Next action: assess actual volume and platform controls, add proportionate abuse protection and retention cleanup, and test expired tokens and duplicate deliveries without real GA events. Coordinate retention with the firm's approved privacy policy. This is a code-level risk assessment, not evidence of exploitation.

Acceptance: storage growth is bounded; expired unused records are removed; controls do not block genuine bookings; duplicate-event limitations are documented or addressed.

### P2: Document effective hosting configuration and recovery

netlify.toml specifies node scripts/netlify-build.mjs and out/. Saved dashboard build settings still report npm run build and .next; the file is the intended configuration override. Production is currently correct, but the difference should be explicit in the runbook.

Netlify processing_settings.ignore_html_forms is true. Existing registered forms remain usable, but ordinary automatic-discovery instructions do not describe this site's special configuration. Keep the existing static-export adapter-skip arrangement unless a separately verified framework migration is needed. Verify its actual environment scope before future releases. Do not re-enable form discovery or delete registrations casually.

Next action: document build precedence, adapter-skip setting, forms registration/schema-change procedure, production-only secrets by name, preview checks, release verification, rollback limits, and inquiry export/recovery responsibilities. Git source history is not an independent backup of submissions or account configuration.

Acceptance: another engineer can reproduce a preview, release, and recover the site without exposing secrets or stripping rendered pages. No backup/export process is called operational until configured and tested.

### P3: Review dependency PRs in controlled batches

Eight PRs are open, including a routine grouped update and several major-version changes. A green old-branch check does not replace testing against the reconciled current source.

Next action: review compatible security/patch changes first, rerun current checks, and defer major styling/tooling migrations unless justified. Refresh the vulnerability audit before claiming a clean dependency tree; this review did not rerun a vulnerability audit.

Acceptance: updates are tested against current source, with no unapproved visual changes and a recorded recovery path.

### P3: Broaden recurring QA without redesign

Current desktop Lighthouse checks cover three pages with one desktop run. Performance and best-practice thresholds are warnings rather than release blockers. Automated viewport probes are not a manual keyboard/screen-reader or physical Mobile Safari audit.

The fresh Lighthouse collection completed but warned that the configured Local: server-readiness pattern timed out. Investigate readiness matching so successful runs do not waste startup time or accidentally target an already-running server.

Next action: add representative portrait/mobile and checklist coverage, keyboard/focus and reduced-motion tests, privacy-storage-denied behavior, and multi-run mobile performance checks. Schedule occasional physical iPhone Safari verification and use baseline-supported budgets rather than arbitrary tightening.

Acceptance: representative pages remain usable across themes, input methods, motion preferences, and supported devices, without animation hiding essential content.

## Missing access or information

- Netlify project and public GitHub workflow data were accessible. No login blocker prevented this baseline.
- Mailbox receipt, notification settings/destination, Calendly subscription status, and real GA4 ingestion were not directly verified. Coordinate appropriate access/evidence with Grace and Max rather than requesting shared passwords.
- Confirm who receives failure alerts and owns lead follow-up; establish any inquiry retention/export policy before implementing it.
- Physical-device Safari verification requires device access or Managing Partner-assisted observation.
- Google indexing remains an external outcome owned with Max. The existing SEO report records a September 14 indexing request for the FOCUS service page; this review does not independently claim the page is indexed.

## Recommended next action

Complete release reconciliation and CI reproducibility first. Then harden contact validation and document/verify the operational handoff. No new spending, new landing-page section, or redesign is recommended. No immediate Managing Partner decision is needed to investigate these technical items; decisions are needed before new spending, destructive changes, or policy choices.
