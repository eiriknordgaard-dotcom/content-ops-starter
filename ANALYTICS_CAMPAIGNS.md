# Analytics Campaign Links

Use these short URLs in LinkedIn posts and profile links. Netlify redirects each one to the intended page with consistent GA4 campaign parameters.

| Purpose | Share this URL |
| --- | --- |
| LinkedIn profile website link | `https://eiriknordgaard.com/go/linkedin` |
| General FINOP consulting post | `https://eiriknordgaard.com/go/linkedin/finop-consulting` |
| What does a FINOP do | `https://eiriknordgaard.com/go/linkedin/what-does-a-finop-do` |
| Series 27 vs. Series 28 | `https://eiriknordgaard.com/go/linkedin/series-27-vs-28` |
| Outsourced vs. in-house FINOP | `https://eiriknordgaard.com/go/linkedin/outsourced-vs-in-house` |
| Fractional FINOP | `https://eiriknordgaard.com/go/linkedin/fractional-finop` |
| Audit readiness checklist | `https://eiriknordgaard.com/go/linkedin/audit-readiness` |

## GA4 taxonomy

- `utm_source=linkedin`
- `utm_medium=organic_social`
- `utm_campaign` identifies the business topic.
- `utm_content` identifies the specific destination or content asset.

Do not change the source or medium labels between posts. Consistent labels keep LinkedIn grouped as one acquisition channel while campaign and content fields preserve useful detail.

## Measurement rules verified October 6, 2026

- Contact submissions are delivered independently of GA4. A GA4 lead is sent only after the form accepts the submission and a browser client ID and session ID are available. Missing identifiers must not produce an invented analytics user or an Unassigned conversion.
- Mark manual production testing by visiting `https://eiriknordgaard.com/?internal_traffic=1` in the testing browser. The flag persists there. Use `internal_traffic=0` to clear it. Internal and deploy-preview form submissions do not send server lead conversions.
- The September 14 contact submission was a test and is excluded from qualified-lead reporting. Qualification requires confirmation of a received prospect inquiry; a raw `generate_lead` event alone does not establish client fit.
- Preserve campaign parameters and GA4 identifiers through contact submission. Reporting attribution remains pending until the next real lead appears with session source, medium, and campaign.
- Exception diagnostics include redacted `error_message`, `error_type`, `error_name`, and a script path from the error stack where available. The Error message custom dimension was added to GA4 property 551899102 on October 6. Historical errors with missing parameters cannot be diagnosed retrospectively.
- GA4 engagement time was verified using the real production tag with collection requests intercepted in Chrome, Firefox, and Safari. No browser exception was reproduced during these checks. Small-volume engagement declines alone do not establish a website defect.
- Completed bookings require independent Calendly or calendar confirmation. The free plan does not supply the completion webhook; missing booking data is unavailable, not zero. Do not create test bookings or synthetic leads to fill reports.

## Safe verification

`scripts/audit-analytics.mjs` intercepts analytics collection and contact POSTs while loading the real tag library. `ANALYTICS_AUDIT_BROWSER` supports `chromium`, `firefox`, and `webkit`. No test traffic or submissions reach reporting.

`scripts/validate-lead-payload.mjs` exercises the server lead handler against Google's debug validation endpoint, which does not record events. Supply `NETLIFY_CLI_PATH` for the authenticated CLI entry point. Credentials stay in memory and are never logged.

## Verification: October 7, 2026

- GA4 property 551899102 now has event-scoped Service interest (`service_interest`) and Inquiry entry page (`landing_page`) custom dimensions. Both registrations were confirmed in the live table. These additions make existing collected parameters available for future reporting; they do not repair historical source attribution.
- GA4 Traffic acquisition, September 9 through October 6: 135 sessions, including 10 Organic Search sessions, 7 engaged organic sessions, and 0 organic key events. The single key event is Unassigned. The `generate_lead` detail report records one event; Netlify's contact-form record still lists September 14 as its last submission, consistent with the previously identified test. Do not count it as a qualified inquiry.
- Netlify has five stored contact submissions. The current form metadata lists the original name, email, firm, message, and honeypot fields. This site uses existing registrations with automatic form detection disabled. Do not assume missing fields in the dashboard schema prove that server analytics parameters were dropped. A future real submission is needed to verify the new service-interest field in stored inquiry data.
- Calendly's live account menu confirms Free Plan, with the trial ended. Calendly's current API documentation requires a paid plan for webhooks. Completed-call tracking through the current external-booking/webhook design is unavailable. Booking-link clicks must remain separate from completed bookings. An embedded scheduling window is a possible free alternative, requiring a separate visitor-flow change.
- All five requested paths were confirmed in the live site's main content: Series comparison, role guide, and outsourcing comparison to fractional FINOP; FOCUS preparation guide to FOCUS support; fractional FINOP to FOCUS support. The homepage also links to both commercial pages. Anchor text describes the service or resource. No link repair was needed.
- Google's live `site:eiriknordgaard.com` results showed eight relevant pages. The fractional page title includes Fractional FINOP and Series 28 Consultant; its snippet includes outsourced services and introducing broker-dealers. Google uses body excerpts for some other pages and a different title for the FOCUS guide. This is one signed-in site-search observation, not a target-keyword ranking or universal snippet measurement. No metadata rewrite was warranted.
- Six isolated tests passed: organic entry-page retention, campaign attribution, direct versus referral classification, blocked storage/missing identifiers, internal-traffic exclusion, and accepted/rejected server submission behavior with PII exclusion. The full browser suite could not start because the execution environment denied its local listening port. Live production endpoint probes were unavailable through the permitted tools, so this is not a claim of complete production ingestion verification.

