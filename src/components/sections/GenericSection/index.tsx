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

    return (
        <Section
            elementId={elementId}
            className={classNames('sb-component-generic-section', {
                'lg:min-h-[68vh] lg:flex lg:items-center': isHero
            })}
            colors={colors}
            backgroundImage={backgroundImage}
            styles={styles?.self}
            {...getDataAttrs(props)}
        >
            <div
                className={classNames(
                    'w-full',
                    'flex',
                    mapFlexDirectionStyles(flexDirection, hasTextContent, hasMedia, isHero),
                    /* handle horizontal positioning of content on small screens or when direction is col or col-reverse, mapping justifyContent to alignItems instead since it's a flex column */
                    mapStyles({ alignItems: styles?.self?.justifyContent ?? 'flex-start' }),
                    /* handle vertical positioning of content on large screens if it's a two col layout */
                    hasMedia && hasTextContent && hasXDirection ? mapAlignItemsStyles(alignItems, isHero) : undefined,
                    'gap-x-12',
                    'gap-y-16'
                )}
            >
                {hasTextContent && (
                    <div
                        className={classNames('w-full', 'max-w-sectionBody', {
                            'min-[900px]:max-w-[29rem]': isHero && hasMedia && hasXDirection,
                            'lg:max-w-[27.5rem]': !isHero && hasMedia && hasXDirection
                        })}
                    >
                        {badge && <Badge {...badge} {...(enableAnnotations && { 'data-sb-field-path': '.badge' })} />}
                        {title && (
                            <TitleBlock
                                {...title}
                                className={classNames({ 'mt-4': badge?.label })}
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
                                    {
                                        [isHero ? 'mt-12' : 'mt-8']: badge?.label || title?.text || subtitle || text
                                    }
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
                                className={classNames('text-sm', 'opacity-70', 'mt-4', styles?.bottomText ? mapStyles(styles?.bottomText) : undefined)}
                                {...(enableAnnotations && { 'data-sb-field-path': '.bottomText' })}
                            >
                                {bottomText}
                            </p>
                        )}
                    </div>
                )}
                {hasMedia && (
                    <div
                        className={classNames('w-full', 'flex', mapStyles({ justifyContent: styles?.self?.justifyContent ?? 'flex-start' }), {
                            'max-w-sectionBody': media.__metadata.modelName === 'FormBlock',
                            'min-[900px]:w-[48%] min-[900px]:shrink-0': isHero && hasTextContent && hasXDirection,
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
                    ? 'flex-col min-[900px]:flex-row min-[900px]:justify-between'
                    : 'flex-col lg:flex-row lg:justify-between'
                : 'flex-col';
        case 'row-reverse':
            return hasTextContent && hasMedia
                ? isHero
                    ? 'flex-col min-[900px]:flex-row-reverse min-[900px]:justify-between'
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

function mapAlignItemsStyles(alignItems: string, isHero: boolean) {
    switch (alignItems) {
        case 'flex-start':
            return isHero ? 'min-[900px]:items-start' : 'lg:items-start';
        case 'flex-end':
            return isHero ? 'min-[900px]:items-end' : 'lg:items-end';
        case 'center':
            return isHero ? 'min-[900px]:items-center' : 'lg:items-center';
        default:
            return null;
    }
}
