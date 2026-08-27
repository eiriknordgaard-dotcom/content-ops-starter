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

const safeEqual = (left: string, right: string) => {
    if (left.length !== right.length) return false;

    let mismatch = 0;
    for (let index = 0; index < left.length; index += 1) {
        mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }

    return mismatch === 0;
};

const verifyCalendlySignature = async (body: string, header: string, signingKey: string) => {
    const parts = header.split(',').map((part) => part.trim());
    const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) || '';
    const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3).toLowerCase());
    const timestampSeconds = Number(timestamp);

    if (!timestamp || !Number.isFinite(timestampSeconds) || signatures.length === 0) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) return false;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(signingKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const digest = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`))
    );
    const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return signatures.some((signature) => safeEqual(signature, expected));
};

const anonymousClientId = async (source: string) => {
    const bytes = new TextEncoder().encode(source);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const view = new DataView(hash.buffer);
    const first = (view.getUint32(0) || 1).toString();
    const second = (view.getUint32(4) || 1).toString();

    return `${first}.${second}`;
};

export default async (request: Request) => {
    if (request.method === 'GET') {
        return json({ ok: true, service: 'calendly-booking-analytics' });
    }

    if (request.method !== 'POST') {
        return json({ ok: false, error: 'method_not_allowed' }, 405);
    }

    const signingKey = Netlify.env.get('CALENDLY_WEBHOOK_SIGNING_KEY');
    const measurementId = Netlify.env.get('GA4_MEASUREMENT_ID');
    const apiSecret = Netlify.env.get('GA4_MEASUREMENT_PROTOCOL_SECRET');

    if (!signingKey || !measurementId || !apiSecret) {
        console.error('Calendly analytics environment is incomplete.');
        return json({ ok: false, error: 'service_unavailable' }, 503);
    }

    const rawBody = await request.text();
    const signature = request.headers.get('calendly-webhook-signature') || '';

    if (!(await verifyCalendlySignature(rawBody, signature, signingKey))) {
        return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let webhook: Record<string, unknown>;
    try {
        webhook = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
        return json({ ok: false, error: 'invalid_json' }, 400);
    }

    if (webhook.event !== 'invitee.created') {
        return json({ ok: true, ignored: true });
    }

    const payload = (webhook.payload && typeof webhook.payload === 'object' ? webhook.payload : {}) as Record<string, unknown>;
    const scheduledEvent =
        payload.scheduled_event && typeof payload.scheduled_event === 'object'
            ? (payload.scheduled_event as Record<string, unknown>)
            : {};
    const sourceId = String(payload.uri || scheduledEvent.uri || webhook.created_at || 'calendly-booking');
    const clientId = await anonymousClientId(sourceId);

    const gaResponse = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                timestamp_micros: Date.now() * 1000,
                events: [
                    {
                        name: 'schedule_call_complete',
                        params: {
                            engagement_time_msec: 1,
                            method: 'calendly',
                            form_type: 'calendar',
                            lead_type: 'scheduled_call',
                            source: 'calendly_webhook'
                        }
                    }
                ]
            })
        }
    );

    if (!gaResponse.ok) {
        console.error(`GA4 Measurement Protocol returned ${gaResponse.status}.`);
        return json({ ok: false, error: 'analytics_delivery_failed' }, 502);
    }

    return json({ ok: true });
};

export const config = {
    path: '/api/calendly-webhook'
};
