import { getDeployStore, getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
        }
    });

const getAttributionStore = (context: Context) =>
    context.deploy.context === 'production'
        ? getStore({ name: 'analytics-attribution', consistency: 'strong' })
        : getDeployStore({ name: 'analytics-attribution', deployID: context.deploy.id, consistency: 'strong' });

const analyticsAttribution = async (request: Request, context: Context) => {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return json({ ok: false, error: 'invalid_json' }, 400);
    }

    const clientId = String(body.clientId || '');
    const sessionId = String(body.sessionId || '');
    if (!/^\d+\.\d+$/.test(clientId) || !/^\d+$/.test(sessionId)) {
        return json({ ok: false, error: 'invalid_attribution' }, 400);
    }

    const token = crypto.randomUUID();
    await getAttributionStore(context).setJSON(`session/${token}`, {
        clientId,
        sessionId,
        createdAt: new Date().toISOString()
    });

    return json({ ok: true, token });
};

export default analyticsAttribution;

export const config: Config = {
    path: '/api/analytics-attribution'
};
