import type { Config, Context } from '@netlify/functions';
import { cleanObservationIndex, cleanStore, retentionStore, TOKEN_TTL, MARKER_TTL } from '../lib/retention';

declare const Netlify: { env: { get(name: string): string | undefined } };

const attributionRetention = async (_request: Request, context: Context) => {
    // Publishing source does not authorize production deletion. An operator
    // enables report or delete mode as a separate release decision.
    const mode = Netlify.env.get('ATTRIBUTION_RETENTION_MODE') || 'off';
    if (!['report', 'delete'].includes(mode)) return new Response('Retention disabled', { status: 200 });
    const now = Date.now();
    const apply = mode === 'delete';
    try {
        const observations = retentionStore(context, 'website-retention-state');
        const tokens = await cleanStore(retentionStore(context, 'analytics-attribution'), observations, 'tokens', 'session/', TOKEN_TTL, now, apply);
        const markers = await cleanStore(retentionStore(context, 'calendly-webhook-events'), observations, 'markers', 'invitee-created/', MARKER_TTL, now, apply);
        const expiredObservations = await cleanObservationIndex(observations, now, apply);
        const report = { version: 1, mode, context: context.deploy.context === 'production' ? 'production' : 'preview',
            checkedAt: new Date(Math.floor(now / 60000) * 60000).toISOString(), tokens, markers, expiredObservations };
        console.info('attribution_retention', JSON.stringify(report));
        return Response.json(report, { status: tokens.errors || markers.errors ? 500 : 200, headers: { 'cache-control': 'no-store' } });
    } catch {
        console.error('attribution_retention_failed');
        return Response.json({ ok: false, error: 'retention_scan_failed' }, { status: 500 });
    }
};

export default attributionRetention;
export const config: Config = { schedule: '17 * * * *' };
