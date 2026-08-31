# Eirik Nordgaard FINOP Website

Production website for [eiriknordgaard.com](https://eiriknordgaard.com), built with Next.js and deployed as a static site on Netlify.

## Local development

Use Node.js 20 or newer.

```shell
npm ci
npm run dev
```

## Quality checks

Run the full pre-deployment verification:

```shell
npm run check
npm run build
npx playwright install
npm run test:e2e
```

The browser suite covers Chromium, Firefox, WebKit/Safari, and an iPhone landscape profile. It verifies the primary conversion links, mobile navigation, color theme persistence, the contact workflow, editorial content, and the custom not-found page.

For a performance audit:

```shell
npm run audit:lighthouse
```

## Production monitoring

`npm run smoke:production` checks the live homepage, sitemap, robots file, custom 404 response, Calendly webhook health, and retired-route redirects.

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
