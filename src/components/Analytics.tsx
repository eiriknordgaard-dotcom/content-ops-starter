import * as React from 'react';
import Router from 'next/router';

import { trackEvent } from '../utils/analytics';
import { getAnalyticsAttribution } from '../utils/analytics-attribution';
import BookingModal from './BookingModal';

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const productionHosts = new Set(['eiriknordgaard.com', 'www.eiriknordgaard.com']);

type GtagWindow = typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
    __gaInitialized?: boolean;
};

const sanitizeExceptionText = (value: unknown, fallback: string) =>
    String(value || fallback)
        .replace(/https?:\/\/\S+/gi, '[url]')
        .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);

const normalizeErrorSource = (value: string) => {
    if (!value) return 'unknown';
    try {
        const url = new URL(value, window.location.origin);
        return `${url.origin === window.location.origin ? '' : url.hostname}${url.pathname}`.slice(0, 100) || '/';
    } catch {
        return sanitizeExceptionText(value, 'unknown').slice(0, 100);
    }
};

const exceptionId = (value: string) => {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
    return `web_${(hash >>> 0).toString(36)}`;
};

const errorSourceFromStack = (stack?: string) => stack?.match(/https?:\/\/[^\s)]+/i)?.[0]?.replace(/:\d+:\d+$/, '') || 'unknown';

export default function Analytics() {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        const production = productionHosts.has(window.location.hostname);
        if (production) {
            const url = new URL(window.location.href);
            const internalTraffic = url.searchParams.get('internal_traffic');
            try {
                if (internalTraffic === '1') window.localStorage.setItem('ga_internal_traffic', 'true');
                if (internalTraffic === '0') window.localStorage.removeItem('ga_internal_traffic');
            } catch {
                // Browser privacy settings must not interrupt analytics setup.
            }

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
            analyticsWindow.gtag = function gtag(..._args: any[]) {
                // Google interprets command entries as Arguments objects, not arrays.
                // eslint-disable-next-line prefer-rest-params
                analyticsWindow.dataLayer?.push(arguments);
            };

            const gaConfig: Record<string, boolean | string> = {
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
            };
            try {
                if (window.localStorage.getItem('ga_internal_traffic') === 'true') gaConfig.traffic_type = 'internal';
            } catch {
                // Continue collecting ordinary events when storage is blocked.
            }

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

        void getAnalyticsAttribution();

        let trackedDepths = new Set<number>();
        const reportedExceptions = new Set<string>();

        const handleClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest<HTMLAnchorElement>('a[href]');
            if (!link) return;
            const href = link.href;
            const label = link.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || link.getAttribute('aria-label') || 'Unlabeled link';
            const location =
                link.closest<HTMLElement>('#services, #services-projects, #about, #why, #contact')?.id ||
                (link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'page');
            const navigationTarget = link.hash.replace(/^#/, '');

            if (link.classList.contains('sb-component-button')) {
                trackEvent('cta_click', {
                    cta_text: label,
                    cta_url: href,
                    cta_location: location
                });
            }

            if (href.includes('calendly.com/')) {
                trackEvent('schedule_call_click', { link_text: label, link_url: href });

            } else if (href.includes('linkedin.com/')) trackEvent('linkedin_click', { link_text: label, link_url: href });
            else if (href.includes('brokercheck.finra.org/')) trackEvent('brokercheck_click', { link_text: label, link_url: href });
            else if (href.startsWith('mailto:')) trackEvent('email_click', { link_text: label });
            else if (/what-does-a-finop-do|series-27-vs-series-28-finop|outsourced-vs-in-house-finop|finop-audit-readiness-checklist|how-to-prepare-broker-dealer-focus-report/.test(href)) {
                trackEvent('resource_click', { link_text: label, link_url: href });
            } else if (/\/fractional-finop\/|\/focus-reporting-net-capital-support\//.test(href)) {
                trackEvent('service_detail_click', { link_text: label, link_url: href, link_location: location });
            }

            if ((location === 'header' || location === 'footer') && ['services', 'about', 'why', 'contact'].includes(navigationTarget)) {
                trackEvent('navigation_click', {
                    link_text: label,
                    navigation_target: navigationTarget,
                    navigation_location: location
                });
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

        const reportException = ({
            description,
            errorType,
            errorName = 'Error',
            errorSource = 'unknown',
            lineNumber = 0,
            columnNumber = 0
        }: {
            description: string;
            errorType: 'runtime_error' | 'unhandled_rejection';
            errorName?: string;
            errorSource?: string;
            lineNumber?: number;
            columnNumber?: number;
        }) => {
            const safeDescription = sanitizeExceptionText(description, 'Unknown browser error');
            const safeSource = normalizeErrorSource(errorSource);
            const signature = `${errorType}|${errorName}|${safeDescription}|${safeSource}|${window.location.pathname}`;
            if (reportedExceptions.has(signature)) return;
            reportedExceptions.add(signature);

            trackEvent('exception', {
                description: safeDescription,
                error_message: safeDescription.slice(0, 100),
                fatal: false,
                error_type: errorType,
                error_name: sanitizeExceptionText(errorName, 'Error').slice(0, 100),
                error_source: safeSource,
                error_id: exceptionId(signature),
                page_path: window.location.pathname,
                line_number: lineNumber,
                column_number: columnNumber
            });
        };

        const handleWindowError = (event: ErrorEvent) => {
            reportException({
                description: event.message,
                errorType: 'runtime_error',
                errorName: event.error instanceof Error ? event.error.name : 'Error',
                errorSource: event.filename,
                lineNumber: event.lineno,
                columnNumber: event.colno
            });
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const error = event.reason instanceof Error ? event.reason : null;
            reportException({
                description: error?.message || String(event.reason || 'Unhandled promise rejection'),
                errorType: 'unhandled_rejection',
                errorName: error?.name || 'UnhandledRejection',
                errorSource: errorSourceFromStack(error?.stack)
            });
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

    return <BookingModal />;
}
