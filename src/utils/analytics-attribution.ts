const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const storageKey = 'ga_session_attribution';

type GtagWindow = typeof window & {
    __analyticsMeasurementId?: string;
    gtag?: (...args: any[]) => void;
};

export type AnalyticsAttribution = {
    clientId?: string;
    sessionId?: string;
    source: string;
    medium: string;
    campaign: string;
    landingPage: string;
};

const clean = (value: string | null | undefined, fallback = '') => (value || fallback).trim().slice(0, 100);

const trafficSourceFromReferrer = () => {
    if (!document.referrer) return { source: '(direct)', medium: '(none)' };

    try {
        const referrer = new URL(document.referrer);
        if (referrer.hostname === window.location.hostname) return { source: '(direct)', medium: '(none)' };

        const source = referrer.hostname.replace(/^www\./, '');
        const organicSearchHosts = ['google.', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'ecosia.org'];
        const medium = organicSearchHosts.some((host) => source === host || source.startsWith(host) || source.includes(`.${host}`))
            ? 'organic'
            : 'referral';
        return { source, medium };
    } catch {
        return { source: '(direct)', medium: '(none)' };
    }
};

const getSessionAttribution = (): Omit<AnalyticsAttribution, 'clientId' | 'sessionId'> => {
    try {
        const stored = window.sessionStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored) as Omit<AnalyticsAttribution, 'clientId' | 'sessionId'>;
    } catch {
        // Continue without storage when it is blocked by browser privacy controls.
    }

    const url = new URL(window.location.href);
    const referrer = trafficSourceFromReferrer();
    const gclid = url.searchParams.get('gclid');
    const attribution = {
        source: clean(url.searchParams.get('utm_source'), gclid ? 'google' : referrer.source),
        medium: clean(url.searchParams.get('utm_medium'), gclid ? 'cpc' : referrer.medium),
        campaign: clean(url.searchParams.get('utm_campaign'), '(not set)'),
        landingPage: clean(url.pathname || '/', '/')
    };

    try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(attribution));
    } catch {
        // Attribution still works for the current request when storage is unavailable.
    }

    return attribution;
};

const getGtagValue = (field: 'client_id' | 'session_id') =>
    new Promise<string | undefined>((resolve) => {
        const analyticsWindow = window as GtagWindow;
        const gtag = analyticsWindow.gtag;
        const analyticsMeasurementId = measurementId || analyticsWindow.__analyticsMeasurementId;
        if (!gtag || !analyticsMeasurementId) {
            resolve(undefined);
            return;
        }

        let resolved = false;
        const finish = (value?: unknown) => {
            if (resolved) return;
            resolved = true;
            resolve(typeof value === 'string' || typeof value === 'number' ? String(value) : undefined);
        };

        window.setTimeout(() => finish(), 700);
        try {
            gtag('get', analyticsMeasurementId, field, finish);
        } catch {
            finish();
        }
    });

export const getAnalyticsAttribution = async (): Promise<AnalyticsAttribution> => {
    const [clientId, sessionId] = await Promise.all([getGtagValue('client_id'), getGtagValue('session_id')]);
    return { ...getSessionAttribution(), clientId, sessionId };
};
