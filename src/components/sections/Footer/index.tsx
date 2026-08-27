import * as React from 'react';
import { useEffect, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import classNames from 'classnames';

import { mapStylesToClassNames as mapStyles } from '../../../utils/map-styles-to-class-names';
import { Social, Action, Link } from '../../atoms';
import ImageBlock from '../../blocks/ImageBlock';

export default function Footer(props) {
    const {
        colors = 'bg-light-fg-dark',
        logo,
        title,
        text,
        primaryLinks,
        secondaryLinks,
        socialLinks = [],
        legalLinks = [],
        copyrightText,
        styles = {},
        enableAnnotations
    } = props;
    const hasMainContent = Boolean(logo?.url || title || text || primaryLinks || secondaryLinks);
    return (
        <footer
            className={classNames(
                'sb-component',
                'sb-component-footer',
                { 'footer-minimal': !hasMainContent },
                colors,
                styles?.self?.margin ? mapStyles({ padding: styles?.self?.margin }) : undefined,
                styles?.self?.padding ? mapStyles({ padding: styles?.self?.padding }) : 'px-4'
            )}
            style={{ backgroundColor: '#0B2740' }}
            {...(enableAnnotations && { 'data-sb-object-id': props?.__metadata?.id })}
        >
            <div className="mx-auto max-w-7xl">
                {hasMainContent && (
                    <div className={classNames('footer-main-grid', { 'footer-main-grid-compact': !secondaryLinks })}>
                    {(logo?.url || title || text) && (
                        <div className="footer-brand">
                            {(logo?.url || title) && (
                                <Link href="/" className="flex flex-col items-start">
                                    {logo && (
                                        <ImageBlock {...logo} className="inline-block w-auto" {...(enableAnnotations && { 'data-sb-field-path': 'logo' })} />
                                    )}
                                    {title && (
                                        <div className="h4" {...(enableAnnotations && { 'data-sb-field-path': 'title' })}>
                                            {title}
                                        </div>
                                    )}
                                </Link>
                            )}
                            {text && (
                                <Markdown
                                    options={{ forceBlock: true, forceWrapper: true }}
                                    className={classNames('sb-markdown', 'text-sm', { 'mt-4': title || logo?.url })}
                                    {...(enableAnnotations && { 'data-sb-field-path': 'text' })}
                                >
                                    {text}
                                </Markdown>
                            )}
                        </div>
                    )}
                    {primaryLinks && (
                        <FooterLinksGroup
                            {...primaryLinks}
                            className="footer-explore-group"
                            {...(enableAnnotations && { 'data-sb-field-path': 'primaryLinks' })}
                        />
                    )}
                    {secondaryLinks && (
                        <FooterLinksGroup
                            {...secondaryLinks}
                            className="footer-action-group"
                            {...(enableAnnotations && { 'data-sb-field-path': 'secondaryLinks' })}
                        />
                    )}
                    </div>
                )}
                {(copyrightText || legalLinks.length > 0 || socialLinks.length > 0) && (
                    <div className="sb-footer-bottom footer-bottom border-t">
                        <div className="footer-identity-actions">
                            {copyrightText && (
                                <Markdown
                                    options={{ forceInline: true, forceWrapper: true, wrapper: 'p' }}
                                    className="sb-markdown footer-copyright"
                                    {...(enableAnnotations && { 'data-sb-field-path': 'copyrightText' })}
                                >
                                    {copyrightText}
                                </Markdown>
                            )}
                            {socialLinks.length > 0 && (
                                <ul className="footer-social-links" {...(enableAnnotations && { 'data-sb-field-path': 'socialLinks' })}>
                                    {socialLinks.map((link, index) => (
                                        <li key={index}>
                                            <Social {...link} {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <ThemeToggle />
                        <div className="footer-bottom-actions">
                            {legalLinks.length > 0 && (
                                <ul className="footer-legal-links" {...(enableAnnotations && { 'data-sb-field-path': 'legalLinks' })}>
                                    {legalLinks.map((link, index) => (
                                        <li key={index}>
                                            <Action {...link} className="text-sm" {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </footer>
    );
}

function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const stored = window.localStorage.getItem('site-theme');
        const initialTheme = stored === 'light' || stored === 'dark' ? stored : media.matches ? 'dark' : 'light';

        applyTheme(initialTheme);
        setTheme(initialTheme);

        const handleSystemThemeChange = (event: MediaQueryListEvent) => {
            if (!window.localStorage.getItem('site-theme')) {
                const nextTheme = event.matches ? 'dark' : 'light';
                applyTheme(nextTheme);
                setTheme(nextTheme);
            }
        };

        media.addEventListener('change', handleSystemThemeChange);
        return () => media.removeEventListener('change', handleSystemThemeChange);
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        window.localStorage.setItem('site-theme', nextTheme);
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    const isDark = theme === 'dark';
    const label = theme ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Toggle color theme';

    return (
        <button
            className={classNames('theme-toggle', { 'theme-toggle-dark': isDark })}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={isDark}
            onClick={toggleTheme}
        >
            <span className={classNames('theme-toggle-label', { 'theme-toggle-label-active': !isDark })} aria-hidden="true">
                Light
            </span>
            <span className="theme-toggle-track" aria-hidden="true">
                <span className="theme-toggle-thumb" />
            </span>
            <span className={classNames('theme-toggle-label', { 'theme-toggle-label-active': isDark })} aria-hidden="true">
                Dark
            </span>
        </button>
    );
}

function applyTheme(theme: 'light' | 'dark') {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101012' : '#FFFFFF');
}

function FooterLinksGroup(props) {
    const { title, links = [], className } = props;
    const fieldPath = props['data-sb-field-path'];
    if (links.length === 0) {
        return null;
    }
    return (
        <div className={classNames('footer-links-group', className)} data-sb-field-path={fieldPath}>
            {title && (
                <h2 className="uppercase text-base tracking-wide" {...(fieldPath && { 'data-sb-field-path': '.title' })}>
                    {title}
                </h2>
            )}
            {links.length > 0 && (
                <ul className={classNames('space-y-3', { 'mt-7': title })} {...(fieldPath && { 'data-sb-field-path': '.links' })}>
                    {links.map((link, index) => (
                        <li key={index}>
                            <Action {...link} className="text-sm" {...(fieldPath && { 'data-sb-field-path': `.${index}` })} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
