import * as React from 'react';
import classNames from 'classnames';
import Image from 'next/image';

import Section from '../Section';
import TitleBlock from '../../blocks/TitleBlock';
import { Badge, Link } from '../../atoms';
import LinkedInIcon from '../../svgs/linkedin';
import BrokerCheckIcon from '../../svgs/brokercheck';

export default function ApproachSection(props) {
    const {
        elementId,
        colors,
        badge,
        title,
        intro,
        experienceItems = [],
        principles = [],
        profileImage,
        profileName,
        profileLinkedIn,
        profileBrokerCheck,
        profileRole,
        qualifications = [],
        styles = {},
        enableAnnotations
    } = props;
    const layoutRef = React.useRef<HTMLDivElement>(null);
    const [motionReady, setMotionReady] = React.useState(false);
    const [motionActive, setMotionActive] = React.useState(false);

    React.useEffect(() => {
        const layout = layoutRef.current;
        if (!layout || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        setMotionReady(true);

        let isVisible = false;
        const observer = new IntersectionObserver(
            ([entry]) => {
                const hasEntered = entry.isIntersecting && entry.intersectionRatio >= 0.28;

                if (hasEntered && !isVisible) {
                    isVisible = true;
                    setMotionActive(true);
                } else if (!hasEntered && isVisible && entry.intersectionRatio < 0.08) {
                    isVisible = false;
                    setMotionActive(false);
                }
            },
            { threshold: [0, 0.08, 0.28] }
        );

        observer.observe(layout);
        return () => observer.disconnect();
    }, []);

    return (
        <Section elementId={elementId} className="sb-component-approach-section" colors={colors} styles={styles?.self}>
            <div
                ref={layoutRef}
                className={classNames('approach-layout', {
                    'approach-motion-ready': motionReady,
                    'approach-motion-active': motionActive
                })}
            >
                <div className="approach-content">
                    {badge && <Badge {...badge} className="approach-badge" {...(enableAnnotations && { 'data-sb-field-path': '.badge' })} />}
                    {title && (
                        <TitleBlock
                            {...title}
                            className="approach-title"
                            {...(enableAnnotations && { 'data-sb-field-path': '.title' })}
                        />
                    )}
                    {intro && (
                        <p className="approach-intro" {...(enableAnnotations && { 'data-sb-field-path': '.intro' })}>
                            {intro}
                        </p>
                    )}

                    {experienceItems.length > 0 && (
                        <div className="approach-experience">
                            <p className="approach-experience-label">Relevant experience</p>
                            <ul
                                className="approach-experience-list"
                                {...(enableAnnotations && { 'data-sb-field-path': '.experienceItems' })}
                            >
                                {experienceItems.map((item, index) => (
                                    <li key={index} {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className="approach-kicker">How I work</p>
                    <ol className="approach-principles" {...(enableAnnotations && { 'data-sb-field-path': '.principles' })}>
                        {principles.map((principle, index) => (
                            <li className="approach-principle" key={index} {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })}>
                                <span className="approach-principle-icon" aria-hidden="true">
                                    <PrincipleIcon icon={principle.icon} />
                                </span>
                                <div>
                                    <h3>{principle.title}</h3>
                                    <p>{principle.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                <aside className="approach-profile" aria-label={`${profileName} and FINRA qualifications`}>
                    {profileImage?.url && (
                        <div className="approach-photo-wrap">
                            <Image
                                src={profileImage.url}
                                alt={profileImage.altText || profileName}
                                className="approach-photo"
                                width={800}
                                height={1200}
                                sizes="(max-width: 767px) 100vw, 400px"
                                quality={85}
                            />
                        </div>
                    )}
                    <div className="approach-profile-body">
                        <div className="approach-profile-heading">
                            <div>
                                <p className="approach-profile-name">{profileName}</p>
                                {profileRole && <p className="approach-profile-role">{profileRole}</p>}
                            </div>
                            <div className="approach-profile-links">
                                {profileLinkedIn && (
                                    <Link
                                        href={profileLinkedIn}
                                        className="approach-profile-linkedin"
                                        aria-label={`${profileName} on LinkedIn`}
                                    >
                                        <LinkedInIcon className="approach-profile-linkedin-icon" />
                                    </Link>
                                )}
                                {profileBrokerCheck && (
                                    <Link
                                        href={profileBrokerCheck}
                                        className="approach-profile-linkedin approach-profile-brokercheck"
                                        aria-label={`Verify ${profileName} on FINRA BrokerCheck`}
                                        title="FINRA BrokerCheck"
                                    >
                                        <BrokerCheckIcon className="approach-profile-linkedin-icon" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        <p className="approach-qualifications-label">FINRA Qualifications</p>
                        <ul className="approach-qualifications" {...(enableAnnotations && { 'data-sb-field-path': '.qualifications' })}>
                            {qualifications.map((qualification, index) => (
                                <li className="approach-qualification" key={index} {...(enableAnnotations && { 'data-sb-field-path': `.${index}` })}>
                                    <span className="approach-series">{qualification.series}</span>
                                    <span>
                                        <span className="approach-qualification-name">{qualification.title}</span>
                                        <span className="approach-qualification-detail">{qualification.subtitle}</span>
                                    </span>
                                    <span className="approach-qualification-check" aria-hidden="true">
                                        <CheckIcon />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </Section>
    );
}

function PrincipleIcon({ icon }) {
    if (icon === 'oversight') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h3l2-6 4 12 2-6h7" />
            </svg>
        );
    }
    if (icon === 'continuity') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7.5h5l2 2h9v9H4z" />
                <path d="M7 5h4l2 2" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8" />
            <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
    );
}
