import * as React from 'react';
import Script from 'next/script';

import { trackEvent } from '../utils/analytics';

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function Analytics() {
    React.useEffect(() => {
        if (!measurementId) return;

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

            if (href.includes('calendly.com/')) trackEvent('schedule_call_click', { link_text: label, link_url: href });
            else if (href.includes('linkedin.com/')) trackEvent('linkedin_click', { link_text: label, link_url: href });
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

        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('popstate', resetScrollDepth);

        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('popstate', resetScrollDepth);
        };
    }, []);

    if (!measurementId) return null;

    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
                {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;var debugMode=!/(^|\\.)eiriknordgaard\\.com$/.test(window.location.hostname);gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false,debug_mode:debugMode});`}
            </Script>
        </>
    );
}
