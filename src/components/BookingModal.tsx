import * as React from 'react';
import { getAnalyticsAttribution } from '../utils/analytics-attribution';
import { trackEvent } from '../utils/analytics';
import { isCalendlyBookingLink, isScheduledCalendlyEvent } from '../utils/calendly-events';
import styles from './BookingModal.module.css';

type CalendlyWindow = Window & {
    Calendly?: { initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void };
};

let widgetPromise: Promise<void> | undefined;
function loadWidget() {
    if ((window as CalendlyWindow).Calendly) return Promise.resolve();
    if (widgetPromise) return widgetPromise;
    widgetPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        const timeout = window.setTimeout(() => fail(), 10_000);
        const fail = () => {
            window.clearTimeout(timeout);
            script.remove();
            widgetPromise = undefined;
            reject(new Error('Booking calendar unavailable'));
        };
        script.onload = () => {
            window.clearTimeout(timeout);
            if (!(window as CalendlyWindow).Calendly) { fail(); return; }
            resolve();
        };
        script.onerror = fail;
        document.head.appendChild(script);
    });
    return widgetPromise;
}

export default function BookingModal() {
    const [bookingUrl, setBookingUrl] = React.useState('');
    const [status, setStatus] = React.useState('Loading available times...');
    const dialogRef = React.useRef<HTMLDialogElement>(null);
    const embedRef = React.useRef<HTMLDivElement>(null);
    const openerRef = React.useRef<HTMLAnchorElement | null>(null);
    const completedBookings = React.useRef(new Set<string>());

    React.useEffect(() => {
        const open = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest<HTMLAnchorElement>('a[href]');
            if (!link || !isCalendlyBookingLink(link.href) || event.defaultPrevented || event.button !== 0 ||
                event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (!dialogRef.current?.showModal) return; // Native anchor remains the fallback.
            event.preventDefault();
            openerRef.current = link;
            setBookingUrl(link.href);
        };
        document.addEventListener('click', open);
        return () => document.removeEventListener('click', open);
    }, []);

    React.useEffect(() => {
        if (!bookingUrl) return;
        const dialog = dialogRef.current;
        const embed = embedRef.current;
        if (!dialog || !embed) return;
        let disposed = false;
        let completionReceived = false;
        const attribution = getAnalyticsAttribution();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        setStatus('Loading available times...');
        dialog.showModal();
        const timeout = window.setTimeout(() => {
            if (!disposed) setStatus('Taking longer than expected? Use the direct booking link below.');
        }, 15_000);
        const receive = (event: MessageEvent) => {
            const frameWindow = embed.querySelector('iframe')?.contentWindow || null;
            if (event.origin !== 'https://calendly.com' || event.source !== frameWindow) return;
            if (event.data?.event === 'calendly.event_type_viewed') {
                window.clearTimeout(timeout);
                setStatus('');
            }
            if (!isScheduledCalendlyEvent(event, frameWindow) || completionReceived) return;
            completionReceived = true;
            window.clearTimeout(timeout);
            setStatus('');
            // Kept only in memory for deduplication, never sent to analytics.
            const bookingKey = event.data?.payload?.event?.uri;
            if (typeof bookingKey === 'string') {
                if (completedBookings.current.has(bookingKey)) return;
                completedBookings.current.add(bookingKey);
            }
            void attribution.then((data) => {
                if (!['eiriknordgaard.com', 'www.eiriknordgaard.com'].includes(window.location.hostname) ||
                    data.trafficType === 'internal' || !data.clientId || !data.sessionId) return;
                trackEvent('schedule_call_complete', {
                    method: 'calendly', origin: 'calendly_embed', session_id: data.sessionId,
                    source: data.source, medium: data.medium, campaign: data.campaign, landing_page: data.landingPage
                });
            });
        };
        window.addEventListener('message', receive);
        void loadWidget().then(() => {
            if (disposed) return;
            (window as CalendlyWindow).Calendly?.initInlineWidget({ url: bookingUrl, parentElement: embed });
            const frame = embed.querySelector('iframe');
            if (frame) frame.title = 'Schedule a call with Eirik Nordgaard';
        }).catch(() => {
            if (!disposed) setStatus('The calendar could not load. Use the direct booking link below.');
        });
        return () => {
            disposed = true;
            window.clearTimeout(timeout);
            window.removeEventListener('message', receive);
            embed.replaceChildren();
            dialog.close();
            document.body.style.overflow = overflow;
            openerRef.current?.focus();
        };
    }, [bookingUrl]);

    return (
        <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="booking-dialog-title"
            onCancel={() => setBookingUrl('')}
            onClick={(event) => { if (event.target === event.currentTarget) setBookingUrl(''); }}>
            <div className={styles.shell}>
                <div className={styles.header}>
                    <h2 id="booking-dialog-title" className={styles.title}>Schedule a Call</h2>
                    <button type="button" className={styles.close} aria-label="Close booking calendar" onClick={() => setBookingUrl('')}>×</button>
                </div>
                <div className={styles.embed}>
                    {status && <p className={styles.status} role="status">{status}</p>}
                    <div ref={embedRef} style={{ height: '100%' }} />
                </div>
                <p className={styles.footer}>Prefer a separate tab? <a className={styles.fallback} href={bookingUrl || 'https://calendly.com/eirik-nordgaard/30min'} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>Open Calendly directly</a></p>
            </div>
        </dialog>
    );
}
