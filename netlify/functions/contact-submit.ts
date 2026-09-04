import type { Config, Context } from '@netlify/functions';

declare const Netlify: {
    env: {
        get(name: string): string | undefined;
    };
};

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
        }
    });

const anonymousClientId = async (source: string) => {
    const bytes = new TextEncoder().encode(source);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const view = new DataView(hash.buffer);
    const first = (view.getUint32(0) || 1).toString();
    const second = (view.getUint32(4) || 1).toString();

    return `${first}.${second}`;
};

type Attribution = {
    clientId?: string;
    sessionId?: string;
    source: string;
    medium: string;
    campaign: string;
    landingPage: string;
};

const sendLeadEvent = async (requestId: string, attribution: Attribution) => {
    const measurementId = Netlify.env.get('GA4_MEASUREMENT_ID');
    const apiSecret = Netlify.env.get('GA4_MEASUREMENT_PROTOCOL_SECRET');
    if (!measurementId || !apiSecret) return false;

    try {
        const response = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                signal: AbortSignal.timeout(8_000),
                body: JSON.stringify({
                    client_id: attribution.clientId || (await anonymousClientId(requestId)),
                    timestamp_micros: Date.now() * 1000,
                    events: [
                        {
                            name: 'generate_lead',
                            params: {
                                ...(attribution.sessionId ? { session_id: attribution.sessionId } : {}),
                                source: attribution.source,
                                medium: attribution.medium,
                                campaign: attribution.campaign,
                                landing_page: attribution.landingPage,
                                engagement_time_msec: 1,
                                method: 'netlify_forms',
                                form_name: 'contact-form',
                                lead_type: 'contact_form',
                                event_origin: 'contact_submit_function'
                            }
                        }
                    ]
                })
            }
        );

        return response.ok;
    } catch {
        return false;
    }
};

const contactSubmit = async (request: Request, context: Context) => {
    const measurementId = Netlify.env.get('GA4_MEASUREMENT_ID');
    const apiSecret = Netlify.env.get('GA4_MEASUREMENT_PROTOCOL_SECRET');
    const configured = Boolean(measurementId && apiSecret);

    if (request.method === 'GET') {
        return json({ ok: configured, service: 'contact-form-analytics', configured }, configured ? 200 : 503);
    }

    if (request.method !== 'POST') {
        return json({ ok: false, error: 'method_not_allowed' }, 405);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/x-www-form-urlencoded')) {
        return json({ ok: false, error: 'unsupported_media_type' }, 415);
    }

    const rawBody = await request.text();
    if (rawBody.length > 100_000) {
        return json({ ok: false, error: 'payload_too_large' }, 413);
    }

    const formData = new URLSearchParams(rawBody);
    if (formData.get('form-name') !== 'contact-form') {
        return json({ ok: false, error: 'invalid_form' }, 400);
    }

    const formsResponse = await fetch(new URL('/__forms.html', request.url), {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: rawBody,
        signal: AbortSignal.timeout(8_000)
    });

    if (!formsResponse.ok) {
        console.error(`Netlify Forms returned ${formsResponse.status}. Request: ${context.requestId}`);
        return json({ ok: false, error: 'form_submission_failed' }, 502);
    }

    const spam = Boolean(formData.get('bot-field'));
    const clientId = String(formData.get('ga-client-id') || '');
    const sessionId = String(formData.get('ga-session-id') || '');
    const clean = (name: string, fallback: string) => String(formData.get(name) || fallback).trim().slice(0, 100);
    const attribution: Attribution = {
        clientId: /^\d+\.\d+$/.test(clientId) ? clientId : undefined,
        sessionId: /^\d+$/.test(sessionId) ? sessionId : undefined,
        source: clean('ga-source', '(direct)'),
        medium: clean('ga-medium', '(none)'),
        campaign: clean('ga-campaign', '(not set)'),
        landingPage: clean('ga-landing-page', '/')
    };
    const analyticsTracked = spam ? false : await sendLeadEvent(context.requestId, attribution);
    if (!spam && !analyticsTracked) {
        console.error(`GA4 lead event delivery failed. Request: ${context.requestId}`);
    }

    return json({ ok: true, analyticsTracked });
};

export default contactSubmit;

export const config: Config = {
    path: '/api/contact-submit'
};
