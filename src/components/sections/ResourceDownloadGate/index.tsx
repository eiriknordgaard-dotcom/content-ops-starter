import * as React from 'react';
import Link from 'next/link';

import { trackEvent } from '../../../utils/analytics';
import { fetchWithTimeout, isAbortError } from '../../../utils/fetch-with-timeout';

const FORM_NAME = 'finop-checklist-download';
const DOWNLOAD_URL = '/downloads/finop-audit-readiness-checklist.pdf';

export default function ResourceDownloadGate() {
    const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [isHydrated, setIsHydrated] = React.useState(false);
    const formStarted = React.useRef(false);

    React.useEffect(() => setIsHydrated(true), []);

    function handleFormStart() {
        if (formStarted.current) return;
        formStarted.current = true;
        trackEvent('form_start', { form_name: FORM_NAME, form_type: 'resource_download' });
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement | HTMLDivElement>) {
        event.preventDefault();
        if (!(event.currentTarget instanceof HTMLFormElement)) return;
        setStatus('submitting');

        const form = event.currentTarget;
        const data = new FormData(form);
        const body = new URLSearchParams();
        data.forEach((value, key) => body.append(key, String(value)));
        body.set('form-name', FORM_NAME);

        try {
            const response = await fetchWithTimeout('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });

            if (!response.ok) {
                throw new Error('The form submission could not be completed.');
            }

            setStatus('success');
            trackEvent('resource_download', { resource: 'finop_audit_readiness_checklist' });
            trackEvent('generate_lead', { form_name: FORM_NAME, lead_type: 'resource_download', resource: 'finop_audit_readiness_checklist' });

            const downloadLink = document.createElement('a');
            downloadLink.href = DOWNLOAD_URL;
            downloadLink.download = 'finop-audit-readiness-checklist.pdf';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            form.reset();
        } catch (error) {
            setStatus('error');
            trackEvent('resource_download_error', {
                resource: 'finop_audit_readiness_checklist',
                error_type: isAbortError(error) ? 'timeout' : 'submission_failed'
            });
        }
    }

    const FormElement = isHydrated ? 'form' : 'div';

    return (
        <section id="download-checklist" className="resource-gate-wrap" aria-labelledby="resource-gate-title">
            <div className="resource-gate">
                <div className="resource-gate-copy">
                    <span className="resource-gate-kicker">Free PDF resource</span>
                    <h2 id="resource-gate-title">Get the Printable Checklist</h2>
                    <p>Enter your work email and the six-page FINOP and audit readiness checklist will download immediately.</p>
                </div>

                <FormElement
                    className="resource-gate-form"
                    role={isHydrated ? undefined : 'form'}
                    onSubmit={handleSubmit}
                    onFocus={handleFormStart}
                >
                    <input type="hidden" name="resource" value="FINOP and Audit Readiness Checklist" />
                    <input type="hidden" name="subject" value="New FINOP checklist download" />
                    <p className="hidden" aria-hidden="true">
                        <label>
                            Do not fill this out: <input name="bot-field" tabIndex={-1} autoComplete="off" />
                        </label>
                    </p>

                    <label className="resource-gate-field">
                        <span>Work email</span>
                        <input type="email" name="email" autoComplete="email" required placeholder="you@firm.com" />
                    </label>

                    <label className="resource-gate-field">
                        <span>Firm name <small>Optional</small></span>
                        <input type="text" name="firm" autoComplete="organization" placeholder="Your firm" />
                    </label>

                    <label className="resource-gate-consent">
                        <input type="checkbox" name="marketing-consent" value="yes" />
                        <span>You may also send me occasional FINOP insights. Optional.</span>
                    </label>

                    <button type="submit" disabled={status === 'submitting'}>
                        {status === 'submitting' ? 'Preparing your download...' : 'Download the Checklist'}
                    </button>

                    <p className="resource-gate-privacy">
                        Your information is used to deliver this resource. See the <Link href="/privacy/">Privacy Policy</Link>.
                    </p>

                    <div className="resource-gate-status" aria-live="polite">
                        {status === 'success' && (
                            <p>
                                Your download is ready. If it did not start,{' '}
                                <a href={DOWNLOAD_URL} download="finop-audit-readiness-checklist.pdf">
                                    download the PDF here
                                </a>
                                .
                            </p>
                        )}
                        {status === 'error' && <p>Something went wrong. Please try again or contact me directly.</p>}
                    </div>
                </FormElement>
            </div>
        </section>
    );
}
