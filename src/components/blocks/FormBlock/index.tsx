import * as React from 'react';
import classNames from 'classnames';
import Markdown from 'markdown-to-jsx';

import { getComponent } from '../../components-registry';
import { mapStylesToClassNames as mapStyles } from '../../../utils/map-styles-to-class-names';
import SubmitButtonFormControl from './SubmitButtonFormControl';
import { trackEvent } from '../../../utils/analytics';
import { getAnalyticsAttribution } from '../../../utils/analytics-attribution';
import { fetchWithTimeout, isAbortError } from '../../../utils/fetch-with-timeout';

export default function FormBlock(props) {
    const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const formStarted = React.useRef(false);
    const { fields = [], elementId, heading, privacyText, submitButton, className, styles = {}, 'data-sb-field-path': fieldPath } = props;
    const formName = elementId || 'contact-form';

    if (fields.length === 0) {
        return null;
    }

    function handleFormStart() {
        if (formStarted.current) return;
        formStarted.current = true;
        trackEvent('form_start', { form_name: formName, form_type: 'contact' });
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus('submitting');

        const form = event.currentTarget;
        const data = new FormData(form);
        const body = new URLSearchParams();
        data.forEach((value, key) => body.append(key, String(value)));
        body.set('form-name', formName);
        const attribution = await getAnalyticsAttribution();
        if (attribution.clientId) body.set('ga-client-id', attribution.clientId);
        if (attribution.sessionId) body.set('ga-session-id', attribution.sessionId);
        body.set('ga-source', attribution.source);
        body.set('ga-medium', attribution.medium);
        body.set('ga-campaign', attribution.campaign);
        body.set('ga-landing-page', attribution.landingPage);

        try {
            const response = await fetchWithTimeout('/api/contact-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });

            if (!response.ok) {
                throw new Error('The form submission could not be completed.');
            }

            form.reset();
            setStatus('success');
            trackEvent('contact_form_submit', { form_name: formName });
        } catch (error) {
            setStatus('error');
            trackEvent('contact_form_error', { form_name: formName, error_type: isAbortError(error) ? 'timeout' : 'submission_failed' });
        }
    }

    return (
        <form
            className={classNames(
                'sb-component',
                'sb-component-block',
                'sb-component-form-block',
                className,
                styles?.self?.margin ? mapStyles({ margin: styles?.self?.margin }) : undefined,
                styles?.self?.padding ? mapStyles({ padding: styles?.self?.padding }) : undefined,
                styles?.self?.borderWidth && styles?.self?.borderWidth !== 0 && styles?.self?.borderStyle !== 'none'
                    ? mapStyles({
                          borderWidth: styles?.self?.borderWidth,
                          borderStyle: styles?.self?.borderStyle,
                          borderColor: styles?.self?.borderColor ?? 'border-primary'
                      })
                    : undefined,
                styles?.self?.borderRadius ? mapStyles({ borderRadius: styles?.self?.borderRadius }) : undefined
            )}
            id={elementId}
            onSubmit={handleSubmit}
            onFocus={handleFormStart}
            data-sb-field-path={fieldPath}
        >
            {heading && (
                <div className="contact-form-heading">
                    <span className="contact-form-status" aria-hidden="true" />
                    <h3 {...(fieldPath && { 'data-sb-field-path': '.heading' })}>{heading}</h3>
                </div>
            )}
            <div
                className={classNames('contact-form-fields', 'w-full', 'flex', 'flex-wrap', 'gap-8', mapStyles({ justifyContent: styles?.self?.justifyContent ?? 'flex-start' }))}
                {...(fieldPath && { 'data-sb-field-path': '.fields' })}
            >
                <p className="hidden" aria-hidden="true">
                    <label>
                        Do not fill this out: <input name="bot-field" tabIndex={-1} autoComplete="off" />
                    </label>
                </p>
                {fields.map((field, index) => {
                    const modelName = field.__metadata.modelName;
                    if (!modelName) {
                        throw new Error(`form field does not have the 'modelName' property`);
                    }
                    const FormControl = getComponent(modelName);
                    if (!FormControl) {
                        throw new Error(`no component matching the form field model name: ${modelName}`);
                    }
                    return <FormControl key={index} {...field} {...(fieldPath && { 'data-sb-field-path': `.${index}` })} />;
                })}
            </div>
            {submitButton && (
                <div className={classNames('contact-form-submit', 'mt-8', 'flex', mapStyles({ justifyContent: styles?.self?.justifyContent ?? 'flex-start' }))}>
                    <SubmitButtonFormControl
                        {...submitButton}
                        disabled={status === 'submitting'}
                        {...(fieldPath && { 'data-sb-field-path': '.submitButton' })}
                    />
                </div>
            )}
            {privacyText && (
                <Markdown className="contact-form-privacy" {...(fieldPath && { 'data-sb-field-path': '.privacyText' })}>
                    {privacyText}
                </Markdown>
            )}
            {status !== 'idle' && (
                <div className="mt-4 text-sm" aria-live="polite">
                    {status === 'submitting' && <p>Sending your message…</p>}
                    {status === 'success' && <p>Thank you. Your message has been sent.</p>}
                    {status === 'error' && <p>Something went wrong. Please email me directly or try again.</p>}
                </div>
            )}
        </form>
    );
}
