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
