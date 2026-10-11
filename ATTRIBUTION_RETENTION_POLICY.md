# Website Attribution Retention and Diagnostics Policy

Status: Recommended for Managing Partner approval

Prepared: October 11, 2026

Owners: Managing Partner, Max for marketing use, Steve for technical controls

## Purpose

Retain enough website attribution evidence to understand which marketing activity produces genuine inquiries and completed bookings, while minimizing personal data, storage duration, and diagnostic exposure.

This policy describes the approved target. It does not itself change tracking, delete records, or create a cleanup process. Any code, Netlify, Google Analytics, Calendly, or form-retention change requires a separate approved development ticket.

## Principles

1. Collect only what is needed to connect a website session with a contact submission or completed booking.
2. Do not copy contact names, email addresses, message text, firm names, full query strings, Calendly booking identifiers, or secrets into analytics or diagnostic records.
3. Keep raw records for the shortest period that supports attribution, troubleshooting, and legitimate inquiry follow-up.
4. Prefer aggregate reporting after the diagnostic window closes.
5. Limit access by role and only for a current business or technical need.
6. Treat deletion from one system as incomplete until the applicable copies in other systems are considered.

## Current data inventory

| Location | Fields or content | Current effective retention | Current access path |
| --- | --- | --- | --- |
| Browser session storage | source, medium, campaign, landing page | Browser session; no server copy from this storage alone | Visitor's browser and site JavaScript |
| Contact request and Netlify form record | name, email, optional firm, service interest, message, honeypot, GA client ID, GA session ID, traffic type, source, medium, campaign, landing page | Netlify retention not verified in this review | Netlify account users with form access |
| GA4 contact event | GA client ID, session ID, source, medium, campaign, landing page, service interest, whether a firm was provided, method and event origin | Property retention setting not verified in this review | Authorized GA4 users |
| GA4 booking event | GA client ID and session ID when available, source, medium, campaign, landing page, method and event origin | Property retention setting not verified in this review | Authorized GA4 users |
| Netlify Blob store `analytics-attribution` | token, GA client ID, session ID, source, medium, campaign, landing page, creation time | Used records are deleted after successful webhook processing; records older than 24 hours are deleted only when read; unused records can remain indefinitely | Netlify platform and server-side functions |
| Netlify Blob store `calendly-webhook-events` | hashed event key, processing time, event type | No expiration or cleanup is currently implemented | Netlify platform and server-side functions |
| Function logs | request ID and generic delivery or configuration errors | Provider retention not verified in this review | Authorized Netlify users |
| Repository analytics audits | Redacted aggregates and test evidence | Retained in source history | Repository users |

The current embedded booking flow records completion directly from a validated Calendly frame message and does not call `/api/analytics-attribution`. The older endpoint remains deployed and can still accept structurally valid public requests. Netlify Blobs do not expire automatically.

## Recommended retention schedule

| Record | Recommended duration | Deletion behavior |
| --- | --- | --- |
| Browser session attribution | Current browser session | Allow session storage to clear with the browser session. Do not move it to persistent browser storage. |
| Unused server attribution token | Maximum 24 hours | Delete automatically after expiration, including tokens never read by the webhook. |
| Used server attribution token | Until successful booking-event handling | Delete immediately after the event is accepted by GA4. |
| Calendly duplicate-event marker | 30 days | Delete automatically after 30 days. This is long enough for ordinary retry diagnosis without indefinite growth. |
| Function diagnostic log | 30 days, or the shorter provider default | Do not create a separate long-term copy. Retain a redacted incident summary when a material failure needs a durable record. |
| GA4 event-level user data | 2 months | Set the GA4 property to the shortest event-data retention option that still supports monthly review. Preserve aggregate reports rather than extending user-level retention. |
| Unqualified or abandoned contact submission | 12 months from last meaningful activity | Delete after the period unless a legal, contractual, or documented business need requires longer retention. |
| Spam or clearly irrelevant submission | 30 days after classification | Delete once no longer needed for spam review or troubleshooting. |
| Inquiry that becomes a client or active engagement | Move necessary information to the approved client or business record, then delete the redundant website-form copy within 90 days | Client and engagement records follow their applicable operational and legal retention policy, not this website-attribution policy. |
| Redacted attribution report | 24 months | Retain only aggregate counts and non-identifying campaign results needed for year-over-year marketing decisions. |

