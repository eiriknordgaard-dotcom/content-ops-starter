import * as React from 'react';
import classNames from 'classnames';

import { mapStylesToClassNames as mapStyles } from '../../../utils/map-styles-to-class-names';

const imageDimensions: Record<string, { width: number; height: number }> = {
    '/images/hero-finop-system.svg': { width: 760, height: 480 },
    '/images/client-formation.svg': { width: 520, height: 160 },
    '/images/client-ongoing.svg': { width: 520, height: 160 },
    '/images/icon-shield-check.svg': { width: 84, height: 84 },
    '/images/icon-document-check.svg': { width: 84, height: 84 },
    '/images/icon-chart-activity.svg': { width: 84, height: 84 },
    '/images/icon-clipboard-check.svg': { width: 84, height: 84 },
    '/images/icon-folder-search.svg': { width: 84, height: 84 },
    '/images/icon-grid-build.svg': { width: 84, height: 84 }
};

export default function ImageBlock(props) {
    const { elementId, className, imageClassName, url, altText = '', styles = {} } = props;
    const imageWrapRef = React.useRef<HTMLDivElement>(null);
    const [replayCount, setReplayCount] = React.useState(0);
    const [animationInstance, setAnimationInstance] = React.useState('');
    const [clientAnimationStarted, setClientAnimationStarted] = React.useState(false);
    const [clientImageLoaded, setClientImageLoaded] = React.useState(false);
    const isHeroSystemImage = url === '/images/hero-finop-system.svg';
    const isClientIllustration = url === '/images/client-formation.svg' || url === '/images/client-ongoing.svg';
    const isReplayableIllustration = isHeroSystemImage || isClientIllustration;
    const dimensions = imageDimensions[url];
    const replayQuery = isReplayableIllustration && animationInstance ? `?replay=${animationInstance}-${replayCount}` : '';
    const imageUrl = `${url}${replayQuery}`;
    const imageStyle = (() => {
        if (isHeroSystemImage) {
            return { '--hero-system-dark-image': `url("/images/hero-finop-system-dark.svg${replayQuery}")` } as React.CSSProperties;
        }

        if (url === '/images/client-formation.svg') {
            return { '--client-illustration-dark-image': `url("/images/client-formation-dark.svg${replayQuery}")` } as React.CSSProperties;
        }

        if (url === '/images/client-ongoing.svg') {
            return { '--client-illustration-dark-image': `url("/images/client-ongoing-dark.svg${replayQuery}")` } as React.CSSProperties;
        }

        return undefined;
    })();

    React.useEffect(() => {
        if (!isReplayableIllustration) {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            if (isClientIllustration) {
                setClientAnimationStarted(true);
                setClientImageLoaded(true);
            }
            return;
        }

        setAnimationInstance(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
    }, [isReplayableIllustration, isClientIllustration]);

    React.useEffect(() => {
        const imageWrap = imageWrapRef.current;
        if (!isReplayableIllustration || !imageWrap || typeof IntersectionObserver === 'undefined') {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        if (isClientIllustration) {
            const cardTrigger = imageWrap.closest('.sb-card')?.querySelector<HTMLElement>('[data-client-animation-trigger]');
            if (!cardTrigger) {
                return;
            }

            const mobileClientQuery = window.matchMedia('(max-width: 767px)');
            let clientObserver: IntersectionObserver | undefined;

            const observeClientAnimation = () => {
                clientObserver?.disconnect();
                let wasVisible = false;
                const useIllustrationTrigger = mobileClientQuery.matches;
                const clientTrigger = useIllustrationTrigger ? imageWrap : cardTrigger;

                clientObserver = new IntersectionObserver(
                    ([entry]) => {
                        if (entry.isIntersecting && !wasVisible) {
                            wasVisible = true;
                            setClientAnimationStarted(true);
                            setClientImageLoaded(false);
                            setReplayCount((count) => count + 1);
                        } else if (!entry.isIntersecting) {
                            wasVisible = false;
                            setClientAnimationStarted(false);
                        }
                    },
                    useIllustrationTrigger
                        ? { rootMargin: '0px 0px -10% 0px', threshold: 0.25 }
                        : { rootMargin: '0px 0px -16px 0px', threshold: 0.1 }
                );

                clientObserver.observe(clientTrigger);
            };

            observeClientAnimation();
            mobileClientQuery.addEventListener('change', observeClientAnimation);

            return () => {
                clientObserver?.disconnect();
                mobileClientQuery.removeEventListener('change', observeClientAnimation);
            };
        }

        let initialized = false;
        let wasVisible = false;
        let hasLeftView = false;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;

                if (!initialized) {
                    initialized = true;
                    wasVisible = isVisible;
                    hasLeftView = !isVisible;
                    return;
                }

                if (isVisible && !wasVisible) {
                    if (hasLeftView) {
                        setReplayCount((count) => count + 1);
                    }
                    wasVisible = true;
                    hasLeftView = false;
                } else if (!isVisible && wasVisible && entry.intersectionRatio < 0.1) {
                    wasVisible = false;
                    hasLeftView = true;
                }
            },
            { threshold: [0, 0.1, 0.35] }
        );

        observer.observe(imageWrap);
        return () => observer.disconnect();
    }, [isReplayableIllustration, isClientIllustration]);

    if (!url) {
        return null;
    }
    const fieldPath = props['data-sb-field-path'];
    const annotations = fieldPath
        ? { 'data-sb-field-path': [fieldPath, `${fieldPath}.url#@src`, `${fieldPath}.altText#@alt`, `${fieldPath}.elementId#@id`].join(' ').trim() }
        : {};

    return (
        <div
            ref={imageWrapRef}
            className={classNames(
                'sb-component',
                'sb-component-block',
                'sb-component-image-block',
                {
                    'client-illustration-wrap': isClientIllustration,
                    'client-illustration-pending': isClientIllustration && (!clientAnimationStarted || !clientImageLoaded)
                },
                className,
                styles?.self?.margin ? mapStyles({ margin: styles?.self?.margin }) : undefined
            )}
            {...annotations}
        >
            <img
                key={isReplayableIllustration ? `${animationInstance}-${replayCount}` : undefined}
                id={elementId}
                data-hero-system-image={isHeroSystemImage ? 'true' : undefined}
                data-client-illustration={isClientIllustration ? 'true' : undefined}
                data-animation-replay-count={isReplayableIllustration ? replayCount : undefined}
                data-animation-instance={isReplayableIllustration ? animationInstance : undefined}
                style={imageStyle}
                className={classNames(
                    imageClassName,
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
                src={imageUrl}
                alt={altText}
                width={dimensions?.width}
                height={dimensions?.height}
                loading={isHeroSystemImage ? 'eager' : 'lazy'}
                fetchPriority={isHeroSystemImage ? 'high' : 'auto'}
                decoding="async"
                onLoad={isClientIllustration ? () => setClientImageLoaded(true) : undefined}
            />
        </div>
    );
}
