import * as React from 'react';
import Markdown from 'markdown-to-jsx';
import classNames from 'classnames';

import { getComponent } from '../../components-registry';
import { mapStylesToClassNames as mapStyles } from '../../../utils/map-styles-to-class-names';
import { getDataAttrs } from '../../../utils/get-data-attrs';
import Section from '../Section';
import TitleBlock from '../../blocks/TitleBlock';
import { Action, Badge } from '../../atoms';

export default function GenericSection(props) {
    const { elementId, colors, backgroundImage, badge, title, subtitle, text, actions = [], media, styles = {}, enableAnnotations, bottomText, isHero } = props;
    const flexDirection = styles?.self?.flexDirection ?? 'row';
    const alignItems = styles?.self?.alignItems ?? 'flex-start';
    const hasTextContent = !!(badge?.url || title?.text || subtitle || text || actions.length > 0);
    const hasMedia = !!(media && (media?.url || (media?.fields ?? []).length > 0));
    const hasXDirection = flexDirection === 'row' || flexDirection === 'row-reverse';
    const layoutRef = React.useRef<HTMLDivElement>(null);
    const [contactMotionReady, setContactMotionReady] = React.useState(false);
    const [contactMotionActive, setContactMotionActive] = React.useState(false);

    React.useEffect(() => {
        const layout = layoutRef.current;
        if (
            elementId !== 'contact' ||
            !layout ||
            typeof IntersectionObserver === 'undefined' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        setContactMotionReady(true);

        let isVisible = false;
        const observer = new IntersectionObserver(
            ([entry]) => {
                const hasEntered = entry.isIntersecting && entry.intersectionRatio >= 0.22;

                if (hasEntered && !isVisible) {
                    isVisible = true;
                    setContactMotionActive(true);
                } else if (!hasEntered && isVisible && entry.intersectionRatio < 0.06) {
                    isVisible = false;
                    setContactMotionActive(false);
                }
            },
            { threshold: [0, 0.06, 0.22] }
        );

        observer.observe(layout);
        return () => observer.disconnect();
    }, [elementId]);

    return (
        <Section
            elementId={elementId}
            className={classNames('sb-component-generic-section', {
                'hero-section': isHero,
                'lg:min-h-[68vh] lg:flex lg:items-center': isHero
            })}
            colors={colors}
            backgroundImage={backgroundImage}
            styles={styles?.self}
            {...getDataAttrs(props)}
        >
            <div
                ref={layoutRef}
                className={classNames(
                    'w-full',
                    'flex',
                    { 'hero-layout': isHero },
                    {
                        'contact-motion-ready': elementId === 'contact' && contactMotionReady,
                        'contact-motion-active': elementId === 'contact' && contactMotionActive
                    },
                    mapFlexDirectionStyles(flexDirection, hasTextContent, hasMedia, isHero),
                    /* handle horizontal positioning of content on small screens or when direction is col or col-reverse, mapping justifyContent to alignItems instead since it's a flex column */
                    mapStyles({ alignItems: styles?.self?.justifyContent ?? 'flex-start' }),
                    /* handle vertical positioning of content on large screens if it's a two col layout */
                    hasMedia && hasTextContent && hasXDirection ? mapAlignItemsStyles(alignItems) : undefined,
                    'gap-x-12',
                    'gap-y-16'
                )}
            >
                {hasTextContent && (
                    <div
                        className={classNames('w-full', 'max-w-sectionBody', { 'hero-copy': isHero }, {
                            'lg:w-[42%] lg:max-w-none xl:w-[40%]': isHero && hasMedia && hasXDirection,
                            'lg:max-w-[27.5rem]': !isHero && hasMedia && hasXDirection
                        })}
                    >
                        {badge && <Badge {...badge} {...(enableAnnotations && { 'data-sb-field-path': '.badge' })} />}
                        {title && (
                            <TitleBlock
                                {...title}
                                level={isHero ? 1 : 2}
                                className={classNames({ [isHero ? 'mt-8' : 'mt-4']: badge?.label })}
                                {...(enableAnnotations && { 'data-sb-field-path': '.title' })}
                            />
                        )}
                        {subtitle && (
                            <p
                                className={classNames('text-lg', 'sm:text-2xl', styles?.subtitle ? mapStyles(styles?.subtitle) : undefined, {
                                    'mt-4': badge?.label || title?.text
                                })}
                                {...(enableAnnotations && { 'data-sb-field-path': '.subtitle' })}
                            >
                                {subtitle}
                            </p>
                        )}
                        {isHero && hasMedia && hasXDirection && (
                            <div className="hero-media-mobile mt-8 flex w-full justify-center lg:hidden">
                                <Media media={media} hasAnnotations={enableAnnotations} />
                            </div>
                        )}
                        {text && (
                            <Markdown
                                options={{ forceBlock: true, forceWrapper: true }}
                                className={classNames('sb-markdown', 'sm:text-lg', styles?.text ? mapStyles(styles?.text) : undefined, {
                                    [isHero ? 'mt-10' : 'mt-6']: badge?.label || title?.text || subtitle
                                })}
                                {...(enableAnnotations && { 'data-sb-field-path': '.text' })}
                            >
                                {text}
                            </Markdown>
                        )}
                        {actions.length > 0 && (
                            <div
                                className={classNames(
                                    'flex',
                                    'flex-wrap',
                                    mapStyles({ justifyContent: styles?.self?.justifyContent ?? 'flex-start' }),
                                    'items-center',
                                    'gap-4',
                                    { 'hero-actions': isHero },
                                    { [isHero ? 'mt-12' : 'mt-8']: badge?.label || title?.text || subtitle || text }
                                )}
                                {...(enableAnnotations && { 'data-sb-field-path': '.actions' })}
                            >
                                {actions.map((action, index) => (
                                    <Action
                                        key={index}
                                        {...action}
                                        className="lg:whitespace-nowrap"
                                        {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })}
                                    />
                                ))}
                            </div>
                        )}
                        {bottomText && (
                            <p
                                className={classNames(
                                    'text-sm',
                                    'opacity-70',
                                    { 'hero-bottom-text': isHero },
                                    isHero ? 'mt-6' : 'mt-4',
                                    styles?.bottomText ? mapStyles(styles?.bottomText) : undefined
                                )}
                                {...(enableAnnotations && { 'data-sb-field-path': '.bottomText' })}
                            >
                                {bottomText}
                            </p>
                        )}
                    </div>
                )}
                {hasMedia && (
                    <div
                        className={classNames('w-full', { 'hero-media-desktop': isHero }, mapStyles({ justifyContent: styles?.self?.justifyContent ?? 'flex-start' }), {
                            'hidden lg:flex': isHero && hasTextContent && hasXDirection,
                            flex: !(isHero && hasTextContent && hasXDirection),
                            'max-w-sectionBody': media.__metadata.modelName === 'FormBlock',
                            'max-w-[640px] mx-auto lg:mx-0 lg:w-[52%] lg:max-w-none lg:shrink-0 xl:w-[56%]': isHero && hasTextContent && hasXDirection,
                            'lg:w-[57.5%] lg:shrink-0': !isHero && hasTextContent && hasXDirection,
                            'lg:mt-10': badge?.label && media.__metadata.modelName === 'FormBlock' && hasXDirection
                        })}
                    >
                        <Media media={media} hasAnnotations={enableAnnotations} />
                    </div>
                )}
            </div>
        </Section>
    );
}