### Next review and handoff

Max: compare the next real `generate_lead` with GA4 session source/medium, campaign, service interest, and inquiry entry page. Review movement in the two guides near page one after October 14; preserve targeting until there is adequate post-change evidence.

Grace: confirm actual inquiry receipt and qualification from the stored message, and confirm completed calls through Calendly. A GA4 event alone does not establish a qualified opportunity.

Steve: if a new inquiry lacks stored service interest, investigate this site's form-registration update procedure. If Eirik chooses embedded booking, implement source-checked completion-event handling, deduplication, internal-test exclusion, accessible loading/closing, and an external-link fallback. Do not introduce a paid subscription without Eirik's spending approval.

### Booking popup release review: October 7, 2026

Eirik approved the on-site booking window. At the time of this review, it was implemented locally and had not yet been published:

- Existing Calendly anchors retain their appearance and fallback destination. Ordinary clicks open a native modal dialog; modifier clicks retain normal browser navigation. Calendly's official JavaScript widget loads only after opening the dialog. The close button, Escape, focus restoration, body-scroll lock, mobile full-height layout, and separate-tab fallback are included.
- `schedule_call_click` remains a click event. `schedule_call_complete` requires `calendly.event_scheduled` from the active iframe and exact Calendly origin. Completion is deduplicated within the open flow and by booking identifier in memory across reopenings. Booking identifiers and invitee payloads are never sent to GA4.
- Completion uses the existing browser session and original entry-page attribution. Internal traffic, preview hosts, and missing GA identifiers do not send a completion event. The embedded flow no longer requests a webhook attribution token, avoiding a parallel completion path. Direct external-tab bookings remain unobservable on the Free plan.
- CSP changes allow only Calendly's frame origin and official widget script origin. The privacy notice describes the new scheduling integration.
- Production build, type check, targeted lint, SEO validation, analytics bootstrap regression, and eight isolated attribution/handler/event-validation tests passed. The updated browser regression includes lazy loading, forged-message rejection, duplicate completion, PII exclusion, closing/reopening, and focus restoration, but could not execute: local ports and browser subprocesses were denied by this environment. Desktop/mobile visual QA and a safely intercepted browser completion test are still required before production publishing. No real bookings or live conversion events were created.

Steve's release check: run the browser test with collection and booking requests intercepted, review the real Calendly widget on desktop/mobile in a preview, and confirm the deployed CSP allows it. Max and Grace should reconcile the next real booking with GA4 session attribution and the calendar; a booking is not automatically a qualified opportunity.

### Booking popup publication: October 7, 2026

- Release event: Netlify production deploy `6ac67628650d007e86379491` was published October 7, 2026 at 9:41:14 AM PDT with the title `Publish verified booking popup`.
- Verification observation: Steve reconfirmed the deploy as ready and active in the production context on October 8, 2026 at 6:31:07 PM PDT.
- Before publication, preview deploy `6ac674ef61834713cad06221` returned HTTP 200 with `X-Robots-Tag: noindex`. Sixteen preview browser checks passed across Chromium, Firefox, WebKit, and iPhone landscape. They covered desktop and mobile sizing, overflow, focus, Escape, close control, backdrop closing, and a simulated completion that produced no live analytics or appointment request.
- Four isolated completion-flow checks passed across the same browser engines. The test accepted one valid active-frame Calendly completion, rejected a forged parent message, deduplicated repeated completion messages, and excluded invitee email and booking identifiers from analytics.
- Twelve production interaction checks then passed with Google Analytics, Calendly, and attribution requests intercepted. No synthetic appointment or live analytics event was created during release verification.
- The deployed CSP permits only Calendly's official frame and widget-script origins needed by the popup. The privacy notice records the integration and its analytics limits.
- Real conversion attribution remains pending. Max should not report completed-booking attribution until a genuine booking can be reconciled between GA4 and Calendly. Grace retains responsibility for confirming whether that booking is a qualified opportunity.
