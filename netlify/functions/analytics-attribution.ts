import type { Config, Context } from '@netlify/functions';
import { boundedBody, cleanDimension, cleanLandingPage, expirationMetadata, retentionStore, TOKEN_TTL } from '../lib/retention';

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
        }
    });

const analyticsAttribution = async (request: Request, context: Context) => {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ ok: false, error: 'forbidden_origin' }, 403);
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ ok: false, error: 'unsupported_media_type' }, 415);
    const raw = await boundedBody(request, 8192);
    if (raw === null) return json({ ok: false, error: 'payload_too_large' }, 413);

    let body: Record<string, unknown>;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid object');
        body = parsed;
    } catch {
        return json({ ok: false, error: 'invalid_json' }, 400);
    }

    const clientId = String(body.clientId || '');
    const sessionId = String(body.sessionId || '');
    if (!/^\d+\.\d+$/.test(clientId) || !/^\d+$/.test(sessionId)) {
        return json({ ok: false, error: 'invalid_attribution' }, 400);
    }

    const token = crypto.randomUUID();
    const now = Date.now();
    await retentionStore(context, 'analytics-attribution').setJSON(`session/${token}`, {
        clientId,
        sessionId,
        source: cleanDimension(body.source, '(direct)'),
        medium: cleanDimension(body.medium, '(none)'),
        campaign: cleanDimension(body.campaign, '(not set)'),
        landingPage: cleanLandingPage(body.landingPage),
        createdAt: new Date(now).toISOString()
    }, { metadata: expirationMetadata(now, TOKEN_TTL) });

    return json({ ok: true, token });
};

export default analyticsAttribution;

export const config: Config = {
    path: '/api/analytics-attribution',
    rateLimit: { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 20 }
};
