# SEO Action Report: September 14, 2026

## Scope

Investigate FOCUS service-page indexing, improve the two promising guides, verify organic conversion attribution, and preserve keyword strategy. Backlink outreach was excluded. Homepage copy, navigation layout, URLs, primary keyword targets, and PDF access requirements were unchanged.

## Indexing Investigation

The production FOCUS service page returns HTTP 200. Its canonical matches the trailing-slash production URL. It is present in the production sitemap, footer, and FOCUS guide. No page-level or response-header noindex exclusion was found.

Search Console's indexed-URL view reports the URL as unknown and not indexed. Its aggregate indexing report is stale, dated September 3. Neither should be blended into a claim that indexing has completed.

Google's September 14 live test confirmed "URL is available to Google" and "Page can be indexed," with one valid breadcrumb item. One indexing request was submitted. Google confirmed the URL was added to a priority crawl queue. Actual indexing remains pending; repeated requests will not improve its priority.

## Guide Improvements

The FOCUS guide's disclosed searches include FOCUS report, FOCUS reporting, FOCUS report instructions, and what is a FOCUS report. Updates add a direct workflow summary, acronym definition, instructions-and-deadlines FAQ, preparation exceptions, and contextual links to FOCUS support and ongoing FINOP coverage.

The Series comparison guide discloses only two query impressions, for fin 28 and series 27. Its page-average rank is not a confirmed rank for the full comparison keyword. Updates add a concise scope comparison, official Series 27 source, firm-profile questions before choosing coverage, and a direct outsourced Series 28 services link.

Page titles and primary metadata targets were retained. Modification dates and sitemap lastmod entries changed only for the two edited guides. Regulatory facts were checked against FINRA's Series 27, Series 28, and eFOCUS resources.

## Conversion Measurement

GA4 acquisition, August 17 through September 13: 28 sessions, including 3 Organic Search sessions, with 0 organic key events. The Events report records 2 generate_lead and 2 schedule_call_complete events. Acquisition attributes all 4 key events to Unassigned. These may include earlier testing and do not prove qualified or SEO-generated leads.

Both production conversion health endpoints report configured. Contact leads are delivered server-side after successful form acceptance. Booking completions use the signed Calendly webhook, separately from booking-link clicks. The PDF remains ungated; resource_download measures engagement, not an email lead.

A regression test uncovered a timing bug: attribution was captured after asynchronous GA identifier retrieval, allowing fast internal navigation to replace the original landing page. The fix captures source and landing-page attribution before waiting for identifiers.

Tracking now includes service_detail_click for the two service pages and resource_click for the FOCUS guide. These measure the guide-to-service funnel without counting navigation as a completed lead.

Local tests intercept analytics, form, and calendar requests. No real booking or synthetic production lead was created. Server tests verify attribution, exclusion of contact PII from GA payloads, and that spam or rejected submissions do not trigger lead conversions.

## Ongoing Review

The existing Search Console monitor remains active and unchanged. Keep targeting stable and compare equal periods when enough data exists. Watch for service-page indexing, the first disclosed commercial FINOP click, top-10 guide-query movement, and genuinely attributed organic contacts or bookings. Do not infer causation from outreach traffic or label every conversion event a qualified lead.

## Release Verification

Published to https://eiriknordgaard.com/ on September 14. Production deploy ID: 6aa80ded94dbcab050db18b8. Final preview: 6aa80daed5c01b9d1de44d71.

- Production build and TypeScript compilation passed.
- ESLint passed with zero warnings; git diff whitespace verification passed.
- SEO checks passed for all nine indexable pages, including Markdown internal links.
- All 44 browser tests passed across Chromium, Firefox, WebKit, and iPhone landscape.
- Server conversion test passed, covering accepted, spam, rejected, and invalid-form submissions without contacting real analytics services.
- Preview smoke checks passed. Draft noindex headers and absent production-only conversion secrets are expected; preview mode checks those separately from production.
- Live production smoke checks passed: page responses, sitemap, robots, redirects, canonical URLs, absence of noindex exclusions, GA4 measurement ID in the app bundle, and both configured conversion endpoints.
- Both edited guides were fetched from the production domain and their new content verified.

Remaining external outcomes: Google must process the indexing request, and real organic visitors must arrive and convert. The landing-page fix applies to future activity and cannot reconstruct historical Unassigned conversions.

## Sources Checked

- [FINRA Series 27](https://www.finra.org/registration-exams-ce/qualification-exams/series27)
- [FINRA Series 28](https://www.finra.org/registration-exams-ce/qualification-exams/series28)
- [FINRA eFOCUS](https://www.finra.org/filing-reporting/regulatory-filing-systems/efocus)
- [Google Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
