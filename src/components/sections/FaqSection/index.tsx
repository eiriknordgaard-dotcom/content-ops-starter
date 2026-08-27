import * as React from 'react';
import Markdown from 'markdown-to-jsx';

import Section from '../Section';
import TitleBlock from '../../blocks/TitleBlock';
import { Badge } from '../../atoms';

export default function FaqSection(props) {
    const { elementId, colors, badge, title, description, items = [], styles = {}, enableAnnotations } = props;

    return (
        <Section elementId={elementId} className="sb-component-faq-section" colors={colors} styles={styles?.self}>
            <div className="mx-auto max-w-4xl">
                <div className="text-center">
                    {badge && <Badge {...badge} {...(enableAnnotations && { 'data-sb-field-path': '.badge' })} />}
                    {title && (
                        <TitleBlock
                            {...title}
                            className={badge?.label ? 'mt-4' : undefined}
                            {...(enableAnnotations && { 'data-sb-field-path': '.title' })}
                        />
                    )}
                    {description && (
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--site-label-secondary)]">
                            {description}
                        </p>
                    )}
                </div>

                <div className="mt-10 divide-y divide-[var(--site-separator)] border-y border-[var(--site-separator)]" {...(enableAnnotations && { 'data-sb-field-path': '.items' })}>
                    {items.map((item, index) => (
                        <details className="group" key={index} {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })}>
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-lg font-medium marker:hidden">
                                <span>{item.question}</span>
                                <span className="text-2xl font-normal leading-none text-primary transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                                    +
                                </span>
                            </summary>
                            <Markdown className="sb-markdown max-w-3xl pb-6 leading-relaxed text-[var(--site-label-secondary)]">
                                {item.answer}
                            </Markdown>
                        </details>
                    ))}
                </div>
            </div>
        </Section>
    );
}
