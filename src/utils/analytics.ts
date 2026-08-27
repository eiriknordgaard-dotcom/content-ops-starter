export function trackEvent(name: string, parameters: Record<string, string | number | boolean> = {}) {
    if (typeof window === 'undefined') return;
    const gtag = (window as typeof window & { gtag?: (...args: any[]) => void }).gtag;
    gtag?.('event', name, parameters);
}