function Media({ media, hasAnnotations }: { media: any; hasAnnotations: boolean }) {
    const modelName = media.__metadata.modelName;
    if (!modelName) {
        throw new Error(`generic section media does not have the 'modelName' property`);
    }
    const MediaComponent = getComponent(modelName);
    if (!MediaComponent) {
        throw new Error(`no component matching the hero section media model name: ${modelName}`);
    }
    return <MediaComponent {...media} {...(hasAnnotations && { 'data-sb-field-path': '.media' })} />;
}

function mapFlexDirectionStyles(flexDirection: string, hasTextContent: boolean, hasMedia: boolean, isHero: boolean) {
    switch (flexDirection) {
        case 'row':
            return hasTextContent && hasMedia
                ? isHero
                    ? 'flex-col lg:flex-row lg:justify-between'
                    : 'flex-col lg:flex-row lg:justify-between'
                : 'flex-col';
        case 'row-reverse':
            return hasTextContent && hasMedia
                ? isHero
                    ? 'flex-col lg:flex-row-reverse lg:justify-between'
                    : 'flex-col lg:flex-row-reverse lg:justify-between'
                : 'flex-col';
        case 'col':
            return 'flex-col';
        case 'col-reverse':
            return 'flex-col-reverse';
        default:
            return null;
    }
}

function mapAlignItemsStyles(alignItems: string) {
    switch (alignItems) {
        case 'flex-start':
            return 'lg:items-start';
        case 'flex-end':
            return 'lg:items-end';
        case 'center':
            return 'lg:items-center';
        default:
            return null;
    }
}
