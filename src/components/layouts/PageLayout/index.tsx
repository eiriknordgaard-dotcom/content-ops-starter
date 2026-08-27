import * as React from 'react';
import classNames from 'classnames';

import { getBaseLayoutComponent } from '../../../utils/base-layout';
import { getComponent } from '../../components-registry';
import ResourceDownloadGate from '../../sections/ResourceDownloadGate';

export default function PageLayout(props) {
    const { page, site } = props;
    const BaseLayout = getBaseLayoutComponent(page.baseLayout, site.baseLayout);
    const { enableAnnotations = true } = site;
    const { title, sections = [] } = page;
    const firstSectionHasVisibleTitle = Boolean(sections[0]?.title?.text);
    const editorialGuides = {
        'what-does-a-finop-do': '5 min read',
        'series-27-vs-series-28-finop': '5 min read',
        'outsourced-vs-in-house-finop': '6 min read',
        'finop-audit-readiness-checklist': '8 min read'
    };
    const readingTime = editorialGuides[page.slug];
    const isEditorialGuide = Boolean(readingTime);

    return (
        <BaseLayout page={page} site={site}>
            <main id="main" className={classNames('sb-layout', 'sb-page-layout', { 'editorial-guide': isEditorialGuide })}>
                {title && !firstSectionHasVisibleTitle && (
                    <h1 className="sr-only" {...(enableAnnotations && { 'data-sb-field-path': 'title' })}>
                        {title}
                    </h1>
                )}
                {sections.length > 0 && (
                    <div className={isEditorialGuide ? 'editorial-sections' : undefined} {...(enableAnnotations && { 'data-sb-field-path': 'sections' })}>
                        {sections.map((section, index) => {
                            const Component = getComponent(section.__metadata.modelName);
                            if (!Component) {
                                throw new Error(`no component matching the page section's model name: ${section.__metadata.modelName}`);
                            }
                            return (
                                <React.Fragment key={index}>
                                    <Component
                                        {...section}
                                        isHero={index === 0}
                                        enableAnnotations={enableAnnotations}
                                        {...(enableAnnotations && { 'data-sb-field-path': `sections.${index}` })}
                                    />
                                    {isEditorialGuide && index === 0 && <ArticleMeta readingTime={readingTime} dateModified={page.dateModified} />}
                                    {page.slug === 'finop-audit-readiness-checklist' && index === 0 && <ResourceDownloadGate />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </main>
        </BaseLayout>
    );
}

function ArticleMeta({ readingTime, dateModified }: { readingTime: string; dateModified?: string }) {
    const displayDate = dateModified
        ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dateModified}T00:00:00Z`))
        : null;

    return (
        <div className="editorial-meta-wrap">
            <div className="editorial-meta" aria-label="Article information">
                <div className="editorial-author-mark" aria-hidden="true">
                    EN
                </div>
                <div className="editorial-author-copy">
                    <a href="https://www.linkedin.com/in/eiriknordgaard" className="editorial-author-name">
                        Eirik Nordgaard
                    </a>
                    <span className="editorial-author-role">FINOP and regulatory finance consultant</span>
                </div>
                <div className="editorial-publish-meta">
                    {displayDate && <time dateTime={dateModified}>Updated {displayDate}</time>}
                    {displayDate && <span aria-hidden="true">·</span>}
                    <span>{readingTime}</span>
                </div>
            </div>
        </div>
    );
}
