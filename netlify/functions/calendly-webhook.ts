import { getDeployStore, getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

declare const Netlify: {
    env: {
        get(name: string): string | undefined;
    };
};

const getProcessedEvents = (context: Context) =>
    context.deploy.context === 'production'
        ? getStore({ name: 'calendly-webhook-events', consistency: 'strong' })
        : getDeployStore({ name: 'calendly-webhook-events', deployID: context.deploy.id, consistency: 'strong' });

const getAttributionStore = (context: Context) =>
    context.deploy.context === 'production'
        ? getStore({ name: 'analytics-attribution', consistency: 'strong' })
        : getDeployStore({ name: 'analytics-attribution', deployID: context.deploy.id, consistency: 'strong' });

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

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)));
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

const sha256 = async (source: string) => {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)));
    return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

type Attribution = {
    clientId: string;
    sessionId: string;
    source: string;
    medium: string;
    campaign: string;
    landingPage: string;
    createdAt: string;
};

const getAttribution = async (payload: Record<string, unknown>, context: Context) => {
    const tracking = payload.tracking && typeof payload.tracking === 'object' ? (payload.tracking as Record<string, unknown>) : {};
    const content = String(tracking.utm_content || '');
    const token = content.startsWith('ga_') ? content.slice(3) : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) return null;

    const attributionStore = getAttributionStore(context);
    const attribution = (await attributionStore.get(`session/${token}`, { type: 'json' })) as Attribution | null;
    if (!attribution) return null;

    const createdAt = Date.parse(attribution.createdAt);
    const age = Date.now() - createdAt;
    if (!Number.isFinite(createdAt) || age < 0 || age > 24 * 60 * 60 * 1000) {
        await attributionStore.delete(`session/${token}`);
        return null;
    }

    if (!/^\d+\.\d+$/.test(attribution.clientId) || !/^\d+$/.test(attribution.sessionId)) return null;
    return {
        ...attribution,
        source: String(attribution.source || '(direct)').slice(0, 100),
        medium: String(attribution.medium || '(none)').slice(0, 100),
        campaign: String(attribution.campaign || '(not set)').slice(0, 100),
        landingPage: String(attribution.landingPage || '/').slice(0, 100),
        token
    };
};

const calendlyWebhook = async (request: Request, context: Context) => {
    const signingKey = Netlify.env.get('CALENDLY_WEBHOOK_SIGNING_KEY');
    const measurementId = Netlify.env.get('GA4_MEASUREMENT_ID');
    const apiSecret = Netlify.env.get('GA4_MEASUREMENT_PROTOCOL_SECRET');
    const configured = Boolean(signingKey && measurementId && apiSecret);

    if (request.method === 'GET') {
        return json({ ok: configured, service: 'calendly-booking-analytics', configured }, configured ? 200 : 503);
    }

    if (request.method !== 'POST') {
        return json({ ok: false, error: 'method_not_allowed' }, 405);
    }

    if (!signingKey || !measurementId || !apiSecret) {
        console.error(`Calendly analytics environment is incomplete. Request: ${context.requestId}`);
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
    const scheduledEvent = payload.scheduled_event && typeof payload.scheduled_event === 'object' ? (payload.scheduled_event as Record<string, unknown>) : {};
    const sourceId = String(payload.uri || scheduledEvent.uri || webhook.created_at || 'calendly-booking');
    const eventKey = `invitee-created/${await sha256(sourceId)}`;
    const processedEvents = getProcessedEvents(context);
    const existingEvent = await processedEvents.getMetadata(eventKey);

    if (existingEvent) {
        return json({ ok: true, duplicate: true });
    }

    const attribution = await getAttribution(payload, context);
    const clientId = attribution?.clientId || (await anonymousClientId(sourceId));

    let gaResponse: Response;
    try {
        gaResponse = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                signal: AbortSignal.timeout(8_000),
                body: JSON.stringify({
                    client_id: clientId,
                    timestamp_micros: Date.now() * 1000,
                    events: [
                        {
                            name: 'schedule_call_complete',
                            params: {
                                ...(attribution ? { session_id: attribution.sessionId } : {}),
                                ...(attribution
                                    ? {
                                          source: attribution.source,
                                          medium: attribution.medium,
                                          campaign: attribution.campaign,
                                          landing_page: attribution.landingPage
                                      }
                                    : {}),
                                engagement_time_msec: 1,
                                method: 'calendly',
                                form_type: 'calendar',
                                lead_type: 'scheduled_call',
                                event_origin: 'calendly_webhook'
                            }
                        }
                    ]
                })
            }
        );
    } catch (error) {
        console.error(`GA4 Measurement Protocol request failed. Request: ${context.requestId}`, error);
        return json({ ok: false, error: 'analytics_delivery_failed' }, 502);
    }

    if (!gaResponse.ok) {
        console.error(`GA4 Measurement Protocol returned ${gaResponse.status}. Request: ${context.requestId}`);
        return json({ ok: false, error: 'analytics_delivery_failed' }, 502);
    }

    await processedEvents.setJSON(eventKey, {
        processedAt: new Date().toISOString(),
        event: 'invitee.created'
    });
    if (attribution) await getAttributionStore(context).delete(`session/${attribution.token}`);

    return json({ ok: true });
};

export default calendlyWebhook;

export const config: Config = {
    path: '/api/calendly-webhook'
};
