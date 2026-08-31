import * as React from 'react';
import Router from 'next/router';

import { trackEvent } from '../utils/analytics';

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const productionHosts = new Set(['eiriknordgaard.com', 'www.eiriknordgaard.com']);

type GtagWindow = typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
    __gaInitialized?: boolean;
};

const getGtagValue = (field: 'client_id' | 'session_id') =>
    new Promise<string | undefined>((resolve) => {
        const gtag = (window as GtagWindow).gtag;
        if (!gtag || !measurementId) {
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
        gtag('get', measurementId, field, finish);
    });

const addCalendlyAttribution = async (href: string) => {
    const [clientId, sessionId] = await Promise.all([getGtagValue('client_id'), getGtagValue('session_id')]);
    if (!clientId || !sessionId) return href;

    try {
        const response = await fetch('/api/analytics-attribution', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ clientId, sessionId }),
            keepalive: true,
            signal: AbortSignal.timeout(1_500)
        });
        if (!response.ok) return href;

        const result = (await response.json()) as { token?: string };
        if (!result.token) return href;

        const url = new URL(href);
        url.searchParams.set('utm_content', `ga_${result.token}`);
        return url.toString();
    } catch {
        return href;
    }
};

export default function Analytics() {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        const production = productionHosts.has(window.location.hostname);
        if (production) {
            const url = new URL(window.location.href);
            const internalTraffic = url.searchParams.get('internal_traffic');
            if (internalTraffic === '1') window.localStorage.setItem('ga_internal_traffic', 'true');
            if (internalTraffic === '0') window.localStorage.removeItem('ga_internal_traffic');

            if (internalTraffic === '1' || internalTraffic === '0') {
                url.searchParams.delete('internal_traffic');
                window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
            }
        }

        setEnabled(Boolean(measurementId) && production);
    }, []);

    React.useEffect(() => {
        if (!measurementId || !enabled) return;

        const analyticsWindow = window as GtagWindow;
        if (!analyticsWindow.__gaInitialized) {
            analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
            analyticsWindow.gtag = function gtag(...args: any[]) {
                analyticsWindow.dataLayer?.push(args);
            };

            const gaConfig: Record<string, boolean | string> = {
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
            };
            if (window.localStorage.getItem('ga_internal_traffic') === 'true') gaConfig.traffic_type = 'internal';

            analyticsWindow.gtag('js', new Date());
            analyticsWindow.gtag('config', measurementId, gaConfig);

            const loaderId = 'google-analytics-loader';
            if (!document.getElementById(loaderId)) {
                const script = document.createElement('script');
                script.id = loaderId;
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
                document.head.appendChild(script);
            }

            analyticsWindow.__gaInitialized = true;
        }

        let trackedDepths = new Set<number>();

        const handleClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest<HTMLAnchorElement>('a[href]');
            if (!link) return;
            const href = link.href;
            const label = link.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || link.getAttribute('aria-label') || 'Unlabeled link';
            const location = link.closest<HTMLElement>('section[id]')?.id || (link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'page');

            if (link.classList.contains('sb-component-button')) {
                trackEvent('cta_click', {
                    cta_text: label,
                    cta_url: href,
                    cta_location: location
                });
            }

            if (href.includes('calendly.com/')) {
                trackEvent('schedule_call_click', { link_text: label, link_url: href });

                if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    const bookingWindow = window.open('', link.target || '_self');
                    if (bookingWindow) bookingWindow.opener = null;

                    void addCalendlyAttribution(href).then((attributedHref) => {
                        if (bookingWindow) bookingWindow.location.href = attributedHref;
                        else window.location.href = attributedHref;
                    });
                }
            } else if (href.includes('linkedin.com/')) trackEvent('linkedin_click', { link_text: label, link_url: href });
            else if (href.includes('brokercheck.finra.org/')) trackEvent('brokercheck_click', { link_text: label, link_url: href });
            else if (href.startsWith('mailto:')) trackEvent('email_click', { link_text: label });
            else if (/what-does-a-finop-do|series-27-vs-series-28-finop|outsourced-vs-in-house-finop/.test(href)) {
                trackEvent('resource_click', { link_text: label, link_url: href });
            }
        };

        const handleScroll = () => {
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (scrollableHeight <= 0) return;

            const depth = Math.round((window.scrollY / scrollableHeight) * 100);
            [25, 50, 75].forEach((threshold) => {
                if (depth < threshold || trackedDepths.has(threshold)) return;
                trackedDepths.add(threshold);
                trackEvent('scroll_depth', { percent_scrolled: threshold });
            });
        };

        const resetScrollDepth = () => {
            trackedDepths = new Set<number>();
        };

        const trackPageView = (url: string) => {
            resetScrollDepth();
            trackEvent('page_view', {
                page_location: window.location.href,
                page_path: url,
                page_title: document.title
            });
        };

        const handleWindowError = (event: ErrorEvent) => {
            trackEvent('exception', {
                description: `${event.message || 'Unknown browser error'}${event.filename ? ` at ${event.filename}` : ''}`.slice(0, 300),
                fatal: false
            });
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const description = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unhandled promise rejection');
            trackEvent('exception', { description: description.slice(0, 300), fatal: false });
        };

        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, { passive: true });
        Router.events.on('routeChangeComplete', trackPageView);
        window.addEventListener('error', handleWindowError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll);
            Router.events.off('routeChangeComplete', trackPageView);
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [enabled]);

    return null;
}
