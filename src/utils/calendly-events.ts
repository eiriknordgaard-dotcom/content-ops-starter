// Never forward Calendly's payload (which can identify an invitee) to GA.
export const isScheduledCalendlyEvent = (event: MessageEvent, frameWindow: Window | null) =>
    Boolean(frameWindow) && event.source === frameWindow && event.origin === 'https://calendly.com' &&
    event.data?.event === 'calendly.event_scheduled';

export const isCalendlyBookingLink = (href: string) => {
    try {
        const url = new URL(href);
        return url.protocol === 'https:' && url.hostname === 'calendly.com';
    } catch {
        return false;
    }
};