The recommended 12-month inquiry window is proportionate for a low-volume business-to-business practice. It supports a realistic follow-up cycle without keeping dormant website inquiries indefinitely. The Managing Partner should approve or adjust the 12-month, 2-month, and 30-day periods before implementation.

## Access policy

- Managing Partner: full business oversight and approval of retention exceptions.
- Max, Marketing Manager: GA4 and redacted attribution reporting needed to evaluate channels and qualified demand. No routine access to message text is required.
- Grace, Operations Manager: contact submissions needed to route, respond to, and reconcile inquiries. No routine access to raw GA identifiers is required.
- Steve, Development Manager: Netlify, function logs, Blob metadata, and redacted submission evidence only when diagnosing an active issue or implementing an approved change.
- Sterling, Sales Manager: qualified lead source and campaign summary when needed for pipeline review, not raw technical identifiers.
- Other users: no access unless the Managing Partner approves a defined need and duration.

Access should use named accounts with the minimum practical role. Attribution exports must not be placed in email, public repositories, screenshots, or general-purpose documents when aggregate evidence will answer the question.

## Minimum conversion diagnostics

The following fields are sufficient for most attribution and delivery investigations:

- event type: contact submission or completed booking
- UTC timestamp rounded to the minute
- deploy context and deploy ID
- request ID
- HTTP result category
- accepted, excluded, duplicate, or failed outcome
- exclusion reason: spam, internal traffic, preview, missing identifier, or invalid request
- source, medium, campaign, and landing-page path, each length-limited
- service-interest category for contact submissions
- firm-provided boolean, without the firm name
- GA4 delivery success or failure
- whether client and session identifiers were present, without displaying the identifiers in ordinary reports

Do not include:

- name, email address, firm name, or message text
- IP address or precise location
- complete referrer or landing URLs with query strings
- GA client ID or session ID in ordinary logs, tickets, or reports
- Calendly invitee URI, event URI, booking answers, or booking email
- webhook signatures, API secrets, environment values, or raw request bodies

When a unique identifier is necessary to correlate duplicate webhook delivery, use a one-way hash and restrict it to the diagnostic window.

## Deletion and request handling

1. A routine cleanup process should delete expired Blob records without reading or exporting their contents.
2. Deletion must target the correct production store. Preview testing must use deploy-specific stores and must never delete site-wide production data.
3. A privacy request should be coordinated by the Managing Partner or Grace. Search systems that can be identified from the request, including Netlify Forms and Calendly. GA4 identifiers generally cannot be derived reliably from an email address and must not be guessed.
4. Record the systems checked, the action taken, the date, and the operator. Do not copy the underlying personal data into the deletion log.
5. Legal, regulatory, contractual, or dispute-related holds override routine deletion only when documented and approved.

## Current gaps

1. Netlify Blob attribution tokens have no automatic cleanup. Expired tokens are deleted only if a webhook later reads them.
2. The legacy public attribution endpoint remains deployed even though the current embedded booking flow does not use it.
3. Calendly duplicate-event markers have no expiration.
4. The GA4 property retention setting was not verified during this review.
5. Netlify form-submission retention and deletion routines were not verified during this review.
6. No operating report currently confirms that cleanup completed or that storage growth remains bounded.

These are control gaps, not evidence that attribution data was misused or exposed.

## Required follow-up ticket

Create a separate development ticket after the Managing Partner approves the retention periods. Its scope should be limited to:

- confirm whether `/api/analytics-attribution` can be retired; otherwise add request-size, abuse, and origin controls
- implement automatic deletion of attribution tokens older than 24 hours
- implement automatic deletion of duplicate-event markers older than 30 days
- use deploy-specific stores for preview tests and protect the site-wide production stores
- verify the configured GA4 retention setting and document the approved value
- document and test the Netlify form deletion procedure without deleting current records during verification
- add redacted diagnostics and storage-count checks without logging personal data or raw identifiers
- test expiration, duplicate delivery, malformed requests, and cleanup without sending live GA4 events or creating appointments

The follow-up ticket must preserve the public website design and existing conversion behavior unless a separate change is approved.

## Approval record

Before this policy becomes operational, record:

- approval or revision of the 12-month inquiry retention period
- approval or revision of the 2-month GA4 event-data retention period
- approval or revision of the 24-hour token and 30-day duplicate-marker periods
- the named owner for monthly deletion review until automation is verified
- the approved implementation ticket ID
