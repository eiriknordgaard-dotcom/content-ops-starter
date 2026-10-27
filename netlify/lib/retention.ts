import { getDeployStore, getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

export const TOKEN_TTL = 24 * 60 * 60 * 1000;
export const MARKER_TTL = 30 * TOKEN_TTL;

export const retentionStore = (context: Context, name: string) => {
    if (!context.deploy?.id) throw new Error('Deployment context required');
    return context.deploy.context === 'production'
        ? getStore({ name, consistency: 'strong' })
        : getDeployStore({ name, deployID: context.deploy.id, consistency: 'strong' });
};

export const expirationMetadata = (now: number, ttl: number) => ({ retentionVersion: 1, createdAt: now, expiresAt: now + ttl });

export function knownExpiration(metadata: Record<string, unknown>, ttl: number, now: number): number | null {
    const { createdAt, expiresAt } = metadata;
    return metadata.retentionVersion === 1 && typeof createdAt === 'number' && typeof expiresAt === 'number'
        && Number.isFinite(createdAt) && Number.isFinite(expiresAt) && createdAt > 0 && createdAt <= now
        && expiresAt - createdAt === ttl ? expiresAt : null;
}

export const cleanDimension = (value: unknown, fallback: string) => {
    const text = typeof value === 'string' ? value.trim().slice(0, 100) : '';
    return text && /^[a-z\d _./-]+$/i.test(text) ? text : fallback;
};

export function cleanLandingPage(value: unknown): string {
    try {
        const url = new URL(typeof value === 'string' ? value : '/', 'https://eiriknordgaard.com');
        return url.origin === 'https://eiriknordgaard.com' && !url.username && !url.password ? url.pathname.slice(0, 100) : '/';
    } catch { return '/'; }
}

export async function boundedBody(request: Request, limit: number): Promise<string | null> {
    if (Number(request.headers.get('content-length')) > limit) return null;
    const reader = request.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) { await reader.cancel(); return null; }
        chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder().decode(bytes);
}

const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');

type Store = ReturnType<typeof getStore>;

// Only metadata and anonymous age/etag observations are inspected. Blob contents
// and raw keys never enter the report or logs. Legacy entries get a full grace
// period from the first unchanged observation instead of a guessed creation date.
export async function cleanStore(store: Store, observations: Store, name: string, prefix: string, ttl: number, now: number, apply: boolean) {
    const report = { scanned: 0, expired: 0, deleted: 0, grace: 0, unknown: 0, changed: 0, errors: 0 };
    for await (const page of store.list({ prefix, paginate: true })) {
        for (const blob of page.blobs) {
            report.scanned++;
            try {
                const current = await store.getMetadata(blob.key);
                if (!current) continue;
                const key = `observations/${name}/${await hash(blob.key)}`;
                let expiry = knownExpiration(current.metadata, ttl, now);
                if (expiry === null) {
                    const etagHash = await hash(current.etag || blob.etag);
                    const prior = await observations.get(key, { type: 'json' }) as { etagHash?: string; firstSeenAt?: number } | null;
                    const validPrior = prior?.etagHash === etagHash && typeof prior.firstSeenAt === 'number'
                        && Number.isFinite(prior.firstSeenAt) && prior.firstSeenAt > 0 && prior.firstSeenAt <= now;
                    if (!validPrior) {
                        report.unknown++;
                        if (apply) await observations.setJSON(key, { etagHash, firstSeenAt: now }, { metadata: expirationMetadata(now, ttl + TOKEN_TTL) });
                        continue;
                    }
                    expiry = prior!.firstSeenAt! + ttl;
                    if (now < expiry) report.grace++;
                }
                if (now < expiry) continue;
                report.expired++;
                if (apply) {
                    const latest = await store.getMetadata(blob.key);
                    if (!latest || latest.etag !== current.etag) { report.changed++; continue; }
                    await store.delete(blob.key);
                    await observations.delete(key);
                    report.deleted++;
                }
            } catch { report.errors++; }
        }
    }
    return report;
}

export async function cleanObservationIndex(observations: Store, now: number, apply: boolean) {
    let expired = 0;
    for await (const page of observations.list({ prefix: 'observations/', paginate: true })) {
        for (const blob of page.blobs) {
            const record = await observations.getMetadata(blob.key);
            const expiry = record?.metadata.expiresAt;
            if (typeof expiry === 'number' && Number.isFinite(expiry) && expiry <= now) {
                expired++;
                if (apply) await observations.delete(blob.key);
            }
        }
    }
    return expired;
}
